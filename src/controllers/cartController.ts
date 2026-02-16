// src/controllers/cartController.ts — Logique panier, checkout, confirmation

import { Request, Response } from 'express';
import prisma from '../models/prisma';
import { Cart, CartItem } from '../../types';
import { formatPrice, generateOrderNumber, calculateShipping, getProductImage } from '../utils/helpers';
import { createCheckoutSession, getCheckoutSession } from '../services/stripeService';
import { sendOrderConfirmation, sendAdminNotification } from '../services/emailService';

/**
 * Initialise le panier en session si absent
 */
function getCart(req: Request): Cart {
    if (!req.session.cart) {
        req.session.cart = {
            items: [],
            subtotal: 0,
            shippingCost: 0,
            discount: 0,
            promoCode: null,
            total: 0,
        };
    }
    return req.session.cart;
}

/**
 * Recalcule les totaux du panier
 */
function recalculateCart(cart: Cart): void {
    cart.subtotal = cart.items.reduce((sum, item) => {
        const price = item.promoPrice ?? item.price;
        return sum + price * item.quantity;
    }, 0);
    cart.subtotal = Math.round(cart.subtotal * 100) / 100;
    cart.total = Math.round((cart.subtotal + cart.shippingCost - cart.discount) * 100) / 100;
    if (cart.total < 0) cart.total = 0;
}

/**
 * Page panier (/panier)
 */
export async function cartPage(req: Request, res: Response): Promise<void> {
    const cart = getCart(req);
    res.render('pages/cart', {
        metaTitle: "Votre Panier — L'InviThé Gourmand",
        metaDescription: 'Consultez et modifiez votre panier avant de passer commande.',
        canonicalUrl: `${process.env.APP_URL}/panier`,
        cart,
        formatPrice,
        cancelled: req.query.cancelled === 'true',
    });
}

/**
 * Page checkout (/checkout)
 */
export async function checkoutPage(req: Request, res: Response): Promise<void> {
    const cart = getCart(req);
    if (cart.items.length === 0) {
        res.redirect('/panier');
        return;
    }

    res.render('pages/checkout', {
        metaTitle: "Passer Commande — L'InviThé Gourmand",
        metaDescription: 'Finalisez votre commande de thés, macarons et pâtisseries.',
        canonicalUrl: `${process.env.APP_URL}/checkout`,
        cart,
        formatPrice,
    });
}

/**
 * Traitement du checkout — création commande + redirection Stripe
 */
export async function processCheckout(req: Request, res: Response): Promise<void> {
    try {
        const cart = getCart(req);
        if (cart.items.length === 0) {
            res.redirect('/panier');
            return;
        }

        const { customerName, customerEmail, customerPhone, deliveryMethod, notes } = req.body;
        const shippingAddress = deliveryMethod === 'delivery'
            ? JSON.stringify({
                address: req.body.shippingAddress || '',
                city: req.body.shippingCity || '',
                postalCode: req.body.shippingPostalCode || '',
            })
            : null;

        // Recalculer les prix côté serveur (sécurité)
        const serverItems: CartItem[] = [];
        for (const cartItem of cart.items) {
            const product = await prisma.product.findUnique({ where: { id: cartItem.productId } });
            if (!product || !product.isActive || product.stock < cartItem.quantity) {
                res.redirect('/panier?error=stock');
                return;
            }
            serverItems.push({
                ...cartItem,
                price: Number(product.price),
                promoPrice: product.promoPrice ? Number(product.promoPrice) : null,
            });
        }

        // Recalculer le shipping côté serveur
        const subtotal = serverItems.reduce((sum, item) => {
            const price = item.promoPrice ?? item.price;
            return sum + price * item.quantity;
        }, 0);
        const shippingCost = calculateShipping(subtotal, deliveryMethod);
        const total = Math.round((subtotal + shippingCost - cart.discount) * 100) / 100;

        const orderNumber = generateOrderNumber();

        // Créer la commande en BDD (statut pending)
        const order = await prisma.order.create({
            data: {
                orderNumber,
                customerEmail,
                customerName,
                customerPhone,
                shippingAddress,
                deliveryMethod,
                status: 'pending',
                subtotal,
                shippingCost,
                discount: cart.discount,
                total,
                promoCode: cart.promoCode,
                notes,
                items: {
                    create: serverItems.map((item) => ({
                        productId: item.productId,
                        productName: item.name,
                        quantity: item.quantity,
                        unitPrice: item.promoPrice ?? item.price,
                        totalPrice: (item.promoPrice ?? item.price) * item.quantity,
                    })),
                },
            },
        });

        // Créer la session Stripe Checkout
        const checkoutUrl = await createCheckoutSession({
            items: serverItems,
            customerEmail,
            customerName,
            deliveryMethod,
            shippingCost,
            discount: cart.discount,
            orderId: order.id,
            orderNumber,
        });

        if (checkoutUrl) {
            res.redirect(checkoutUrl);
        } else {
            res.redirect('/panier?error=stripe');
        }
    } catch (error) {
        console.error('❌ Erreur checkout :', error);
        res.redirect('/panier?error=server');
    }
}

