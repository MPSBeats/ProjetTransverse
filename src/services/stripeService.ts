// src/services/stripeService.ts — Service Stripe Checkout

import Stripe from 'stripe';
import { CartItem } from '../../types';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-11-20.acacia' as any,
});

interface CreateCheckoutParams {
    items: CartItem[];
    customerEmail: string;
    customerName: string;
    deliveryMethod: 'pickup' | 'delivery';
    shippingCost: number;
    discount: number;
    orderId: string;
    orderNumber: string;
}

/**
 * Crée une session Stripe Checkout avec redirection
 * Les prix sont toujours calculés côté serveur (jamais côté client)
 */
export async function createCheckoutSession(params: CreateCheckoutParams): Promise<string> {
    const { items, customerEmail, deliveryMethod, shippingCost, discount, orderId, orderNumber } = params;

    // Calcul des line items côté serveur
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => {
        const unitPrice = item.promoPrice ?? item.price;
        return {
            price_data: {
                currency: 'eur',
                product_data: {
                    name: item.name,
                    images: item.image ? [`${process.env.APP_URL}${item.image}`] : [],
                },
                unit_amount: Math.round(unitPrice * 100), // Stripe utilise les centimes
            },
            quantity: item.quantity,
        };
    });

    // Ajouter les frais de livraison si applicable
    if (shippingCost > 0) {
        lineItems.push({
            price_data: {
                currency: 'eur',
                product_data: {
                    name: 'Frais de livraison',
                },
                unit_amount: Math.round(shippingCost * 100),
            },
            quantity: 1,
        });
    }

    // Créer la session Checkout
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: customerEmail,
        line_items: lineItems,
        discounts: discount > 0 ? undefined : undefined, // Les promos sont déjà dans les prix
        metadata: {
            orderId,
            orderNumber,
            deliveryMethod,
        },
        success_url: `${process.env.APP_URL}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL}/panier?cancelled=true`,
        locale: 'fr',
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // Expire dans 30 minutes
    });

    return session.url || '';
}

/**
 * Vérifie et construit l'événement webhook Stripe
 */
export function constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Récupère les détails d'une session Checkout
 */
export async function getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    return stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items'],
    });
}
