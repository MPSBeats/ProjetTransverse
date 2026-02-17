// src/controllers/shopController.ts — Logique boutique, accueil, menu, produits

import { Request, Response } from 'express';
import prisma from '../models/prisma';
import { appCache } from '../../app';
import {
    formatPrice,
    parseJsonArray,
    getProductImage,
    getSingleImage,
    calculateDiscount,
    getStockStatus,
    getMenuSectionLabel,
} from '../utils/helpers';

/**
 * Page d'accueil — Hero, engagements, coups de cœur, catégories, témoignages
 */
export async function homePage(req: Request, res: Response): Promise<void> {
    try {
        // Produits vedettes (cache 60s)
        let featuredProducts = appCache.get('featured_products') as any[];
        if (!featuredProducts) {
            featuredProducts = await prisma.product.findMany({
                where: { isFeatured: true, isActive: true },
                include: { category: true },
                take: 6,
                orderBy: { createdAt: 'desc' },
            });
            appCache.set('featured_products', featuredProducts);
        }

        // Catégories (cache 60s)
        let categories = appCache.get('categories') as any[];
        if (!categories) {
            categories = await prisma.category.findMany({
                orderBy: { displayOrder: 'asc' },
            });
            appCache.set('categories', categories);
        }

        res.render('pages/home', {
            metaTitle: "Maison L'InviThé Gourmand — Salon de Thé & Pâtisserie Artisanale Paris 14",
            metaDescription: "Salon de thé cosy rue d'Alésia (Paris 14e). Dégustez nos pâtisseries artisanales, macarons, brunchs faits maison et thés bio. Sur place ou à emporter.",
            metaImage: '/images/og-home.jpg',
            canonicalUrl: process.env.APP_URL || 'http://localhost:3000',
            jsonLd: {
                "@context": "https://schema.org",
                "@type": "LocalBusiness",
                "name": "L'InviThé Gourmand",
                "image": `${process.env.APP_URL}/images/logo.png`,
                "telephone": "01 45 42 66 12",
                "email": "contact@invithegourmand.fr",
                "address": {
                    "@type": "PostalAddress",
                    "streetAddress": "64 rue d'Alésia",
                    "addressLocality": "Paris",
                    "postalCode": "75014",
                    "addressCountry": "FR"
                },
                "geo": {
                    "@type": "GeoCoordinates",
                    "latitude": 48.8285,
                    "longitude": 2.3256
                },
                "url": process.env.APP_URL || "http://localhost:3000",
                "openingHoursSpecification": [
                    {
                        "@type": "OpeningHoursSpecification",
                        "dayOfWeek": ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                        "opens": "11:00",
                        "closes": "19:00"
                    }
                ],
                "priceRange": "€€",
                "servesCuisine": "Tea, Pastries, Macarons, Ice Cream"
            },
            featuredProducts,
            categories,
            formatPrice,
            parseJsonArray,
            getProductImage,
            getSingleImage,
            calculateDiscount,
            getStockStatus,
        });
    } catch (error) {
        console.error('❌ Erreur page accueil :', error);
        res.status(500).render('pages/500', {
            metaTitle: 'Erreur — L\'InviThé Gourmand',
            metaDescription: '',
            canonicalUrl: '',
            error: 'Erreur lors du chargement de la page',
        });
    }
}

/**
 * Page Menu du salon — carte de restaurant
 */
export async function menuPage(req: Request, res: Response): Promise<void> {
    try {
        let menuItems = appCache.get('menu_items') as any[];
        if (!menuItems) {
            menuItems = await prisma.menuItem.findMany({
                where: { isAvailable: true },
                orderBy: [{ section: 'asc' }, { displayOrder: 'asc' }],
            });
            appCache.set('menu_items', menuItems);
        }

        // Regrouper par section
        const sections: Record<string, typeof menuItems> = {};
        for (const item of menuItems) {
            if (!sections[item.section]) {
                sections[item.section] = [];
            }
            sections[item.section].push(item);
        }

        // Ordre des sections
        const sectionOrder = ['thes_chauds', 'thes_glaces', 'cafes', 'patisseries', 'macarons', 'formules'];

        res.render('pages/menu', {
            metaTitle: "Notre Carte — L'InviThé Gourmand, Salon de Thé Paris 14e",
            metaDescription: "Découvrez notre carte : thés chauds et glacés, cafés de spécialité, pâtisseries du jour, macarons artisanaux et formules gourmandes.",
            canonicalUrl: `${process.env.APP_URL}/menu`,
            sections,
            sectionOrder,
            getMenuSectionLabel,
            formatPrice,
        });
    } catch (error) {
        console.error('❌ Erreur page menu :', error);
        res.status(500).render('pages/500', {
            metaTitle: 'Erreur', metaDescription: '', canonicalUrl: '',
            error: 'Erreur lors du chargement du menu',
        });
    }
}

