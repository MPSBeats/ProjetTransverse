// src/routes/admin.ts — Routes admin protégées

import { Router } from 'express';
import { requireAdmin, checkBruteForce } from '../middlewares/auth';
import { loginLimiter } from '../middlewares/rateLimiter';
import { loginPage, processLogin, logout } from '../controllers/authController';
import {
    dashboard,
    productsPage,
    createProduct,
    updateProduct,
    deleteProduct,
    deleteOrder,
    ordersPage,
    stocksPage,
    categoriesPage,
    createCategory,
    updateCategory,
    deleteCategory,
    promoCodesPage,
    createPromoCode,
    updatePromoCode,
    deletePromoCode,
    exportOrdersCSV,
    reviewsPage,
    updateReviewStatus,
    deleteReview,
} from '../controllers/adminController';
import { uploadMultiple } from '../services/imageService';

const router = Router();

/* ─── Auth (non protégées) ─── */
router.get('/login', loginPage);
router.post('/login', loginLimiter, checkBruteForce, processLogin);
router.get('/logout', logout);

/* ─── Toutes les routes suivantes nécessitent une authentification admin ─── */
router.use(requireAdmin);

/* ─── Dashboard ─── */
router.get('/', (req, res) => res.redirect('/admin/dashboard'));
router.get('/dashboard', dashboard);

/* ─── Produits ─── */
router.get('/produits', productsPage);
router.post('/produits', uploadMultiple, createProduct);
router.post('/produits/:id', uploadMultiple, updateProduct);
router.post('/produits/:id/delete', deleteProduct);

/* ─── Commandes ─── */
router.get('/commandes', ordersPage);
router.post('/commandes/:id/delete', deleteOrder);
router.get('/commandes/export', exportOrdersCSV);

/* ─── Stocks ─── */
router.get('/stocks', stocksPage);

/* ─── Catégories ─── */
router.get('/categories', categoriesPage);
router.post('/categories', createCategory);
router.post('/categories/:id', updateCategory);
router.post('/categories/:id/delete', deleteCategory);

/* ─── Codes Promo ─── */
router.get('/promos', promoCodesPage);
router.post('/promos', createPromoCode);
router.post('/promos/:id', updatePromoCode);
router.post('/promos/:id/delete', deletePromoCode);

/* ─── Avis Clients ─── */
router.get('/avis', reviewsPage);
router.post('/avis/:id/status', updateReviewStatus);
router.post('/avis/:id/delete', deleteReview);

export default router;
