// src/controllers/authController.ts — Authentification admin

import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../models/prisma';
import { recordFailedLogin, resetLoginAttempts } from '../middlewares/auth';

/**
 * Affiche la page de connexion admin
 */
export function loginPage(req: Request, res: Response): void {
    // Rediriger si déjà connecté
    if (req.session.adminId) {
        res.redirect('/admin/dashboard');
        return;
    }

    res.render('admin/login', {
        metaTitle: 'Connexion Admin — L\'InviThé Gourmand',
        metaDescription: '',
        canonicalUrl: '',
        error: null,
        email: '',
    });
}

/**
 * Traite le formulaire de connexion
 */
export async function processLogin(req: Request, res: Response): Promise<void> {
    try {
        const { email, password } = req.body;

        const admin = await prisma.adminUser.findUnique({ where: { email } });

        if (!admin) {
            recordFailedLogin(req);
            res.render('admin/login', {
                metaTitle: 'Connexion Admin — L\'InviThé Gourmand',
                metaDescription: '', canonicalUrl: '',
                error: 'Email ou mot de passe incorrect.',
                email,
            });
            return;
        }

        const passwordMatch = await bcrypt.compare(password, admin.password);

        if (!passwordMatch) {
            recordFailedLogin(req);
            // Log d'audit
            await prisma.auditLog.create({
                data: {
                    adminEmail: email,
                    action: 'LOGIN_FAILED',
                    details: `Tentative de connexion échouée depuis ${req.ip}`,
                },
            });
            res.render('admin/login', {
                metaTitle: 'Connexion Admin — L\'InviThé Gourmand',
                metaDescription: '', canonicalUrl: '',
                error: 'Email ou mot de passe incorrect.',
                email,
            });
            return;
        }

        // Connexion réussie
        resetLoginAttempts(req);
        req.session.adminId = admin.id;
        req.session.adminEmail = admin.email;
        req.session.adminName = admin.name;

        // Log d'audit
        await prisma.auditLog.create({
            data: {
                adminEmail: admin.email,
                action: 'LOGIN_SUCCESS',
                details: `Connexion réussie depuis ${req.ip}`,
            },
        });

        req.session.save(() => {
            res.redirect('/admin/dashboard');
        });
    } catch (error) {
        console.error('❌ Erreur login :', error);
        res.render('admin/login', {
            metaTitle: 'Connexion Admin', metaDescription: '', canonicalUrl: '',
            error: 'Erreur serveur, réessayez.',
            email: req.body.email || '',
        });
    }
}

/**
 * Déconnexion admin
 */
export function logout(req: Request, res: Response): void {
    const email = req.session.adminEmail;
    req.session.destroy(async (err) => {
        if (err) console.error('❌ Erreur déconnexion :', err);
        // Log d'audit
        if (email) {
            try {
                await prisma.auditLog.create({
                    data: { adminEmail: email, action: 'LOGOUT', details: 'Déconnexion' },
                });
            } catch { /* Ignorer les erreurs d'audit */ }
        }
        res.redirect('/admin/login');
    });
}
