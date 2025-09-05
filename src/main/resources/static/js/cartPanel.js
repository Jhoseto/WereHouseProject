/**
 * CART SLIDE-OUT PANEL MANAGER
 * =============================
 */
class CartPanelManager {
    constructor() {
        this.panel = document.getElementById('cartPanel');
        this.overlay = document.getElementById('cartPanelOverlay');
        this.content = document.getElementById('cartPanelContent');
        this.footer = document.getElementById('cartPanelFooter');
        this.isOpen = false;
        this.isLoading = false;

        this.init();
    }

    init() {
        // Event listeners за ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Event listeners за затваряне с overlay click
        this.overlay?.addEventListener('click', () => {
            this.close();
        });
    }

    async open() {
        if (this.isOpen || !this.panel || !this.overlay) return;

        this.isOpen = true;

        // Показва overlay и panel
        this.overlay.classList.add('show');
        this.panel.classList.add('show');

        // Зарежда съдържанието
        await this.loadCartContent();
    }

    close() {
        if (!this.isOpen || !this.panel || !this.overlay) return;

        this.isOpen = false;
        // Скрива panel и overlay
        this.panel.classList.remove('show');
        this.overlay.classList.remove('show');
    }

    async loadCartContent() {
        if (this.isLoading || !this.content) return;

        this.isLoading = true;
        this.showLoading();

        try {
            const response = await fetch('/api/cart/items', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.renderCartContent(data);
            } else {
                this.showError('Грешка при зареждане на кошницата');
            }
        } catch (error) {
            console.error('Cart loading error:', error);
            this.showError('Грешка при зареждане на кошницата');
        } finally {
            this.isLoading = false;
        }
    }

    showLoading() {
        if (!this.content) return;

        this.content.innerHTML = `
            <div class="cart-loading">
                <div class="cart-spinner"></div>
                <p>Зареждане на количката...</p>
            </div>
        `;

        this.footer.innerHTML = '';
    }

    showError(message) {
        if (!this.content) return;

        this.content.innerHTML = `
            <div class="cart-empty">
                <div class="cart-empty-icon">
                    <i class="bi bi-exclamation-triangle"></i>
                </div>
                <h4>Възникна грешка</h4>
                <p>${message}</p>
                <button class="cart-empty-btn" onclick="window.cartPanel.loadCartContent()">
                    <i class="bi bi-arrow-clockwise"></i>
                    Опитай отново
                </button>
            </div>
        `;

        this.footer.innerHTML = '';
    }

    renderCartContent(data) {
        if (!this.content || !this.footer) return;

        if (!data.items || data.items.length === 0) {
            this.renderEmptyCart();
            return;
        }

        // Рендер на артикулите
        this.content.innerHTML = data.items.map(item => this.renderCartItem(item)).join('');

        // Рендер на footer с общата сума
        this.footer.innerHTML = this.renderCartFooter(data);

        // Bind events за количества и премахване
        this.bindCartEvents();
    }

    renderEmptyCart() {
        this.content.innerHTML = `
            <div class="cart-empty">
                <div class="cart-empty-icon">
                    <i class="bi bi-cart3"></i>
                </div>
                <h4>Количката е празна</h4>
                <p>Все още не сте добавили нито един продукт в количката си.</p>
                <a href="/catalog" class="cart-empty-btn" onclick="window.cartPanel.close()">
                    <i class="bi bi-grid"></i>
                    Добавете артикули
                </a>
            </div>
        `;

        this.footer.innerHTML = '';
    }

