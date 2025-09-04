/**
 * CART MANAGER - Прост работещ
 * =============================
 */
class CartManager {
    constructor() {
        this.badge = document.getElementById('cart-badge');
        this.init();
    }

    async init() {
        await this.updateBadge();
    }

    async add(productId, quantity = 1) {
        try {
            const response = await fetch('/api/cart/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `productId=${productId}&quantity=${quantity}`,
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    window.toastManager.success(data.message);
                    this.updateBadge();
                } else {
                    window.toastManager.error(data.error || 'Грешка при добавяне');
                }
            } else {
                window.toastManager.error('Грешка при добавяне в кошницата');
            }
        } catch (error) {
            window.toastManager.error('Грешка при добавяне в кошницата');
        }
    }

    async updateBadge() {
        try {
            const response = await fetch('/api/cart/count', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.setBadge(data.count);
            }
        } catch (error) {
            // Тихо fail за badge update
        }
    }

    setBadge(count) {
        if (!this.badge) return;

        this.badge.textContent = count;
        this.badge.classList.toggle('show', count > 0);
    }
}

// Global instance
window.cartManager = new CartManager();