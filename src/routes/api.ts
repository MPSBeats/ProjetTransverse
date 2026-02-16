// src/routes/api.ts — Routes API JSON (panier AJAX, webhooks Stripe, admin API)

import { Router, Request, Response } from 'express';
import { apiGetCart, apiAddToCart, apiUpdateCart, apiRemoveFromCart, apiApplyPromo } from '../controllers/cartController';
import { apiUpdateOrderStatus, apiUpdateStock } from '../controllers/adminController';
import { requireAdmin } from '../middlewares/auth';
import { constructWebhookEvent } from '../services/stripeService';
import prisma from '../models/prisma';

const router = Router();

/* ─── Webhook Stripe (pas de body parser JSON — utilise raw) ─── */
router.post('/webhooks/stripe', async (req: Request, res: Response) => {
    try {
        const signature = req.headers['stripe-signature'] as string;
        if (!signature) {
            res.status(400).json({ error: 'Signature manquante' });
            return;
        }

        const event = constructWebhookEvent(req.body as Buffer, signature);

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as any;
                const orderId = session.metadata?.orderId;

                if (orderId) {
                    // Mettre à jour le statut de la commande
                    await prisma.order.update({
                        where: { id: orderId },
                        data: {
                            status: 'paid',
                            stripeSessionId: session.id,
                        },
                    });
                    console.log(`✅ Commande ${session.metadata?.orderNumber} payée via webhook`);
                }
                break;
            }

            case 'checkout.session.expired': {
                const session = event.data.object as any;
                const orderId = session.metadata?.orderId;
                if (orderId) {
                    await prisma.order.update({
                        where: { id: orderId },
                        data: { status: 'cancelled' },
                    });
                    console.log(`⏰ Session Stripe expirée pour commande ${session.metadata?.orderNumber}`);
                }
                break;
            }

            default:
                console.log(`ℹ️ Événement Stripe ignoré : ${event.type}`);
        }

        res.status(200).json({ received: true });
    } catch (error: any) {
        console.error('❌ Erreur webhook Stripe :', error.message);
        res.status(400).json({ error: 'Webhook invalide' });
    }
});

/* ─── API Panier (AJAX) ─── */
router.get('/cart', apiGetCart);
router.post('/cart/add', apiAddToCart);
router.put('/cart/update', apiUpdateCart);
router.delete('/cart/remove', apiRemoveFromCart);
router.post('/cart/promo', apiApplyPromo);

/* ─── API Admin (protégée) ─── */
router.put('/admin/orders/:id/status', requireAdmin, apiUpdateOrderStatus);
router.put('/admin/products/:id/stock', requireAdmin, apiUpdateStock);

export default router;
