// src/controllers/adminController.ts — Dashboard, produits, commandes, stocks

import { Request, Response } from 'express';
import prisma from '../models/prisma';
import { formatPrice, getOrderStatusLabel, getOrderStatusColor, getStockStatus, parseJsonArray, getProductImage } from '../utils/helpers';
import { slugify } from '../utils/slugify';
import { optimizeImage, optimizeImages, deleteImageFiles } from '../services/imageService';

/**
 * Dashboard admin — KPIs, graphique CA, top produits, alertes stock
 */
export async function dashboard(req: Request, res: Response): Promise<void> {
    try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // KPIs
        const [todayOrders, monthOrders, allOrders, recentOrders, stockAlerts] = await Promise.all([
            prisma.order.findMany({
                where: { createdAt: { gte: startOfDay }, status: { not: 'cancelled' } },
            }),
            prisma.order.findMany({
                where: { createdAt: { gte: startOfMonth }, status: { not: 'cancelled' } },
            }),
            prisma.order.findMany({
                where: { status: { not: 'cancelled' } },
            }),
            prisma.order.findMany({
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
            prisma.product.findMany({
                where: {
                    isActive: true,
                    stock: { lte: prisma.product.fields.stockAlertThreshold as unknown as number },
                },
            }),
        ]);

        // Récupérer les alertes de stock manuellement (le filtre Prisma ne supporte pas la comparaison entre colonnes directement)
        const allProducts = await prisma.product.findMany({ where: { isActive: true } });
        const realStockAlerts = allProducts.filter((p: any) => p.stock <= p.stockAlertThreshold);

        const todayRevenue = todayOrders.reduce((sum: number, o: any) => sum + Number(o.total), 0);
        const monthRevenue = monthOrders.reduce((sum: number, o: any) => sum + Number(o.total), 0);
        const totalRevenue = allOrders.reduce((sum: number, o: any) => sum + Number(o.total), 0);
        const totalOrders = allOrders.length;
        const averageCart = totalOrders > 0 ? Math.round(totalRevenue / totalOrders * 100) / 100 : 0;

        // Top 5 produits les plus vendus
        const topProducts = await prisma.orderItem.groupBy({
            by: ['productId', 'productName'],
            _sum: { quantity: true, totalPrice: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 5,
        });

        // Données graphique CA 30 jours
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const dailyOrders = await prisma.order.findMany({
            where: { createdAt: { gte: thirtyDaysAgo }, status: { not: 'cancelled' } },
            select: { createdAt: true, total: true },
            orderBy: { createdAt: 'asc' },
        });

        // Agréger par jour
        const revenueByDay: Record<string, number> = {};
        for (let i = 0; i < 30; i++) {
            const date = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
            const key = date.toISOString().split('T')[0];
            revenueByDay[key] = 0;
        }
        for (const order of dailyOrders) {
            const key = order.createdAt.toISOString().split('T')[0];
            if (revenueByDay[key] !== undefined) {
                revenueByDay[key] += Number(order.total);
            }
        }

        // Stats par catégorie (CA + top produit)
        const categories = await prisma.category.findMany({ orderBy: { displayOrder: 'asc' } });
        const categoryStats = [];
        for (const cat of categories) {
            const catProducts = await prisma.product.findMany({ where: { categoryId: cat.id }, select: { id: true, name: true } });
            const productIds = catProducts.map((p: any) => p.id);
            if (productIds.length === 0) {
                categoryStats.push({ name: cat.name, revenue: 0, topProduct: '—', topProductQty: 0 });
                continue;
            }
            const catItems = await prisma.orderItem.findMany({
                where: { productId: { in: productIds } },
                select: { productName: true, quantity: true, totalPrice: true },
            });
            const revenue = catItems.reduce((s: number, i: any) => s + Number(i.totalPrice), 0);
            const productQty: Record<string, number> = {};
            catItems.forEach((i: any) => { productQty[i.productName] = (productQty[i.productName] || 0) + i.quantity; });
            const topEntry = Object.entries(productQty).sort((a, b) => b[1] - a[1])[0];
            categoryStats.push({
                name: cat.name,
                revenue,
                topProduct: topEntry ? topEntry[0] : '—',
                topProductQty: topEntry ? topEntry[1] : 0,
            });
        }

        // Avis en attente
        const pendingReviews = await prisma.review.count({ where: { status: 'pending' } });

        res.render('admin/dashboard', {
            metaTitle: 'Dashboard Admin — L\'InviThé Gourmand',
            metaDescription: '', canonicalUrl: '',
            adminName: req.session.adminName,
            stats: { todayRevenue, monthRevenue, totalRevenue, totalOrders, averageCart },
            recentOrders,
            stockAlerts: realStockAlerts,
            topProducts,
            revenueByDay,
            categoryStats,
            pendingReviews,
            formatPrice,
            getOrderStatusLabel,
            getOrderStatusColor,
            getStockStatus,
        });
    } catch (error) {
        console.error('❌ Erreur dashboard :', error);
        res.status(500).render('pages/500', {
            metaTitle: 'Erreur', metaDescription: '', canonicalUrl: '',
            error: 'Erreur lors du chargement du dashboard',
        });
    }
}

/**
 * Page gestion produits (/admin/produits)
 */
export async function productsPage(req: Request, res: Response): Promise<void> {
    try {
        const search = req.query.recherche as string;
        const categoryFilter = req.query.categorie as string;

        const where: any = {};
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { shortDescription: { contains: search } },
            ];
        }
        if (categoryFilter) {
            where.categoryId = categoryFilter;
        }

        const [products, categories] = await Promise.all([
            prisma.product.findMany({
                where,
                include: { category: true },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.category.findMany({ orderBy: { displayOrder: 'asc' } }),
        ]);

        res.render('admin/products', {
            metaTitle: 'Gestion Produits — Admin', metaDescription: '', canonicalUrl: '',
            adminName: req.session.adminName,
            products,
            categories,
            currentSearch: search || '',
            currentCategory: categoryFilter || '',
            formatPrice,
            parseJsonArray,
            getProductImage,
            getStockStatus,
        });
    } catch (error) {
        console.error('❌ Erreur page produits :', error);
        res.status(500).render('pages/500', {
            metaTitle: 'Erreur', metaDescription: '', canonicalUrl: '',
            error: 'Erreur chargement produits',
        });
    }
}

/**
 * Créer un produit (POST /admin/produits)
 */
export async function createProduct(req: Request, res: Response): Promise<void> {
    try {
        const body = req.body;
        const files = req.files as Express.Multer.File[] | undefined;

        // Traiter les images
        let images: string[] = [];
        if (files && files.length > 0) {
            const optimized = await optimizeImages(files);
            images = optimized.map((img) => img.medium);
        }

        // Générer le slug
        const existingSlugs = (await prisma.product.findMany({ select: { slug: true } })).map((p: any) => p.slug);
        let productSlug = slugify(body.name);
        let counter = 1;
        while (existingSlugs.includes(productSlug)) {
            productSlug = `${slugify(body.name)}-${counter}`;
            counter++;
        }

        await prisma.product.create({
            data: {
                name: body.name,
                slug: productSlug,
                shortDescription: body.shortDescription || null,
                longDescription: body.longDescription || null,
                price: parseFloat(body.price),
                promoPrice: body.promoPrice ? parseFloat(body.promoPrice) : null,
                categoryId: body.categoryId,
                weight: body.weight || null,
                ingredients: body.ingredients || null,
                preparationTips: body.preparationTips || null,
                allergens: body.allergens || null,
                stock: parseInt(body.stock) || 0,
                stockAlertThreshold: parseInt(body.stockAlertThreshold) || 5,
                isActive: body.isActive === 'on',
                isFeatured: body.isFeatured === 'on',
                isNew: body.isNew === 'on',
                images: JSON.stringify(images),
                tags: JSON.stringify(body.tags ? body.tags.split(',').map((t: string) => t.trim()) : []),
            },
        });

        // Log d'audit
        await prisma.auditLog.create({
            data: {
                adminEmail: req.session.adminEmail || '',
                action: 'PRODUCT_CREATE',
                details: `Produit créé : ${body.name}`,
            },
        });

        res.redirect('/admin/produits?success=created');
    } catch (error) {
        console.error('❌ Erreur création produit :', error);
        res.redirect('/admin/produits?error=create');
    }
}

/**
 * Modifier un produit (POST /admin/produits/:id)
 */
export async function updateProduct(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const body = req.body;
        const files = req.files as Express.Multer.File[] | undefined;

        console.log(`📝 Modification produit ${id}`);

        const existing = await prisma.product.findUnique({ where: { id } });
        if (!existing) {
            console.log('❌ Produit introuvable');
            res.redirect('/admin/produits?error=notfound');
            return;
        }

        let images: string[] = [];
        try {
            images = parseJsonArray(existing.images);
        } catch (e) {
            console.error('⚠️ Erreur parsing images existantes, reset à tableau vide', e);
            images = [];
        }

        if (files && files.length > 0) {
            try {
                const optimized = await optimizeImages(files);
                images = [...images, ...optimized.map((img) => img.medium)];
            } catch (e) {
                console.error('❌ Erreur optimisation images', e);
                // On continue sans les nouvelles images si échec
            }
        }

        // Traitement des suppressions d'images
        if (body.deletedImages) {
            const imagesToDelete = body.deletedImages.split(',');
            // Filtrer le tableau des images à garder
            images = images.filter(img => !imagesToDelete.includes(img));

            // Supprimer physiquement les fichiers
            imagesToDelete.forEach((img: string) => {
                try {
                    deleteImageFiles(img);
                } catch (e) {
                    console.error(`⚠️ Erreur suppression fichier image ${img}`, e);
                }
            });
        }

        // Réordonner les images selon le drag & drop
        if (body.imageOrder) {
            const orderedPaths = body.imageOrder.split(',').filter((p: string) => p.trim());
            // Garder seulement les images existantes dans l'ordre spécifié
            const reordered = orderedPaths.filter((p: string) => images.includes(p));
            // Ajouter les nouvelles images (pas encore dans l'ordre) à la fin
            const newImages = images.filter(img => !reordered.includes(img));
            images = [...reordered, ...newImages];
        }

        // Préparation des données pour debug
        const updateData = {
            name: body.name,
            shortDescription: body.shortDescription || null,
            longDescription: body.longDescription || null,
            price: parseFloat(body.price),
            promoPrice: body.promoPrice ? parseFloat(body.promoPrice) : null,
            categoryId: body.categoryId,
            weight: body.weight || null,
            ingredients: body.ingredients || null,
            preparationTips: body.preparationTips || null,
            allergens: body.allergens || null,
            stock: parseInt(body.stock) || 0,
            stockAlertThreshold: parseInt(body.stockAlertThreshold) || 5,
            isActive: body.isActive === 'on',
            isFeatured: body.isFeatured === 'on',
            isNew: body.isNew === 'on',
            images: JSON.stringify(images),
            tags: JSON.stringify(body.tags ? body.tags.split(',').map((t: string) => t.trim()) : []),
        };

        // Validation basique
        if (isNaN(updateData.price)) throw new Error('Prix invalide');

        await prisma.product.update({
            where: { id },
            data: updateData,
        });

        // Log d'audit
        await prisma.auditLog.create({
            data: {
                adminEmail: req.session.adminEmail || '',
                action: 'PRODUCT_UPDATE',
                details: `Produit modifié : ${body.name} (${id})`,
            },
        });

        res.redirect('/admin/produits?success=updated');
    } catch (error: any) {
        console.error('❌ Erreur modification produit :', error);
        res.redirect('/admin/produits?error=update');
    }
}

/**
 * Supprimer un produit (POST /admin/produits/:id/delete)
 */
export async function deleteProduct(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const product = await prisma.product.findUnique({ where: { id } });
        if (!product) {
            res.redirect('/admin/produits?error=notfound');
            return;
        }

        await prisma.product.delete({ where: { id } });

        // Log d'audit
        await prisma.auditLog.create({
            data: {
                adminEmail: req.session.adminEmail || '',
                action: 'PRODUCT_DELETE',
                details: `Produit supprimé : ${product.name} (${id})`,
            },
        });

        res.redirect('/admin/produits?success=deleted');
    } catch (error) {
        console.error('❌ Erreur suppression produit :', error);
        res.redirect('/admin/produits?error=delete');
    }
}

