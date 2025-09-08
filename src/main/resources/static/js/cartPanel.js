/**
 * OPTIMIZED CART PANEL - ИНКРЕМЕНТАЛНИ DOM UPDATES
 * ===============================================
 */
class CartPanel {
    constructor() {
        this.panel = document.getElementById('cartPanel');
        this.overlay = document.getElementById('cartPanelOverlay');
        this.content = document.getElementById('cartPanelContent');
        this.footer = document.getElementById('cartPanelFooter');
        this.isOpen = false;

        // Cache за текущите данни
        this.currentData = null;
        this.itemElements = new Map(); // Map за бързо намиране на DOM елементи

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupCheckoutHandlers();
    }

    setupEventListeners() {
        // ESC key затваря панела
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Click извън панела го затваря
        this.overlay?.addEventListener('click', () => {
            this.close();
        });

        // Prevent scroll на body когато панела е отворен
        this.panel?.addEventListener('wheel', (e) => {
            e.stopPropagation();
        }, { passive: true });
    }

    /**
     * Отваря cart панела
     */
    async open() {
        if (!this.panel || !this.overlay) {
            console.error('Cart panel elements не са намерени');
            return;
        }

        this.isOpen = true;
        this.overlay.classList.add('active');
        this.panel.classList.add('active');

        // Disable body scroll
        document.body.style.overflow = 'hidden';

        // Зарежда съдържанието
        await this.loadCartContent();
    }

    /**
     * Затваря cart панела
     */
    close() {
        if (!this.panel || !this.overlay) return;

        this.isOpen = false;
        this.overlay.classList.remove('active');
        this.panel.classList.remove('active');

        // Enable body scroll
        document.body.style.overflow = '';
    }

    /**
     * Получава CSRF токена
     */
    getCsrfToken() {
        const token = window.csrfToken || '';
        const header = window.csrfHeader || 'X-CSRF-TOKEN';
        return { token, header };
    }

    /**
     * Създава headers за POST заявки
     */
    getPostHeaders() {
        const csrf = this.getCsrfToken();
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };

        if (csrf.token) {
            headers[csrf.header] = csrf.token;
        }

