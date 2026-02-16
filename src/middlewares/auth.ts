// src/middlewares/auth.ts — Middleware d'authentification admin

import { Request, Response, NextFunction } from 'express';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

/**
 * Vérifie que l'utilisateur est authentifié comme admin
 * Redirige vers /admin/login si non connecté
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
    if (req.session.adminId && req.session.adminEmail) {
        return next();
    }
    // Sauvegarder l'URL demandée pour rediriger après login
    req.session.save(() => {
        res.redirect('/admin/login');
    });
}

/**
 * Vérifie si le compte est verrouillé (protection brute-force)
 */
export function checkBruteForce(req: Request, res: Response, next: NextFunction): void {
    const attempts = req.session.loginAttempts || 0;
    const lastAttempt = req.session.lastLoginAttempt || 0;
    const now = Date.now();

    // Si verrouillé et le délai n'est pas écoulé
    if (attempts >= MAX_LOGIN_ATTEMPTS && (now - lastAttempt) < LOCKOUT_DURATION) {
        const remainingMinutes = Math.ceil((LOCKOUT_DURATION - (now - lastAttempt)) / 60000);
        res.status(429).render('admin/login', {
            metaTitle: 'Connexion Admin — L\'InviThé Gourmand',
            metaDescription: '',
            canonicalUrl: '',
            error: `Compte verrouillé. Réessayez dans ${remainingMinutes} minute(s).`,
            email: '',
        });
        return;
    }

    // Réinitialiser après le délai
    if (attempts >= MAX_LOGIN_ATTEMPTS && (now - lastAttempt) >= LOCKOUT_DURATION) {
        req.session.loginAttempts = 0;
    }

    next();
}

/**
 * Incrémente le compteur de tentatives échouées
 */
export function recordFailedLogin(req: Request): void {
    req.session.loginAttempts = (req.session.loginAttempts || 0) + 1;
    req.session.lastLoginAttempt = Date.now();
}

/**
 * Réinitialise le compteur après connexion réussie
 */
export function resetLoginAttempts(req: Request): void {
    req.session.loginAttempts = 0;
    req.session.lastLoginAttempt = undefined;
}