/**
 * Page gestion commandes (/admin/commandes)
 */
export async function ordersPage(req: Request, res: Response): Promise<void> {
    try {
        const statusFilter = req.query.statut as string;
        const where: any = {};
        if (statusFilter) where.status = statusFilter;

        const orders = await prisma.order.findMany({
            where,
            include: { items: true },
            orderBy: { createdAt: 'desc' },
        });

        res.render('admin/orders', {
            metaTitle: 'Gestion Commandes — Admin', metaDescription: '', canonicalUrl: '',
            adminName: req.session.adminName,
            orders,
            currentStatus: statusFilter || '',
            formatPrice,
            getOrderStatusLabel,
            getOrderStatusColor,
        });
    } catch (error) {
        console.error('❌ Erreur page commandes :', error);
        res.status(500).render('pages/500', {
            metaTitle: 'Erreur', metaDescription: '', canonicalUrl: '',
            error: 'Erreur chargement commandes',
        });
    }
}

/**
 * Page gestion stocks (/admin/stocks)
 */
export async function stocksPage(req: Request, res: Response): Promise<void> {
    try {
        const products = await prisma.product.findMany({
            where: { isActive: true },
            include: { category: true },
            orderBy: [{ stock: 'asc' }],
        });

        res.render('admin/stocks', {
            metaTitle: 'Gestion Stocks — Admin', metaDescription: '', canonicalUrl: '',
            adminName: req.session.adminName,
            products,
            formatPrice,
            getStockStatus,
            parseJsonArray,
            getProductImage,
        });
    } catch (error) {
        console.error('❌ Erreur page stocks :', error);
        res.status(500).render('pages/500', {
            metaTitle: 'Erreur', metaDescription: '', canonicalUrl: '',
            error: 'Erreur chargement stocks',
        });
    }
}

