// src/middlewares/validation.ts — Schémas de validation Zod

import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

/* ─── Schémas Zod ─── */

/** Validation formulaire contact */
export const contactSchema = z.object({
    name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(100),
    email: z.string().email('Email invalide'),
    subject: z.string().min(3, 'Le sujet doit contenir au moins 3 caractères').max(200),
    message: z.string().min(10, 'Le message doit contenir au moins 10 caractères').max(5000),
});

/** Validation login admin */
export const loginSchema = z.object({
    email: z.string().email('Email invalide'),
    password: z.string().min(6, 'Mot de passe trop court'),
});

/** Validation checkout */
export const checkoutSchema = z.object({
    customerName: z.string().min(2, 'Nom requis').max(100),
    customerEmail: z.string().email('Email invalide'),
    customerPhone: z.string().min(10, 'Téléphone invalide').max(20),
    country: z.string().optional(),
    deliveryMethod: z.enum(['pickup', 'delivery']),
    shippingAddress: z.string().optional(),
    shippingCity: z.string().optional(),
    shippingPostalCode: z.string().optional(),
    deliveryDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Date invalide'),
    deliveryTime: z.string().regex(/^(10|11|12|13|14|15|16|17|18):00$/, 'Heure invalide (10h-18h)'),
    notes: z.string().max(500).optional(),
});

/** Validation produit (admin) */
export const productSchema = z.object({
    name: z.string().min(2, 'Nom requis').max(200),
    shortDescription: z.string().max(500).optional(),
    longDescription: z.string().max(10000).optional(),
    price: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, 'Prix invalide'),
    promoPrice: z.string().optional().refine((val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), 'Prix promo invalide'),
    categoryId: z.string().uuid('Catégorie invalide'),
    weight: z.string().max(50).optional(),
    ingredients: z.string().max(2000).optional(),
    preparationTips: z.string().max(2000).optional(),
    allergens: z.string().max(500).optional(),
    stock: z.string().refine((val) => !isNaN(parseInt(val)) && parseInt(val) >= 0, 'Stock invalide'),
    stockAlertThreshold: z.string().optional(),
    isActive: z.string().optional(),
    isFeatured: z.string().optional(),
    isNew: z.string().optional(),
    tags: z.string().max(500).optional(),
});

/** Validation item panier (API) */
export const cartItemSchema = z.object({
    productId: z.string().uuid('ID produit invalide'),
    quantity: z.number().int().min(1, 'Quantité minimum : 1').max(99, 'Quantité maximum : 99'),
});

/** Validation code promo */
export const promoCodeSchema = z.object({
    code: z.string().min(3, 'Code trop court').max(30, 'Code trop long').toUpperCase(),
});

/** Validation avis client (public) */
export const reviewSchema = z.object({
    customerName: z.string().min(2, 'Nom trop court').max(100),
    customerEmail: z.string().email('Email invalide'),
    rating: z.string().refine((v) => {
        const n = parseInt(v);
        return !isNaN(n) && n >= 1 && n <= 5;
    }, 'Note entre 1 et 5'),
    comment: z.string().min(10, 'Commentaire trop court (min 10 caractères)').max(2000),
});

/* ─── Middleware de validation générique ─── */

/**
 * Crée un middleware de validation Zod pour le body
 */
export function validateBody<T>(schema: z.ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const errors = result.error.errors.map((e) => e.message);
            // Pour les requêtes API, répondre en JSON
            if (req.path.startsWith('/api') || req.xhr || req.headers.accept?.includes('application/json')) {
                res.status(400).json({ success: false, errors });
                return;
            }
            // Pour les formulaires, rediriger avec erreur
            res.status(400).render('pages/500', {
                metaTitle: 'Erreur de validation',
                metaDescription: '',
                canonicalUrl: '',
                error: errors.join(', '),
            });
            return;
        }
        // Attacher les données validées au request
        (req as any).validatedBody = result.data;
        next();
    };
}
