// public/js/cart.js — Alpine.js Cart Store

document.addEventListener('alpine:init', () => {
    Alpine.store('cart', {
        items: [],
        subtotal: 0,
        shippingCost: 0,
        discount: 0,
        promoCode: null,
        total: 0,
        drawerOpen: false,
        toast: false,
        toastMessage: '',

        init() {
            // Charger le panier depuis le serveur
            this.fetchCart();
        },

        async fetchCart() {
            try {
                const res = await fetch('/api/cart');
                const data = await res.json();
                if (data.success) {
                    this.items = data.data.items || [];
                    this.subtotal = data.data.subtotal || 0;
                    this.shippingCost = data.data.shippingCost || 0;
                    this.discount = data.data.discount || 0;
                    this.promoCode = data.data.promoCode || null;
                    this.total = data.data.total || 0;
                }
            } catch (e) {
                console.error('Erreur chargement panier:', e);
            }
        },

        async addItem(productId, quantity = 1) {
            try {
                const res = await fetch('/api/cart/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId, quantity }),
                });
                const data = await res.json();
                if (data.success) {
                    this.syncCart(data.data);
                    this.showToast(data.message || 'Ajouté au panier');
                    this.drawerOpen = true;
                } else {
                    this.showToast(data.error || 'Erreur', true);
                }
            } catch (e) {
                console.error('Erreur ajout panier:', e);
                this.showToast('Erreur réseau', true);
            }
        },

        async updateQuantity(productId, quantity) {
            if (quantity <= 0) {
                return this.removeItem(productId);
            }
            try {
                const res = await fetch('/api/cart/update', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId, quantity }),
                });
                const data = await res.json();
                if (data.success) {
                    this.syncCart(data.data);
                } else {
                    this.showToast(data.error || 'Erreur', true);
                }
            } catch (e) {
                console.error('Erreur mise à jour:', e);
            }
        },

        async removeItem(productId) {
            try {
                const res = await fetch('/api/cart/remove', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId }),
                });
                const data = await res.json();
                if (data.success) {
                    this.syncCart(data.data);
                    this.showToast('Article supprimé');
                }
            } catch (e) {
                console.error('Erreur suppression:', e);
            }
        },

        async applyPromo(code) {
            try {
                const res = await fetch('/api/cart/promo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code }),
                });
                const data = await res.json();
                if (data.success) {
                    this.syncCart(data.data);
                    this.showToast(data.message || 'Code promo appliqué');
                    return Promise.resolve();
                } else {
                    return Promise.reject(data.error || 'Code invalide');
                }
            } catch (e) {
                return Promise.reject('Erreur réseau');
            }
        },

        syncCart(cartData) {
            this.items = cartData.items || [];
            this.subtotal = cartData.subtotal || 0;
            this.shippingCost = cartData.shippingCost || 0;
            this.discount = cartData.discount || 0;
            this.promoCode = cartData.promoCode || null;
            this.total = cartData.total || 0;
        },

        showToast(message, isError = false) {
            this.toastMessage = message;
            this.toast = true;
            setTimeout(() => {
                this.toast = false;
            }, 3000);
        },
    });
});