/* ─── API Admin ─── */

/**
 * PUT /api/admin/orders/:id/status — Changer le statut d'une commande
 */
export async function apiUpdateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const validStatuses = ['pending', 'paid', 'preparing', 'ready', 'shipped', 'delivered', 'cancelled'];

        if (!validStatuses.includes(status)) {
            res.status(400).json({ success: false, error: 'Statut invalide' });
            return;
        }

        const order = await prisma.order.update({
            where: { id },
            data: { status },
        });

        // Log d'audit
        await prisma.auditLog.create({
            data: {
                adminEmail: req.session.adminEmail || '',
                action: 'ORDER_STATUS_UPDATE',
                details: `Commande ${order.orderNumber} → ${status}`,
            },
        });

        res.json({ success: true, data: { status, label: getOrderStatusLabel(status) } });
    } catch (error) {
        console.error('❌ Erreur mise à jour statut :', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
}

/**
 * PUT /api/admin/products/:id/stock — Modifier le stock d'un produit
 */
export async function apiUpdateStock(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const { stock, reason } = req.body;
        const newStock = parseInt(stock);

        if (isNaN(newStock) || newStock < 0) {
            res.status(400).json({ success: false, error: 'Stock invalide' });
            return;
        }

        const product = await prisma.product.findUnique({ where: { id } });
        if (!product) {
            res.status(404).json({ success: false, error: 'Produit introuvable' });
            return;
        }

        const quantityChange = newStock - product.stock;

        await prisma.product.update({ where: { id }, data: { stock: newStock } });

        // Mouvement de stock
        await prisma.stockMovement.create({
            data: {
                productId: id,
                quantityChange,
                reason: reason || 'adjustment',
            },
        });

        // Log d'audit
        await prisma.auditLog.create({
            data: {
                adminEmail: req.session.adminEmail || '',
                action: 'STOCK_UPDATE',
                details: `Stock ${product.name} : ${product.stock} → ${newStock} (${reason || 'adjustment'})`,
            },
        });

        res.json({ success: true, data: { stock: newStock } });
    } catch (error) {
        console.error('❌ Erreur mise à jour stock :', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
}

/* ─── Catégories ─── */

/**
 * Page gestion catégories (/admin/categories)
 */
export async function categoriesPage(req: Request, res: Response): Promise<void> {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { displayOrder: 'asc' },
            include: { _count: { select: { products: true } } },
        });

        res.render('admin/categories', {
            metaTitle: 'Gestion Catégories — Admin', metaDescription: '', canonicalUrl: '',
            adminName: req.session.adminName,
            categories,
        });
    } catch (error) {
        console.error('❌ Erreur page catégories :', error);
        res.status(500).render('pages/500', {
            metaTitle: 'Erreur', metaDescription: '', canonicalUrl: '',
            error: 'Erreur chargement catégories',
        });
    }
}

