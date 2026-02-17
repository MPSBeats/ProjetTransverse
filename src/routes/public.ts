// src/routes/public.ts — Routes visiteur (accueil, menu, boutique, panier, checkout)

import { Router } from 'express';
import { homePage, menuPage, shopPage, productPage, contactPage, sitemapXml, robotsTxt } from '../controllers/shopController';
import { cartPage, checkoutPage, processCheckout, confirmationPage } from '../controllers/cartController';
import { checkoutLimiter, contactLimiter } from '../middlewares/rateLimiter';
import { validateBody, checkoutSchema, contactSchema, reviewSchema } from '../middlewares/validation';
import { sendOrderConfirmation } from '../services/emailService';
import prisma from '../models/prisma';

const router = Router();

/* ─── Pages principales ─── */
router.get('/', homePage);
router.get('/menu', menuPage);
router.get('/carte', menuPage);
router.get('/boutique', shopPage);
router.get('/boutique/:slug', productPage);
router.get('/contact', contactPage);

/* ─── Pages légales ─── */
router.get('/mentions-legales', (req, res) => {
    res.render('pages/mentions-legales', {
        metaTitle: "Mentions légales — L'InviThé Gourmand",
        metaDescription: "Mentions légales du site L'InviThé Gourmand, salon de thé à Paris 14e.",
        canonicalUrl: `${process.env.APP_URL}/mentions-legales`,
    });
});
router.get('/cgv', (req, res) => {
    res.render('pages/cgv', {
        metaTitle: "Conditions Générales de Vente — L'InviThé Gourmand",
        metaDescription: "CGV de la boutique en ligne L'InviThé Gourmand.",
        canonicalUrl: `${process.env.APP_URL}/cgv`,
    });
});
router.get('/confidentialite', (req, res) => {
    res.render('pages/confidentialite', {
        metaTitle: "Politique de confidentialité — L'InviThé Gourmand",
        metaDescription: "Politique de confidentialité et gestion des cookies de L'InviThé Gourmand.",
        canonicalUrl: `${process.env.APP_URL}/confidentialite`,
    });
});

/* ─── Panier & Checkout ─── */
router.get('/panier', cartPage);
router.get('/checkout', checkoutPage);
router.post('/checkout', checkoutLimiter, validateBody(checkoutSchema), processCheckout);
router.get('/confirmation', confirmationPage);
router.get('/commande/:id/facture', (req, res, next) => {
    import('../controllers/cartController').then(c => c.downloadInvoice(req, res)).catch(next);
});

/* ─── Avis clients (soumission publique) ─── */
router.post('/boutique/:slug/avis', contactLimiter, validateBody(reviewSchema), async (req, res) => {
    try {
        const { slug } = req.params;
        const { customerName, customerEmail, rating, comment } = (req as any).validatedBody;

        // Honeypot anti-spam: si le champ caché est rempli, c'est un bot
        if (req.body.website) {
            res.redirect(`/boutique/${slug}?review=submitted`);
            return;
        }

        const product = await prisma.product.findUnique({ where: { slug } });
        if (!product) {
            res.redirect('/boutique?error=product');
            return;
        }

        await prisma.review.create({
            data: {
                productId: product.id,
                customerName,
                customerEmail,
                rating: parseInt(rating),
                comment,
                status: 'pending',
            },
        });

        res.redirect(`/boutique/${slug}?review=submitted`);
    } catch (error) {
        console.error('❌ Erreur soumission avis :', error);
        const { slug } = req.params;
        res.redirect(`/boutique/${slug}?error=review`);
    }
});

/* ─── Contact (traitement formulaire) ─── */
router.post('/contact', contactLimiter, validateBody(contactSchema), async (req, res) => {
    try {
        const { name, email, subject, message } = (req as any).validatedBody;
        // Envoyer l'email au gérant
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'localhost',
            port: parseInt(process.env.SMTP_PORT || '465', 10),
            secure: process.env.SMTP_SECURE === 'true',
            auth: { user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASS || '' },
        });

        await transporter.sendMail({
            from: process.env.SMTP_FROM || 'contact@invithegourmand.fr',
            to: process.env.ADMIN_EMAIL || 'admin@invithegourmand.fr',
            replyTo: email,
            subject: `[Contact] ${subject} — de ${name}`,
            html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #C4704B;">Nouveau message de contact</h2>
          <p><strong>Nom :</strong> ${name}</p>
          <p><strong>Email :</strong> ${email}</p>
          <p><strong>Sujet :</strong> ${subject}</p>
          <p><strong>Message :</strong></p>
          <div style="background: #FDF6EC; padding: 16px; border-radius: 8px; white-space: pre-wrap;">${message}</div>
        </div>
      `,
        });

        res.redirect('/contact?success=true');
    } catch (error) {
        console.error('❌ Erreur envoi contact :', error);
        res.redirect('/contact?error=true');
    }
});

/* ─── SEO ─── */
router.get('/sitemap.xml', sitemapXml);
router.get('/robots.txt', robotsTxt);

export default router;