        return headers;
    }

    /**
     * OPTIMIZED зареждане - инкрементални updates
     */
    async loadCartContent() {
        if (!this.content) return;

        try {
            const data = await this.fetchCartData();

            if (!data) {
                this.renderError();
                return;
            }

            // Проверява дали има промени преди да обновява DOM
            if (this.hasDataChanged(data)) {
                this.updateContent(data);
                this.currentData = data;
            }

        } catch (error) {
            console.error('Error loading cart content:', error);
            this.renderError();
        }
    }

    /**
     * Проверява дали данните са се променили
     */
    hasDataChanged(newData) {
        if (!this.currentData) return true;

        // Бърза проверка за промени
        if (this.currentData.items.length !== newData.items.length) return true;
        if (this.currentData.totalWithVat !== newData.totalWithVat) return true;

        // Проверка за промени в артикулите
        for (let i = 0; i < newData.items.length; i++) {
            const newItem = newData.items[i];
            const oldItem = this.currentData.items[i];

            if (!oldItem ||
                oldItem.productId !== newItem.productId ||
                oldItem.quantity !== newItem.quantity ||
                oldItem.pricePerUnit !== newItem.pricePerUnit) {
                return true;
            }
        }

        return false;
    }

    /**
     * OPTIMIZED обновяване на съдържанието
     */
    updateContent(data) {
        if (data.items.length === 0) {
            this.renderEmptyCart();
            this.renderFooter(null);
            return;
        }

        this.renderCartItems(data.items);
        this.renderFooter(data);
        this.bindCartEvents();
    }

    /**
     * ИНКРЕМЕНТАЛНО обновяване на артикулите
     */
    renderCartItems(items) {
        if (!this.content) return;

        // Създава container ако не съществува
        let itemsContainer = this.content.querySelector('.cart-items-container');
        if (!itemsContainer) {
            itemsContainer = document.createElement('div');
            itemsContainer.className = 'cart-items-container';
            this.content.innerHTML = '';
            this.content.appendChild(itemsContainer);
        }

        const newItemIds = new Set(items.map(item => item.productId));
        const existingItemIds = new Set(this.itemElements.keys());

        // Премахва изтрити артикули
        for (const productId of existingItemIds) {
            if (!newItemIds.has(productId)) {
                const element = this.itemElements.get(productId);
                if (element) {
                    element.remove();
                    this.itemElements.delete(productId);
                }
            }
        }

        // Добавя или обновява артикули
        items.forEach((item, index) => {
            const existingElement = this.itemElements.get(item.productId);

            if (existingElement) {
                // Обновява съществуващ артикул
                this.updateCartItem(existingElement, item);
            } else {
                // Създава нов артикул
                const itemElement = this.createCartItemElement(item);
                this.itemElements.set(item.productId, itemElement);
                itemsContainer.appendChild(itemElement);

                // Анимация за нови артикули
                setTimeout(() => {
                    itemElement.classList.add('fade-in');
                }, 50);
            }
        });
    }

    /**
     * Създава DOM елемент за артикул
     */
    createCartItemElement(item) {
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.dataset.productId = item.productId;
        div.innerHTML = this.renderCartItem(item);
        return div;
    }

    /**
     * Обновява съществуващ артикул
     */
    updateCartItem(element, item) {
        // Обновява количеството
        const qtyInput = element.querySelector('.cart-qty-input');
        if (qtyInput && qtyInput.value !== item.quantity.toString()) {
            qtyInput.value = item.quantity;
        }

        // Обновява цената ако се е променила
        const priceElement = element.querySelector('.cart-item-price');
        const newPrice = `${this.formatPrice(item.pricePerUnit)} лв.`;
        if (priceElement && priceElement.textContent !== newPrice) {
            priceElement.textContent = newPrice;
        }
    }

    async fetchCartData() {
        const response = await fetch('/api/cart/items', {
            credentials: 'include'
        });

        if (response.ok) {
            return await response.json();
        }
        return null;
    }

    renderCartItem(item) {
        return `
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
        `;
    }

    renderFooter(data) {
        if (!this.footer) return;

        if (!data || !data.items || data.items.length === 0) {
            this.footer.innerHTML = '';
            return;
        }

        this.footer.innerHTML = `
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
            <button type="button" class="cart-continue-btn" onclick="window.cartPanel.close()">
                <i class="bi bi-bag-plus"></i>
                Продължи пазаруването
            </button>
            <button type="button" class="cart-checkout-btn" id="cartCheckoutBtn">
                <i class="bi bi-credit-card"></i>
                Потвърди поръчката
            </button>
        </div>
    `;
    }

    renderEmptyCart() {
        if (!this.content) return;

        this.content.innerHTML = `
            <div class="cart-empty">
                <div class="cart-empty-icon">
                    <i class="bi bi-cart3"></i>
                </div>
                <p class="cart-empty-message">Вашата количка е празна</p>
                <p class="cart-empty-subtitle">Добавете артикули от каталога</p>
            </div>
        `;
        this.itemElements.clear();
    }

    renderError() {
        if (!this.content) return;

        this.content.innerHTML = `
            <div class="cart-error">
                <div class="cart-error-icon">
                    <i class="bi bi-exclamation-triangle"></i>
                </div>
                <p class="cart-error-message">Възникна грешка при зареждане</p>
                <button class="btn btn-primary" onclick="window.cartPanel.loadCartContent()">
                    Опитай отново
                </button>
            </div>
        `;
        this.itemElements.clear();
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

    /**
     * OPTIMIZED обновяване на количество - използва cartManager
     */
    async updateQuantity(productId, quantity) {
        try {
            const success = await window.cartManager?.updateQuantity(productId, quantity);

            if (success) {
                // Показва toast само при успех
                window.toastManager?.success('Количеството е обновено');

                // Обновява само badge, не презарежда цялото съдържание
                await window.cartManager?.updateBadge();

                // Обновява локалния елемент веднага за по-бърз отклик
                const element = this.itemElements.get(productId);
                if (element) {
                    const qtyInput = element.querySelector('.cart-qty-input');
                    if (qtyInput) {
                        qtyInput.value = quantity;
                    }
                }

                // Обновява общите суми асинхронно
                setTimeout(() => {
                    this.loadCartContent();
                }, 500);
            } else {
                // При грешка презарежда за актуални данни
                await this.loadCartContent();
            }
        } catch (error) {
            console.error('Update quantity error:', error);
            window.toastManager?.error('Грешка при обновяване на количеството');
            await this.loadCartContent();
        }
    }

    /**
     * OPTIMIZED премахване на артикул
     */
    async removeItem(productId) {
        try {
            const success = await window.cartManager?.remove(productId);

            if (success) {
                // Премахва елемента веднага за бърз отклик
                const element = this.itemElements.get(productId);
                if (element) {
                    element.classList.add('removing');
                    setTimeout(() => {
                        element.remove();
                        this.itemElements.delete(productId);

                        // Проверява дали има още артикули
                        if (this.itemElements.size === 0) {
                            this.renderEmptyCart();
                            this.renderFooter(null);
                        }
                    }, 300);
                }

                // Обновява badge
                await window.cartManager?.updateBadge();

                // Обновява общите суми асинхронно
                setTimeout(() => {
                    this.loadCartContent();
                }, 500);
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

    setupCheckoutHandlers() {
        // Checkout button handler - използва event delegation
        document.addEventListener('click', (e) => {
            if (e.target.closest('#cartCheckoutBtn')) {
                e.preventDefault();
                this.initiateCheckout();
            }
        });
    }

    async initiateCheckout() {
        try {
            // Проверка дали има артикули в количката
            const cartData = await this.fetchCartData();
            if (!cartData.items || cartData.items.length === 0) {
                window.toastManager?.error('Количката е празна');
                return;
            }

            // Валидация на наличности
            const hasStockIssues = cartData.items.some(item => item.hasStockIssue);
            if (hasStockIssues) {
                window.toastManager?.warning('Някои артикули нямат достатъчно наличност');
                return;
            }

            // Показва checkout модал
            this.showCheckoutModal(cartData);
        } catch (error) {
            console.error('Error initiating checkout:', error);
            window.toastManager?.error('Възникна грешка при зареждане на количката');
        }
    }

    showCheckoutModal(cartData) {
        const modal = document.createElement('div');
        modal.className = 'checkout-modal-overlay';
        modal.innerHTML = `
            <div class="checkout-modal">
                <div class="modal-header">
                    <h3><i class="bi bi-credit-card"></i> Потвърждение на поръчката</h3>
                    <button class="modal-close" onclick="this.closest('.checkout-modal-overlay').remove(); document.body.style.overflow='';">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="checkout-summary">
                        <h4>Преглед на поръчката</h4>
                        <div class="summary-items">
                            ${cartData.items.map(item => `
                                <div class="summary-item">
                                    <div class="item-details">
                                        <strong>${this.escapeHtml(item.productName)}</strong>
                                        <span class="item-sku">Код: ${this.escapeHtml(item.productSku)}</span>
                                    </div>
                                    <div class="item-quantity">
                                        ${item.quantity} бр. × ${this.formatPrice(item.pricePerUnit)} лв.
                                    </div>
                                    <div class="item-total">
                                        ${this.formatPrice(item.quantity * item.pricePerUnit)} лв.
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="summary-totals">
                            <div class="total-row">
                                <span>Без ДДС:</span>
                                <span>${this.formatPrice(cartData.totalWithoutVat)} лв.</span>
                            </div>
                            <div class="total-row">
                                <span>ДДС (20%):</span>
                                <span>${this.formatPrice(cartData.vatAmount)} лв.</span>
                            </div>
                            <div class="total-row final">
                                <span><strong>Общо с ДДС:</strong></span>
                                <span><strong>${this.formatPrice(cartData.totalWithVat)} лв.</strong></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="checkout-notes">
                        <label for="orderNotes">Забележки към поръчката (незадължително):</label>
                        <textarea id="orderNotes" placeholder="Въведете допълнителни инструкции..."></textarea>
                    </div>
                    
                    <div class="checkout-actions">
                        <button class="btn btn-outline" onclick="this.closest('.checkout-modal-overlay').remove(); document.body.style.overflow='';">
                            <i class="bi bi-arrow-left"></i>
                            Назад
                        </button>
                        <button class="btn btn-success" onclick="window.cartPanel.submitOrder()">
                            <i class="bi bi-check-circle"></i>
                            Потвърди поръчката
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            const textarea = modal.querySelector('#orderNotes');
            textarea?.focus();
        }, 100);
    }

    async submitOrder() {
        const modal = document.querySelector('.checkout-modal-overlay');
        const submitBtn = modal?.querySelector('.btn-success');
        const notesTextarea = modal?.querySelector('#orderNotes');

        if (!submitBtn) return;

        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Обработване...';

        try {
            const notes = notesTextarea?.value?.trim() || '';

            const response = await fetch('/api/cart/checkout', {
                method: 'POST',
                headers: this.getPostHeaders(),
                body: `notes=${encodeURIComponent(notes)}`,
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    window.toastManager?.success(data.message || 'Поръчката е създадена успешно!');

                    modal.remove();
                    document.body.style.overflow = '';
                    this.close();

                    await window.cartManager?.updateBadge();

                    if (data.redirectUrl) {
                        setTimeout(() => {
                            window.location.href = data.redirectUrl;
                        }, 1000);
                    }
                } else {
                    window.toastManager?.error(data.message || 'Грешка при създаване на поръчката');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            } else {
                throw new Error('Server error');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            window.toastManager?.error('Възникна грешка при създаване на поръчката');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }
}

/**
 * ГЛОБАЛНИ ФУНКЦИИ ЗА СЪВМЕСТИМОСТ
 * ===============================
 */

/**
 * Отваря/затваря cart панела - глобална функция за HTML onclick
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

/**
 * Затваря cart панела - глобална функция за HTML onclick
 */
function closeCartPanel() {
    window.cartPanel?.close();
}

/**
 * Глобална функция за изпращане на поръчка от checkout модала
 */
function submitOrder() {
    window.cartPanel?.submitOrder();
}

/**
 * INITIALIZATION
 * =============
 */
document.addEventListener('DOMContentLoaded', function() {
    // Създава глобалния cart panel
    window.cartPanel = new CartPanel();
    console.log('CartPanel инициализиран успешно');
});