/**
 * Créer une catégorie (POST /admin/categories)
 */
export async function createCategory(req: Request, res: Response): Promise<void> {
    try {
        const { name, description, displayOrder } = req.body;

        const existingSlugs = (await prisma.category.findMany({ select: { slug: true } })).map((c: any) => c.slug);
        let catSlug = slugify(name);
        let counter = 1;
        while (existingSlugs.includes(catSlug)) {
            catSlug = `${slugify(name)}-${counter}`;
            counter++;
        }

        await prisma.category.create({
            data: {
                name,
                slug: catSlug,
                description: description || null,
                displayOrder: parseInt(displayOrder) || 0,
            },
        });

        await prisma.auditLog.create({
            data: {
                adminEmail: req.session.adminEmail || '',
                action: 'CATEGORY_CREATE',
                details: `Catégorie créée : ${name}`,
            },
        });

        res.redirect('/admin/categories?success=created');
    } catch (error) {
        console.error('❌ Erreur création catégorie :', error);
        res.redirect('/admin/categories?error=create');
    }
}

/**
 * Modifier une catégorie (POST /admin/categories/:id)
 */
export async function updateCategory(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const { name, description, displayOrder } = req.body;

        await prisma.category.update({
            where: { id },
            data: {
                name,
                description: description || null,
                displayOrder: parseInt(displayOrder) || 0,
            },
        });

        await prisma.auditLog.create({
            data: {
                adminEmail: req.session.adminEmail || '',
                action: 'CATEGORY_UPDATE',
                details: `Catégorie modifiée : ${name} (${id})`,
            },
        });

        res.redirect('/admin/categories?success=updated');
    } catch (error) {
        console.error('❌ Erreur modification catégorie :', error);
        res.redirect('/admin/categories?error=update');
    }
}

