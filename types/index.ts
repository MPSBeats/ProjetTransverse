// types/index.ts — Types TypeScript globaux pour InviThé Gourmand

import { Decimal } from '@prisma/client/runtime/library';

/* ─── Panier ─── */
export interface CartItem {
    productId: string;
    name: string;
    slug: string;
    price: number;
    promoPrice: number | null;
    image: string;
    quantity: number;
    stock: number;
}

export interface Cart {
    items: CartItem[];
    subtotal: number;
    shippingCost: number;
    discount: number;
    promoCode: string | null;
    total: number;
}

/* ─── Session Express ─── */
declare module 'express-session' {
    interface SessionData {
        adminId?: string;
        adminEmail?: string;
        adminName?: string;
        cart?: Cart;
        csrfToken?: string;
        loginAttempts?: number;
        lastLoginAttempt?: number;
    }
}

/* ─── Données de templates EJS ─── */
export interface PageMeta {
    metaTitle?: string;
    metaDescription?: string;
    metaImage?: string;
    canonicalUrl?: string;
    jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export interface FlashMessage {
    type: 'success' | 'error' | 'warning' | 'info';
    text: string;
}

export interface BaseTemplateData extends PageMeta {
    currentPath: string;
    cartCount: number;
    flash?: FlashMessage;
    stripePublishableKey?: string;
}

/* ─── Checkout ─── */
export interface CheckoutFormData {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    deliveryMethod: 'pickup' | 'delivery';
    shippingAddress?: string;
    shippingCity?: string;
    shippingPostalCode?: string;
    notes?: string;
}

/* ─── Admin ─── */
export interface DashboardStats {
    todayRevenue: number;
    monthRevenue: number;
    totalRevenue: number;
    totalOrders: number;
    averageCart: number;
}

export interface StockAlert {
    productId: string;
    productName: string;
    stock: number;
    threshold: number;
}

/* ─── Filtres boutique ─── */
export interface ShopFilters {
    category?: string;
    search?: string;
    sort?: 'price_asc' | 'price_desc' | 'newest' | 'popular';
    page?: number;
    limit?: number;
}

/* ─── Réponses API ─── */
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

/* ─── Image optimisée ─── */
export interface OptimizedImage {
    original: string;
    thumbnail: string;
    medium: string;
    large: string;
}