/**
 * Page Boutique — catalogue avec filtres et pagination
 */
export async function shopPage(req: Request, res: Response): Promise<void> {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = 12;
        const categorySlug = req.query.categorie as string;
        const search = req.query.recherche as string;
        const sort = req.query.tri as string;

        // Construire le filtre Prisma
        const where: any = { isActive: true };
        if (categorySlug) {
            const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
            if (category) where.categoryId = category.id;
        }
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { shortDescription: { contains: search } },
                { tags: { contains: search } },
            ];
        }

        // Ordre de tri
        let orderBy: any = { createdAt: 'desc' };
        switch (sort) {
            case 'prix_asc': orderBy = { price: 'asc' }; break;
            case 'prix_desc': orderBy = { price: 'desc' }; break;
            case 'nouveautes': orderBy = { createdAt: 'desc' }; break;
            case 'nom': orderBy = { name: 'asc' }; break;
        }

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                include: { category: true },
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.product.count({ where }),
        ]);

        const categories = await prisma.category.findMany({ orderBy: { displayOrder: 'asc' } });
        const totalPages = Math.ceil(total / limit);

        res.render('pages/shop', {
            metaTitle: categorySlug
                ? `${categories.find((c: any) => c.slug === categorySlug)?.name || 'Boutique'} — L'InviThé Gourmand`
                : "Boutique en ligne — L'InviThé Gourmand",
            metaDescription: "Commandez en ligne nos thés bio, macarons artisanaux, pâtisseries et coffrets cadeaux. Livraison rapide ou retrait en boutique.",
            canonicalUrl: `${process.env.APP_URL}/boutique`,
            products,
            categories,
            currentCategory: categorySlug || '',
            currentSearch: search || '',
            currentSort: sort || 'nouveautes',
            page,
            totalPages,
            total,
            formatPrice,
            parseJsonArray,
            getProductImage,
            calculateDiscount,
            getStockStatus,
            jsonLd: {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "Accueil",
                        "item": `${process.env.APP_URL}`
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": "Boutique",
                        "item": `${process.env.APP_URL}/boutique`
                    },
                    ...(categorySlug ? [{
                        "@type": "ListItem",
                        "position": 3,
                        "name": categories.find((c: any) => c.slug === categorySlug)?.name || categorySlug,
                        "item": `${process.env.APP_URL}/boutique?categorie=${categorySlug}`
                    }] : [])
                ]
            }
        });
    } catch (error) {
        console.error('❌ Erreur page boutique :', error);
        res.status(500).render('pages/500', {
            metaTitle: 'Erreur', metaDescription: '', canonicalUrl: '',
            error: 'Erreur lors du chargement de la boutique',
        });
    }
}

/**
 * Fiche produit — détails, galerie, suggestions
 */