/**
 * Supprimer une catégorie (POST /admin/categories/:id/delete)
 */
export async function deleteCategory(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;

        // Vérifier s'il y a des produits liés
        const productsCount = await prisma.product.count({ where: { categoryId: id } });
        if (productsCount > 0) {
            res.redirect('/admin/categories?error=hasproducts');
            return;
        }

        const category = await prisma.category.findUnique({ where: { id } });
        await prisma.category.delete({ where: { id } });

        await prisma.auditLog.create({
            data: {
                adminEmail: req.session.adminEmail || '',
                action: 'CATEGORY_DELETE',
                details: `Catégorie supprimée : ${category?.name} (${id})`,
            },
        });

        res.redirect('/admin/categories?success=deleted');
    } catch (error) {
        console.error('❌ Erreur suppression catégorie :', error);
        res.redirect('/admin/categories?error=delete');
    }
}

/* ─── Codes Promo ─── */

/**
 * Page gestion codes promo (/admin/promos)
 */
export async function promoCodesPage(req: Request, res: Response): Promise<void> {
    try {
        const promos = await prisma.promoCode.findMany({
            orderBy: { createdAt: 'desc' },
        });

        res.render('admin/promos', {
            metaTitle: 'Codes Promo — Admin', metaDescription: '', canonicalUrl: '',
            adminName: req.session.adminName,
            promos,
            formatPrice,
        });
    } catch (error) {
        console.error('❌ Erreur page promos :', error);
        res.status(500).render('pages/500', {
            metaTitle: 'Erreur', metaDescription: '', canonicalUrl: '',
            error: 'Erreur chargement promos',
        });
    }
}