/**
 * Page confirmation (/confirmation)
 */
export async function confirmationPage(req: Request, res: Response): Promise<void> {
    try {
        const sessionId = req.query.session_id as string;
        if (!sessionId) {
            res.redirect('/');
            return;
        }

        // Récupérer la session Stripe
        const stripeSession = await getCheckoutSession(sessionId);
        const orderId = stripeSession.metadata?.orderId;

        if (!orderId) {
            res.redirect('/');
            return;
        }

        // Mettre à jour le statut de la commande
        const order = await prisma.order.update({
            where: { id: orderId },
            data: {
                status: 'paid',
                stripeSessionId: sessionId,
            },
            include: { items: true },
        });

        // Décrémenter les stocks
        for (const item of order.items) {
            await prisma.product.update({
                where: { id: item.productId },
                data: { stock: { decrement: item.quantity } },
            });
            await prisma.stockMovement.create({
                data: {
                    productId: item.productId,
                    quantityChange: -item.quantity,
                    reason: 'sale',
                    orderId: order.id,
                },
            });
        }

        // Envoyer l'email de confirmation
        await sendOrderConfirmation({
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            items: order.items.map((i: any) => ({
                name: i.productName,
                quantity: i.quantity,
                unitPrice: Number(i.unitPrice),
                totalPrice: Number(i.totalPrice),
            })),
            subtotal: Number(order.subtotal),
            shippingCost: Number(order.shippingCost),
            discount: Number(order.discount),
            total: Number(order.total),
            deliveryMethod: order.deliveryMethod,
            shippingAddress: order.shippingAddress || undefined,
        });

        // Notification admin
        await sendAdminNotification(order.orderNumber, Number(order.total));

        // Vider le panier
        req.session.cart = {
            items: [],
            subtotal: 0,
            shippingCost: 0,
            discount: 0,
            promoCode: null,
            total: 0,
        };

        res.render('pages/confirmation', {
            metaTitle: "Commande confirmée — L'InviThé Gourmand",
            metaDescription: '',
            canonicalUrl: '',
            order,
            formatPrice,
        });
    } catch (error) {
        console.error('❌ Erreur confirmation :', error);
        res.render('pages/confirmation', {
            metaTitle: "Confirmation — L'InviThé Gourmand",
            metaDescription: '',
            canonicalUrl: '',
            order: null,
            formatPrice,
        });
    }
}

/* ─── API Panier (JSON / AJAX) ─── */

/**
 * GET /api/cart — Récupérer le panier courant
 */
export function apiGetCart(req: Request, res: Response): void {
    const cart = getCart(req);
    res.json({ success: true, data: cart });
}

/**
 * POST /api/cart/add — Ajouter un produit au panier
 */
