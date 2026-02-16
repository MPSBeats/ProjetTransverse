// src/services/emailService.ts — Envoi d'emails via Nodemailer (SMTP o2switch)

import nodemailer from 'nodemailer';
import { formatPrice } from '../utils/helpers';

/* ─── Transporteur SMTP ─── */
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
    },
});

interface OrderEmailData {
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    items: Array<{ name: string; quantity: number; unitPrice: number; totalPrice: number }>;
    subtotal: number;
    shippingCost: number;
    discount: number;
    total: number;
    deliveryMethod: string;
    shippingAddress?: string;
}

/**
 * Envoie l'email de confirmation de commande au client
 */
export async function sendOrderConfirmation(data: OrderEmailData): Promise<void> {
    const itemsHtml = data.items.map((item) => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #ede5d8;">${item.name}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #ede5d8; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #ede5d8; text-align: right;">${formatPrice(item.totalPrice)}</td>
    </tr>
  `).join('');

    const deliveryLabel = data.deliveryMethod === 'pickup'
        ? 'Retrait en boutique — 64, rue d\'Alésia, 75014 Paris'
        : `Livraison à domicile — ${data.shippingAddress || ''}`;

    const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head><meta charset="UTF-8"></head>
    <body style="font-family: 'DM Sans', Arial, sans-serif; background-color: #FDF6EC; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: #FFFDF8; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(59,35,20,0.08);">
        <!-- Header -->
        <div style="background: #3B2314; padding: 32px; text-align: center;">
          <h1 style="color: #FDF6EC; font-family: 'Playfair Display', Georgia, serif; font-size: 24px; margin: 0;">
            🍵 L'InviThé Gourmand
          </h1>
          <p style="color: #D4A853; margin: 8px 0 0; font-style: italic;">Merci pour votre commande !</p>
        </div>

        <!-- Corps -->
        <div style="padding: 32px;">
          <p style="color: #3B2314; font-size: 16px;">
            Bonjour <strong>${data.customerName}</strong>,
          </p>
          <p style="color: #3B2314; font-size: 14px; line-height: 1.6;">
            Votre commande <strong style="color: #C4704B;">${data.orderNumber}</strong> a bien été enregistrée.
            Nous la préparons avec soin et amour.
          </p>

          <!-- Récapitulatif -->
          <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
            <thead>
              <tr style="background: #FDF6EC;">
                <th style="padding: 10px 12px; text-align: left; color: #3B2314; font-size: 13px;">Produit</th>
                <th style="padding: 10px 12px; text-align: center; color: #3B2314; font-size: 13px;">Qté</th>
                <th style="padding: 10px 12px; text-align: right; color: #3B2314; font-size: 13px;">Total</th>
              </tr>
            </thead>
            <tbody style="font-size: 14px; color: #3B2314;">
              ${itemsHtml}
            </tbody>
          </table>

          <!-- Totaux -->
          <div style="border-top: 2px solid #C4704B; padding-top: 16px; margin-top: 8px;">
            <p style="display: flex; justify-content: space-between; margin: 4px 0; font-size: 14px; color: #3B2314;">
              <span>Sous-total</span> <span>${formatPrice(data.subtotal)}</span>
            </p>
            <p style="display: flex; justify-content: space-between; margin: 4px 0; font-size: 14px; color: #3B2314;">
              <span>Livraison</span> <span>${data.shippingCost === 0 ? 'Offerte' : formatPrice(data.shippingCost)}</span>
            </p>
            ${data.discount > 0 ? `
            <p style="display: flex; justify-content: space-between; margin: 4px 0; font-size: 14px; color: #7A8B6F;">
              <span>Réduction</span> <span>-${formatPrice(data.discount)}</span>
            </p>` : ''}
            <p style="display: flex; justify-content: space-between; margin: 12px 0 0; font-size: 18px; font-weight: bold; color: #C4704B;">
              <span>Total</span> <span>${formatPrice(data.total)}</span>
            </p>
          </div>

          <!-- Livraison -->
          <div style="background: #FDF6EC; border-radius: 12px; padding: 16px; margin-top: 24px;">
            <p style="margin: 0; font-size: 13px; color: #3B2314;">
              <strong>📦 Mode de livraison :</strong><br>
              ${deliveryLabel}
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #3B2314; padding: 24px; text-align: center;">
          <p style="color: #D4A853; font-size: 12px; margin: 0;">
            L'InviThé Gourmand — 64, rue d'Alésia, 75014 Paris<br>
            Tél : 01 23 45 67 89 | contact@invithegourmand.fr
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || 'L\'InviThé Gourmand <contact@invithegourmand.fr>',
            to: data.customerEmail,
            subject: `Confirmation de commande ${data.orderNumber} — L'InviThé Gourmand`,
            html,
        });
        console.log(`📧 Email de confirmation envoyé à ${data.customerEmail}`);
    } catch (error) {
        console.error('❌ Erreur envoi email :', error);
        // Ne pas bloquer la commande si l'email échoue
    }
}

/**
 * Envoie un email de notification au gérant
 */
export async function sendAdminNotification(orderNumber: string, total: number): Promise<void> {
    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || 'L\'InviThé Gourmand <contact@invithegourmand.fr>',
            to: process.env.ADMIN_EMAIL || 'admin@invithegourmand.fr',
            subject: `🛒 Nouvelle commande ${orderNumber} — ${formatPrice(total)}`,
            html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #C4704B;">Nouvelle commande reçue !</h2>
          <p><strong>Commande :</strong> ${orderNumber}</p>
          <p><strong>Montant :</strong> ${formatPrice(total)}</p>
          <p><a href="${process.env.APP_URL}/admin/commandes" style="color: #C4704B;">Voir dans le tableau de bord →</a></p>
        </div>
      `,
        });
    } catch (error) {
        console.error('❌ Erreur notification admin :', error);
    }
}