/**
 * Créer un code promo (POST /admin/promos)
 */
export async function createPromoCode(req: Request, res: Response): Promise<void> {
    try {
        const { code, discountType, discountValue, minOrderAmount, maxUses, expiresAt } = req.body;

        await prisma.promoCode.create({
            data: {
                code: code.toUpperCase().trim(),
                discountType,
                discountValue: parseFloat(discountValue),
                minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null,
                maxUses: maxUses ? parseInt(maxUses) : null,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                isActive: true,
            },
        });

        await prisma.auditLog.create({
            data: {
                adminEmail: req.session.adminEmail || '',
                action: 'PROMO_CREATE',
                details: `Code promo créé : ${code.toUpperCase()}`,
            },
        });

        res.redirect('/admin/promos?success=created');
    } catch (error: any) {
        if (error?.code === 'P2002') {
            res.redirect('/admin/promos?error=duplicate');
        } else {
            console.error('❌ Erreur création promo :', error);
            res.redirect('/admin/promos?error=create');
        }
    }
}

/**
 * Modifier un code promo (POST /admin/promos/:id)
 */
export async function updatePromoCode(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const { code, discountType, discountValue, minOrderAmount, maxUses, expiresAt, isActive } = req.body;

        await prisma.promoCode.update({
            where: { id },
            data: {
                code: code.toUpperCase().trim(),
                discountType,
                discountValue: parseFloat(discountValue),
                minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null,
                maxUses: maxUses ? parseInt(maxUses) : null,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                isActive: isActive === 'on' || isActive === 'true',
            },
        });

        await prisma.auditLog.create({
            data: {
                adminEmail: req.session.adminEmail || '',
                action: 'PROMO_UPDATE',
                details: `Code promo modifié : ${code.toUpperCase()} (${id})`,
            },
        });

        res.redirect('/admin/promos?success=updated');
    } catch (error) {
        console.error('❌ Erreur modification promo :', error);
        res.redirect('/admin/promos?error=update');
    }
}

/**
 * Supprimer un code promo (POST /admin/promos/:id/delete)
 */
export async function deletePromoCode(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const promo = await prisma.promoCode.findUnique({ where: { id } });

        await prisma.promoCode.delete({ where: { id } });

        await prisma.auditLog.create({
            data: {
                adminEmail: req.session.adminEmail || '',
                action: 'PROMO_DELETE',
                details: `Code promo supprimé : ${promo?.code} (${id})`,
            },
        });

        res.redirect('/admin/promos?success=deleted');
    } catch (error) {
        console.error('❌ Erreur suppression promo :', error);
        res.redirect('/admin/promos?error=delete');
    }
}

/* ─── Export Commandes CSV ─── */

/**
 * GET /admin/commandes/export — Export des commandes en CSV
 */
