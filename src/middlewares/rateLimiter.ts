// src/middlewares/rateLimiter.ts — Limiteurs de débit sur les routes sensibles

import rateLimit from 'express-rate-limit';

/** Limiter API global : 100 requêtes/minute */
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { success: false, error: 'Trop de requêtes, veuillez réessayer plus tard.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/** Limiter login admin : 5 tentatives / 15 minutes */
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
});

/** Limiter checkout : 10 requêtes/minute */
export const checkoutLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { success: false, error: 'Trop de tentatives de paiement. Réessayez dans une minute.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/** Limiter contact : 3 requêtes/minute */
export const contactLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 3,
    message: 'Trop de messages envoyés. Réessayez dans une minute.',
    standardHeaders: true,
    legacyHeaders: false,
});
