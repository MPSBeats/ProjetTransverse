// src/middlewares/security.ts — Configuration Helmet pour les headers de sécurité

import { Express } from 'express';
import helmet from 'helmet';

/**
 * Configure Helmet avec une CSP adaptée au projet
 */
export function setupSecurity(app: Express): void {
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "'unsafe-eval'",
                    "https://js.stripe.com",
                    "https://cdn.jsdelivr.net",
                    "https://unpkg.com",
                ],
                scriptSrcAttr: ["'unsafe-inline'"],
                frameSrc: ["https://js.stripe.com", "https://www.google.com", "https://maps.google.com"],
                imgSrc: [
                    "'self'",
                    "data:",
                    "blob:",
                    "https://fonts.gstatic.com",
                    "https://images.unsplash.com",
                ],
                styleSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "https://fonts.googleapis.com",
                    "https://cdn.jsdelivr.net",
                    "https://unpkg.com",
                ],
                fontSrc: [
                    "'self'",
                    "https://fonts.gstatic.com",
                ],
                connectSrc: [
                    "'self'",
                    "https://api.stripe.com",
                    "https://cdn.jsdelivr.net",
                ],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                workerSrc: ["'self'", "blob:"],
                formAction: ["'self'", "https://checkout.stripe.com", "https://*.stripe.com"],
            },
        },
        crossOriginEmbedderPolicy: false, // Nécessaire pour les images externes
        hsts: {
            maxAge: 63072000,
            includeSubDomains: true,
            preload: true,
        },
        frameguard: { action: 'deny' as const },
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' as const },
    }));
}