    renderCartItem(item) {
        return `
            <div class="cart-item" data-product-id="${item.productId}">
                <div class="cart-item-content">
                    <div class="cart-item-image">
                        <i class="bi bi-box"></i>
                    </div>
                    <div class="cart-item-details">
                        <div class="cart-item-name">${this.escapeHtml(item.productName)}</div>
                        <div class="cart-item-sku">Код: ${this.escapeHtml(item.productSku)}</div>
                        <div class="cart-item-price">${this.formatPrice(item.pricePerUnit)} лв.</div>
                    </div>
                </div>
                <div class="cart-item-actions">
                    <div class="cart-quantity-controls">
                        <button class="cart-qty-btn cart-qty-decrease" data-product-id="${item.productId}">
                            <i class="bi bi-dash"></i>
                        </button>
                        <input type="number" 
                               class="cart-qty-input" 
                               value="${item.quantity}" 
                               min="1" 
                               max="999"
                               data-product-id="${item.productId}">
                        <button class="cart-qty-btn cart-qty-increase" data-product-id="${item.productId}">
                            <i class="bi bi-plus"></i>
                        </button>
                    </div>
                    <button class="cart-remove-btn" data-product-id="${item.productId}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    renderCartFooter(data) {
        return `
            <div class="cart-summary">
                <div class="cart-total-row">
                    <span class="cart-total-label">Стойност без ДДС:</span>
                    <span class="cart-total-value">${this.formatPrice(data.totalWithoutVat)} лв.</span>
                </div>
                <div class="cart-total-row">
                    <span class="cart-total-label">ДДС (20%):</span>
                    <span class="cart-total-value">${this.formatPrice(data.vatAmount)} лв.</span>
                </div>
                <div class="cart-total-row final">
                    <span class="cart-total-label">Общо с ДДС:</span>
                    <span class="cart-total-value">${this.formatPrice(data.totalWithVat)} лв.</span>
                </div>
            </div>
            <div class="cart-footer-actions">
                <a href="/cart" class="cart-checkout-btn" onclick="window.cartPanel.close()">
                    <i class="bi bi-credit-card"></i>
                    Завършване на поръчката
                </a>
                <a href="/catalog" class="cart-continue-btn" onclick="window.cartPanel.close()">
                    <i class="bi bi-arrow-left"></i>
                    Продължи пазаруването
                </a>
            </div>
        `;
    }

    bindCartEvents() {
        // Quantity decrease buttons
        this.content?.querySelectorAll('.cart-qty-decrease').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const productId = e.target.closest('[data-product-id]').dataset.productId;
                const input = this.content.querySelector(`.cart-qty-input[data-product-id="${productId}"]`);
                const currentValue = parseInt(input.value) || 1;

                if (currentValue > 1) {
                    const newQuantity = currentValue - 1;
                    input.value = newQuantity;
                    await this.updateQuantity(productId, newQuantity);
                }
            });
        });

        // Quantity increase buttons
        this.content?.querySelectorAll('.cart-qty-increase').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const productId = e.target.closest('[data-product-id]').dataset.productId;
                const input = this.content.querySelector(`.cart-qty-input[data-product-id="${productId}"]`);
                const currentValue = parseInt(input.value) || 1;

                if (currentValue < 999) {
                    const newQuantity = currentValue + 1;
                    input.value = newQuantity;
                    await this.updateQuantity(productId, newQuantity);
                }
            });
        });

        // Quantity input direct change
        this.content?.querySelectorAll('.cart-qty-input').forEach(input => {
            input.addEventListener('change', async (e) => {
                const productId = e.target.dataset.productId;
                let quantity = parseInt(e.target.value);

                // Validation
                if (isNaN(quantity) || quantity < 1) {
                    quantity = 1;
                } else if (quantity > 999) {
                    quantity = 999;
                }

                e.target.value = quantity;
                await this.updateQuantity(productId, quantity);
            });
        });

        // Remove buttons
        this.content?.querySelectorAll('.cart-remove-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const productId = e.target.closest('[data-product-id]').dataset.productId;
                await this.removeItem(productId);
            });
        });
    }

    async updateQuantity(productId, quantity) {
        try {
            const response = await fetch('/api/cart/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `productId=${productId}&quantity=${quantity}`,
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Обновява badge и презарежда съдържанието
                    window.cartManager?.updateBadge();
                    await this.loadCartContent();

                    window.toastManager?.success('Количеството е обновено');
                } else {
                    window.toastManager?.error(data.error || 'Грешка при обновяване');
                    await this.loadCartContent(); // Refresh за актуални данни
                }
            } else {
                window.toastManager?.error('Грешка при обновяване на количеството');
                await this.loadCartContent();
            }
        } catch (error) {
            console.error('Update quantity error:', error);
            window.toastManager?.error('Грешка при обновяване на количеството');
            await this.loadCartContent();
        }
    }

    async removeItem(productId) {
        try {
            const response = await fetch('/api/cart/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `productId=${productId}`,
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Обновява badge и презарежда съдържанието
                    window.cartManager?.updateBadge();
                    await this.loadCartContent();

                    window.toastManager?.success('Продуктът е премахнат от кошницата');
                } else {
                    window.toastManager?.error(data.error || 'Грешка при премахване');
                }
            } else {
                window.toastManager?.error('Грешка при премахване от кошницата');
            }
        } catch (error) {
            console.error('Remove item error:', error);
            window.toastManager?.error('Грешка при премахване от кошницата');
        }
    }

    // Utility methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatPrice(price) {
        return parseFloat(price || 0).toFixed(2);
    }
}

/**
 * GLOBAL FUNCTIONS FOR HTML onclick events
 * =========================================
 */
function toggleCartPanel() {
    if (window.cartPanel) {
        if (window.cartPanel.isOpen) {
            window.cartPanel.close();
        } else {
            window.cartPanel.open();
        }
    }
}

function closeCartPanel() {
    window.cartPanel?.close();
}

/**
 * INITIALIZATION
 * ==============
 */
document.addEventListener('DOMContentLoaded', function() {
    // Създава глобалния cart panel manager
    window.cartPanel = new CartPanelManager();

    // Обновява CartManager да отвори панела когато се добави продукт
    if (window.cartManager) {
        const originalAdd = window.cartManager.add.bind(window.cartManager);

        window.cartManager.add = async function(productId, quantity = 1) {
            await originalAdd(productId, quantity);

            // Отваря панела след успешно добавяне
            setTimeout(() => {
                window.cartPanel?.open();
            }, 500); // Малко забавяне за toast notification
        };
    }
});

/**
 * EXPORT FOR ES6 MODULES (ако се използва)
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CartPanelManager, toggleCartPanel, closeCartPanel };
}