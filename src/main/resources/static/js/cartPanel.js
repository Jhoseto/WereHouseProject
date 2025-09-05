/**
 * CART SLIDE-OUT PANEL MANAGER - FIXED VERSION
 * =============================================
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

        // Setup checkout handlers за modal buttons
        this.setupCheckoutHandlers();
    }

    /**
     * CSRF методи - копирани от cart.js
     */
    getCsrfToken() {
        const token = window.csrfToken || '';
        const header = window.csrfHeader || 'X-CSRF-TOKEN';

        if (!token) {
            console.warn('CSRF токен не е намерен в window.csrfToken');
        }

        return { token, header };
    }

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
                headers: this.getPostHeaders(), // FIXED: Добавен CSRF support
                body: `productId=${productId}&quantity=${quantity}`,
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Обнови badge и презареди съдържанието синхронно
                    window.toastManager?.success('Количеството е обновено');

                    // Използвай Promise.all за синхронно изпълнение
                    await Promise.all([
                        window.cartManager?.updateBadge(),
                        this.loadCartContent()
                    ]);
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
                headers: this.getPostHeaders(), // FIXED: Добавен CSRF support
                body: `productId=${productId}`,
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Обнови badge и презареди съдържанието синхронно
                    window.toastManager?.success('Продуктът е премахнат от кошницата');

                    // Използвай Promise.all за синхронно изпълнение
                    await Promise.all([
                        window.cartManager?.updateBadge(),
                        this.loadCartContent()
                    ]);
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

            // Покажи checkout модал
            this.showCheckoutModal(cartData);
        } catch (error) {
            console.error('Error initiating checkout:', error);
            window.toastManager?.error('Възникна грешка при зареждане на количката');
        }
    }

    async fetchCartData() {
        const response = await fetch('/api/cart/items', {
            credentials: 'include'
        });

        if (response.ok) {
            return await response.json();
        }
        throw new Error('Грешка при зареждане на количката');
    }

    showCheckoutModal(cartData) {
        // Затвори cart panel първо
        this.close(); // FIXED: Използва правилния метод

        const modal = document.createElement('div');
        modal.className = 'modal show checkout-modal-wrapper';
        modal.innerHTML = `
        <div class="modal-overlay" onclick="this.closest('.modal').remove()">
            <div class="modal-content checkout-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>
                        <i class="bi bi-credit-card"></i>
                        Потвърждаване на поръчката
                    </h3>
                    <button type="button" class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
                
                <div class="modal-body">
                    <div class="checkout-summary">
                        <h4>
                            <i class="bi bi-list-check"></i>
                            Обобщение на поръчката
                        </h4>
                        <div class="summary-items">
                            ${cartData.items.map(item => `
                                <div class="summary-item">
                                    <div class="item-details">
                                        <span class="item-name">${this.escapeHtml(item.productName)}</span>
                                        <span class="item-sku">${this.escapeHtml(item.productSku)}</span>
                                    </div>
                                    <span class="item-quantity">
                                        <i class="bi bi-box"></i>
                                        ${item.quantity} ${this.escapeHtml(item.productUnit || 'бр')}
                                    </span>
                                    <span class="item-total">
                                        <i class="bi bi-currency-exchange"></i>
                                        ${this.formatPrice(item.totalPrice)} лв
                                    </span>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div class="summary-totals">
                            <div class="total-row">
                                <span>
                                    <i class="bi bi-cash-stack"></i>
                                    Нето сума:
                                </span>
                                <span>${this.formatPrice(cartData.totalWithoutVat)} лв</span>
                            </div>
                            <div class="total-row">
                                <span>
                                    <i class="bi bi-percent"></i>
                                    ДДС (20%):
                                </span>
                                <span>${this.formatPrice(cartData.vatAmount)} лв</span>
                            </div>
                            <div class="total-row final-total">
                                <span>
                                    <i class="bi bi-calculator"></i>
                                    Общо с ДДС:
                                </span>
                                <strong>${this.formatPrice(cartData.totalWithVat)} лв</strong>
                            </div>
                        </div>
                    </div>
                    
                    <div class="checkout-notes">
                        <label for="orderNotes" class="notes-label">
                            <i class="bi bi-chat-left-text"></i>
                            Бележки към поръчката (по желание):
                        </label>
                        <textarea id="orderNotes" 
                                  class="form-control notes-textarea" 
                                  rows="4" 
                                  maxlength="500"
                                  placeholder="Добавете допълнителни указания или бележки за поръчката..."></textarea>
                        <small class="notes-counter">
                            <span id="notesCounter">0</span>/500 символа
                        </small>
                    </div>
                    
                    <div class="checkout-info">
                        <div class="info-box">
                            <i class="bi bi-info-circle info-icon"></i>
                            <div class="info-content">
                                <strong>Важно:</strong> След потвърждаване поръчката ще бъде изпратена за преглед и одобрение от нашия екип. 
                                Ще получите уведомление когато поръчката бъде обработена.
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline" onclick="this.closest('.modal').remove()">
                        <i class="bi bi-x-circle"></i>
                        Отказ
                    </button>
                    <button type="button" class="btn btn-success btn-large" id="confirmCheckoutBtn">
                        <i class="bi bi-check-circle"></i>
                        Потвърди поръчката
                    </button>
                </div>
            </div>
        </div>
    `;

        document.body.appendChild(modal);

        // Setup notes character counter
        const notesTextarea = modal.querySelector('#orderNotes');
        const notesCounter = modal.querySelector('#notesCounter');
        if (notesTextarea && notesCounter) {
            notesTextarea.addEventListener('input', () => {
                const length = notesTextarea.value.length;
                notesCounter.textContent = length;

                // Visual feedback for character limit
                if (length > 450) {
                    notesCounter.style.color = '#dc3545';
                } else if (length > 400) {
                    notesCounter.style.color = '#ffc107';
                } else {
                    notesCounter.style.color = '#6c757d';
                }
            });
        }

        // Setup confirm button
        const confirmBtn = modal.querySelector('#confirmCheckoutBtn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.confirmCheckout(modal);
            });
        }

        // Add modal animation
        setTimeout(() => {
            modal.classList.add('modal-show');
        }, 10);

        // Focus on notes textarea
        setTimeout(() => {
            if (notesTextarea) {
                notesTextarea.focus();
            }
        }, 300);
    }

    async confirmCheckout(modal) {
        const notesTextarea = modal.querySelector('#orderNotes');
        const notes = notesTextarea ? notesTextarea.value.trim() : '';
        const confirmBtn = modal.querySelector('#confirmCheckoutBtn');

        if (!confirmBtn) return;

        try {
            // Деактивиране на бутона и показване на loading
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = `
                <div class="loading-spinner">
                    <i class="bi bi-arrow-repeat"></i>
                </div>
                Обработване...
            `;

            const response = await fetch('/api/cart/checkout', {
                method: 'POST',
                headers: this.getPostHeaders(), // FIXED: Използва правилния CSRF метод
                body: notes ? `notes=${encodeURIComponent(notes)}` : '',
                credentials: 'include'
            });

            const result = await response.json();

            if (result.success) {
                // Покажи success състояние
                this.showCheckoutSuccess(modal, result);

                // Обнови badge след успешна поръчка
                await window.cartManager?.updateBadge();

                // Пренасочи към страницата с поръчката след кратко забавяне
                setTimeout(() => {
                    window.location.href = result.redirectUrl || '/orders';
                }, 2000);
            } else {
                throw new Error(result.message || 'Грешка при създаване на поръчката');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            window.toastManager?.error(error.message || 'Възникна грешка при създаване на поръчката');

            // Възстанови бутона
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = `
                <i class="bi bi-check-circle"></i>
                Потвърди поръчката
            `;
        }
    }

    showCheckoutSuccess(modal, result) {
        const modalBody = modal.querySelector('.modal-body');
        const modalFooter = modal.querySelector('.modal-footer');

        if (modalBody && modalFooter) {
            modalBody.innerHTML = `
                <div class="checkout-success">
                    <div class="success-animation">
                        <i class="bi bi-check-circle-fill success-icon"></i>
                    </div>
                    <h3 class="success-title">Поръчката е създадена успешно!</h3>
                    <p class="success-message">
                        Вашата поръчка №${result.orderId || 'N/A'} беше подадена успешно. 
                        Ще получите уведомление когато тя бъде разгледана от нашия екип.
                    </p>
                    <div class="success-actions">
                        <p class="redirect-info">
                            <i class="bi bi-arrow-right"></i>
                            Пренасочване към детайлите на поръчката...
                        </p>
                    </div>
                </div>
            `;

            modalFooter.innerHTML = `
                <button type="button" class="btn btn-outline" onclick="this.closest('.modal').remove()">
                    <i class="bi bi-house"></i>
                    Затвори
                </button>
                <a href="${result.redirectUrl || '/orders'}" class="btn btn-primary">
                    <i class="bi bi-eye"></i>
                    Виж поръчката
                </a>
            `;
        }

        // Покажи toast съобщение
        window.toastManager?.success('Поръчката е създадена успешно');
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
 * INITIALIZATION - САМО CART PANEL
 * ===============================
 */
document.addEventListener('DOMContentLoaded', function() {
    // Създава глобалния cart panel manager
    window.cartPanel = new CartPanelManager();
    console.log('CartPanelManager инициализиран успешно');
});