export async function exportOrdersCSV(req: Request, res: Response): Promise<void> {
    try {
        const status = req.query.status as string;
        const from = req.query.from as string;
        const to = req.query.to as string;

        const where: any = {};
        if (status) where.status = status;
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(from);
            if (to) where.createdAt.lte = new Date(to + 'T23:59:59');
        }

        const orders = await prisma.order.findMany({
            where,
            include: { items: true },
            orderBy: { createdAt: 'desc' },
        });

        // Construire le CSV
        const BOM = '\uFEFF'; // Pour Excel UTF-8
        const headers = [
            'N° Commande', 'Date', 'Client', 'Email', 'Téléphone',
            'Méthode livraison', 'Adresse', 'Statut', 'Sous-total',
            'Livraison', 'Remise', 'Total', 'Code promo', 'Produits', 'Notes'
        ];

        const rows = orders.map((o: any) => [
            o.orderNumber,
            new Date(o.createdAt).toLocaleDateString('fr-FR'),
            `"${o.customerName}"`,
            o.customerEmail,
            o.customerPhone || '',
            o.deliveryMethod === 'pickup' ? 'Retrait' : 'Livraison',
            `"${(o.shippingAddress || '').replace(/"/g, '""')}"`,
            getOrderStatusLabel(o.status),
            Number(o.subtotal).toFixed(2),
            Number(o.shippingCost).toFixed(2),
            Number(o.discount).toFixed(2),
            Number(o.total).toFixed(2),
            o.promoCode || '',
            `"${o.items.map((i: any) => `${i.productName} x${i.quantity}`).join(', ')}"`,
            `"${(o.notes || '').replace(/"/g, '""')}"`,
        ]);

        const csv = BOM + headers.join(';') + '\n' + rows.map((r: any) => r.join(';')).join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="commandes_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csv);
    } catch (error) {
        console.error('❌ Erreur export CSV :', error);
        res.redirect('/admin/commandes?error=export');
    }
}

/* ─── Avis Clients ─── */

/**
 * Page gestion avis (/admin/avis)
 */
export async function reviewsPage(req: Request, res: Response): Promise<void> {
    try {
        const status = (req.query.status as string) || 'all';
        const where: any = {};
        if (status !== 'all') where.status = status;

        const reviews = await prisma.review.findMany({
            where,
            include: { product: { select: { name: true, slug: true } } },
            orderBy: { createdAt: 'desc' },
        });

        const counts = {
            all: await prisma.review.count(),
            pending: await prisma.review.count({ where: { status: 'pending' } }),
            approved: await prisma.review.count({ where: { status: 'approved' } }),
            rejected: await prisma.review.count({ where: { status: 'rejected' } }),
        };

        res.render('admin/reviews', {
            metaTitle: 'Avis clients — Admin',
            metaDescription: '', canonicalUrl: '',
            adminName: req.session.adminName,
            reviews,
            currentStatus: status,
            counts,
            formatPrice,
        });
    } catch (error) {
        console.error('❌ Erreur page avis :', error);
        res.status(500).render('pages/500', {
            metaTitle: 'Erreur', metaDescription: '', canonicalUrl: '',
            error: 'Erreur lors du chargement des avis',
        });
    }
}

/**
 * Modérer un avis (POST /admin/avis/:id/status)
 */
export async function updateReviewStatus(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            res.redirect('/admin/avis?error=invalid');
            return;
        }

        await prisma.review.update({
            where: { id },
            data: { status },
        });

        await prisma.auditLog.create({
            data: {
                adminEmail: req.session.adminEmail || '',
                action: 'REVIEW_MODERATION',
                details: `Avis ${id} → ${status}`,
            },
        });

        res.redirect('/admin/avis?success=' + status);
    } catch (error) {
        console.error('❌ Erreur modération avis :', error);
        res.redirect('/admin/avis?error=moderation');
    }
}

/**
 * Supprimer un avis (POST /admin/avis/:id/delete)
 */
export async function deleteReview(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;

        await prisma.review.delete({ where: { id } });

        await prisma.auditLog.create({
            data: {
                adminEmail: req.session.adminEmail || '',
                action: 'REVIEW_DELETE',
                details: `Avis supprimé : ${id}`,
            },
        });

        res.redirect('/admin/avis?success=deleted');
    } catch (error) {
        console.error('❌ Erreur suppression avis :', error);
        res.redirect('/admin/avis?error=delete');
    }
}
