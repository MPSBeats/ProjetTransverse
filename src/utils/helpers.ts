// src/utils/helpers.ts — Fonctions utilitaires globales

import { Decimal } from '@prisma/client/runtime/library';

/**
 * Formate un prix en euros
 */
export function formatPrice(price: number | Decimal | string): string {
    const numPrice = typeof price === 'string' ? parseFloat(price) : Number(price);
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
    }).format(numPrice);
}

/**
 * Génère un numéro de commande unique (IGR-YYYYMMDD-XXXX)
 */
export function generateOrderNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `IGR-${dateStr}-${random}`;
}

/**
 * Tronque un texte proprement
 */
export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '…';
}

/**
 * Parse les images JSON depuis la BDD
 */
export function parseJsonArray(jsonString: string): string[] {
    try {
        const parsed = JSON.parse(jsonString);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/**
 * Retourne le chemin d'une image optimisée
 */
export function getSingleImage(img: string, size: 'thumbnail' | 'medium' | 'large' | 'original' = 'medium'): string {
    if (!img) return '/images/placeholder-product.jpg';
    // Si c'est un chemin d'upload, ajouter le préfixe de taille
    if (img.startsWith('/uploads/')) {
        // Enlever l'extension
        let base = img.substring(0, img.lastIndexOf('.'));
        const extension = img.substring(img.lastIndexOf('.'));

        // Enlever le suffixe existant si présent (-thumbnail, -medium, -large, -original)
        base = base.replace(/-(thumbnail|medium|large|original)$/, '');

        return `${base}-${size}${extension}`;
    }
    return img;
}

/**
 * Retourne la première image ou un placeholder
 */
export function getProductImage(images: string, size: 'thumbnail' | 'medium' | 'large' = 'medium'): string {
    const parsed = parseJsonArray(images);
    if (parsed.length === 0) return '/images/placeholder-product.jpg';
    return getSingleImage(parsed[0], size);
}

/**
 * Calcule le pourcentage de réduction
 */
export function calculateDiscount(price: number | Decimal, promoPrice: number | Decimal | null): number {
    if (!promoPrice) return 0;
    const p = Number(price);
    const pp = Number(promoPrice);
    return Math.round(((p - pp) / p) * 100);
}

/**
 * Vérifie si un stock est bas
 */
export function getStockStatus(stock: number, threshold: number): 'in' | 'low' | 'out' {
    if (stock <= 0) return 'out';
    if (stock <= threshold) return 'low';
    return 'in';
}

/**
 * Génère un label de statut de commande en français
 */
export function getOrderStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        pending: 'En attente',
        paid: 'Payée',
        preparing: 'En préparation',
        ready: 'Prête',
        shipped: 'Expédiée',
        delivered: 'Livrée',
        cancelled: 'Annulée',
    };
    return labels[status] || status;
}

/**
 * Génère une couleur de badge pour le statut
 */
export function getOrderStatusColor(status: string): string {
    const colors: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-800',
        paid: 'bg-blue-100 text-blue-800',
        preparing: 'bg-orange-100 text-orange-800',
        ready: 'bg-green-100 text-green-800',
        shipped: 'bg-purple-100 text-purple-800',
        delivered: 'bg-green-200 text-green-900',
        cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Labels des sections menu
 */
export function getMenuSectionLabel(section: string): string {
    const labels: Record<string, string> = {
        thes_chauds: 'Thés Chauds',
        thes_glaces: 'Thés Glacés',
        cafes: 'Cafés',
        patisseries: 'Pâtisseries du Jour',
        macarons: 'Macarons',
        formules: 'Nos Formules',
    };
    return labels[section] || section;
}

/**
 * Calcule les frais de livraison
 */
export function calculateShipping(subtotal: number, method: string): number {
    if (method === 'pickup') return 0;
    if (subtotal >= 50) return 0; // Livraison offerte dès 50€
    return 5.90;
}