export async function productPage(req: Request, res: Response): Promise<void> {
    try {
        const { slug } = req.params;
        const product = await prisma.product.findUnique({
            where: { slug },
            include: { category: true },
        });

        if (!product || !product.isActive) {
            res.status(404).render('pages/404', {
                metaTitle: 'Produit introuvable — L\'InviThé Gourmand',
                metaDescription: '',
                canonicalUrl: '',
            });
            return;
        }

        // Produits suggérés (même catégorie)
        const [suggestions, reviews] = await Promise.all([
            prisma.product.findMany({
                where: {
                    categoryId: product.categoryId,
                    isActive: true,
                    id: { not: product.id },
                },
                include: { category: true },
                take: 4,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.review.findMany({
                where: {
                    productId: product.id,
                    status: 'approved',
                },
                orderBy: { createdAt: 'desc' },
                take: 20,
            }),
        ]);

        res.render('pages/product', {
            metaTitle: `${product.name} — L'InviThé Gourmand`,
            metaDescription: product.shortDescription || `Découvrez notre ${product.name}, une création artisanale de L'InviThé Gourmand.`,
            metaImage: getProductImage(product.images, 'large'),
            canonicalUrl: `${process.env.APP_URL}/boutique/${product.slug}`,
            product,
            suggestions,
            reviews,
            reviewSubmitted: req.query.review === 'submitted',
            formatPrice,
            parseJsonArray,
            getProductImage,
            getSingleImage,
            calculateDiscount,
            getStockStatus,
            jsonLd: {
                "@context": "https://schema.org",
                "@type": "Product",
                "name": product.name,
                "image": [`${process.env.APP_URL}${getProductImage(product.images, 'large')}`],
                "description": product.longDescription || product.shortDescription,
                "sku": product.id,
                "brand": {
                    "@type": "Brand",
                    "name": "L'InviThé Gourmand"
                },
                "offers": {
                    "@type": "Offer",
                    "url": `${process.env.APP_URL}/boutique/${product.slug}`,
                    "priceCurrency": "EUR",
                    "price": product.price,
                    "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                    "itemCondition": "https://schema.org/NewCondition"
                }
            }
        });
    } catch (error) {
        console.error('❌ Erreur fiche produit :', error);
        res.status(500).render('pages/500', {
            metaTitle: 'Erreur', metaDescription: '', canonicalUrl: '',
            error: 'Erreur lors du chargement du produit',
        });
    }
}

/**
 * Page Contact
 */
export async function contactPage(req: Request, res: Response): Promise<void> {
    res.render('pages/contact', {
        metaTitle: "Nous contacter — L'InviThé Gourmand, Paris 14e",
        metaDescription: "Contactez-nous par téléphone, email ou venez nous rendre visite au 64 rue d'Alésia, Paris 14e. Ouvert du mardi au samedi.",
        canonicalUrl: `${process.env.APP_URL}/contact`,
        success: req.query.success === 'true',
    });
}

/**
 * Sitemap.xml dynamique
 */
export async function sitemapXml(req: Request, res: Response): Promise<void> {
    try {
        const baseUrl = process.env.APP_URL || 'http://localhost:3000';
        const products = await prisma.product.findMany({
            where: { isActive: true },
            select: { slug: true, updatedAt: true },
        });
        const categories = await prisma.category.findMany({
            select: { slug: true },
        });

        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

        // Pages statiques
        // Pages statiques
        const staticPages = [
            { url: '/', priority: '1.0', changefreq: 'daily' },
            { url: '/menu', priority: '0.8', changefreq: 'weekly' },
            { url: '/boutique', priority: '0.9', changefreq: 'daily' },
            { url: '/contact', priority: '0.5', changefreq: 'monthly' },
            { url: '/mentions-legales', priority: '0.3', changefreq: 'yearly' },
            { url: '/cgv', priority: '0.3', changefreq: 'yearly' },
            { url: '/confidentialite', priority: '0.3', changefreq: 'yearly' },
        ];

        for (const page of staticPages) {
            xml += `  <url>\n    <loc>${baseUrl}${page.url}</loc>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>\n`;
        }

        // Catégories
        for (const cat of categories) {
            xml += `  <url>\n    <loc>${baseUrl}/boutique?categorie=${cat.slug}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
        }

        // Produits
        for (const product of products) {
            xml += `  <url>\n    <loc>${baseUrl}/boutique/${product.slug}</loc>\n    <lastmod>${product.updatedAt.toISOString().split('T')[0]}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
        }

        xml += '</urlset>';

        res.set('Content-Type', 'application/xml');
        res.send(xml);
    } catch (error) {
        console.error('❌ Erreur sitemap :', error);
        res.status(500).send('Erreur serveur');
    }
}

/**
 * robots.txt
 */
export function robotsTxt(req: Request, res: Response): void {
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    res.set('Content-Type', 'text/plain');
    res.send(`User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /panier
Disallow: /checkout

Sitemap: ${baseUrl}/sitemap.xml
`);
}