export async function apiAddToCart(req: Request, res: Response): Promise<void> {
    try {
        const { productId, quantity = 1 } = req.body;
        const product = await prisma.product.findUnique({ where: { id: productId } });

        if (!product || !product.isActive) {
            res.status(404).json({ success: false, error: 'Produit introuvable' });
            return;
        }

        const cart = getCart(req);
        const existingIndex = cart.items.findIndex((i) => i.productId === productId);

        if (existingIndex >= 0) {
            const newQty = cart.items[existingIndex].quantity + quantity;
            if (newQty > product.stock) {
                res.status(400).json({ success: false, error: `Stock insuffisant (${product.stock} disponibles)` });
                return;
            }
            cart.items[existingIndex].quantity = newQty;
        } else {
            if (quantity > product.stock) {
                res.status(400).json({ success: false, error: `Stock insuffisant (${product.stock} disponibles)` });
                return;
            }
            cart.items.push({
                productId: product.id,
                name: product.name,
                slug: product.slug,
                price: Number(product.price),
                promoPrice: product.promoPrice ? Number(product.promoPrice) : null,
                image: getProductImage(product.images, 'thumbnail'),
                quantity,
                stock: product.stock,
            });
        }

        recalculateCart(cart);
        req.session.cart = cart;

        res.json({
            success: true,
            data: cart,
            message: `${product.name} ajouté au panier`,
        });
    } catch (error) {
        console.error('❌ Erreur ajout panier :', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
}

/**
 * PUT /api/cart/update — Modifier la quantité d'un article
 */
export async function apiUpdateCart(req: Request, res: Response): Promise<void> {
    try {
        const { productId, quantity } = req.body;
        const cart = getCart(req);
        const itemIndex = cart.items.findIndex((i) => i.productId === productId);

        if (itemIndex < 0) {
            res.status(404).json({ success: false, error: 'Article non trouvé dans le panier' });
            return;
        }

        if (quantity <= 0) {
            cart.items.splice(itemIndex, 1);
        } else {
            const product = await prisma.product.findUnique({ where: { id: productId } });
            if (product && quantity > product.stock) {
                res.status(400).json({ success: false, error: `Stock insuffisant (${product.stock} disponibles)` });
                return;
            }
            cart.items[itemIndex].quantity = quantity;
        }

        recalculateCart(cart);
        req.session.cart = cart;

        res.json({ success: true, data: cart });
    } catch (error) {
        console.error('❌ Erreur mise à jour panier :', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
}

/**
 * DELETE /api/cart/remove — Supprimer un article du panier
 */
export function apiRemoveFromCart(req: Request, res: Response): void {
    const { productId } = req.body;
    const cart = getCart(req);
    cart.items = cart.items.filter((i) => i.productId !== productId);
    recalculateCart(cart);
    req.session.cart = cart;
    res.json({ success: true, data: cart });
}

/**
 * POST /api/cart/promo — Appliquer un code promo
 */
export async function apiApplyPromo(req: Request, res: Response): Promise<void> {
    try {
        const { code } = req.body;
        const cart = getCart(req);

        const promo = await prisma.promoCode.findUnique({ where: { code: code.toUpperCase() } });

        if (!promo || !promo.isActive) {
            res.status(400).json({ success: false, error: 'Code promo invalide' });
            return;
        }

        if (promo.expiresAt && promo.expiresAt < new Date()) {
            res.status(400).json({ success: false, error: 'Code promo expiré' });
            return;
        }

        if (promo.maxUses && promo.currentUses >= promo.maxUses) {
            res.status(400).json({ success: false, error: 'Code promo épuisé' });
            return;
        }

        if (promo.minOrderAmount && cart.subtotal < Number(promo.minOrderAmount)) {
            res.status(400).json({
                success: false,
                error: `Montant minimum : ${formatPrice(Number(promo.minOrderAmount))}`,
            });
            return;
        }

        // Calculer la réduction
        let discount = 0;
        if (promo.discountType === 'percentage') {
            discount = Math.round(cart.subtotal * Number(promo.discountValue) / 100 * 100) / 100;
        } else {
            discount = Number(promo.discountValue);
        }

        cart.promoCode = promo.code;
        cart.discount = discount;
        recalculateCart(cart);
        req.session.cart = cart;

        res.json({
            success: true,
            data: cart,
            message: `Code "${promo.code}" appliqué : -${formatPrice(discount)}`,
        });
    } catch (error) {
        console.error('❌ Erreur code promo :', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
}
