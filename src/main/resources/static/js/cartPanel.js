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

        // Добави CSRF token support
        this.csrfToken = window.csrfToken || '';
        this.csrfHeader = window.csrfHeader || 'X-CSRF-TOKEN';

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
                const checkoutBtn = this.footer?.querySelector('#cartCheckoutBtn');
                if (checkoutBtn) {
                    checkoutBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.initiateCheckout();
                    });
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

    setupCheckoutHandlers() {
        // Checkout button
        document.addEventListener('click', (e) => {
            if (e.target.closest('#cartCheckoutBtn')) {
                e.preventDefault();
                this.initiateCheckout();
            }
        });

        // Continue shopping
        document.addEventListener('click', (e) => {
            if (e.target.closest('.cart-continue-shopping')) {
                e.preventDefault();
                this.closePanel();
            }
        });
    }

    async initiateCheckout() {
        try {
            // Проверка дали има артикули в количката
            const cartData = await this.fetchCartData();
            if (!cartData.items || cartData.items.length === 0) {
                this.showToast('error', 'Грешка', 'Количката е празна');
                return;
            }

            // Валидация на наличности
            const hasStockIssues = cartData.items.some(item => item.hasStockIssue);
            if (hasStockIssues) {
                this.showToast('warning', 'Внимание', 'Някои артикули нямат достатъчно наличност');
                return;
            }

            // Покажи checkout модал
            this.showCheckoutModal(cartData);
        } catch (error) {
            console.error('Error initiating checkout:', error);
            this.showToast('error', 'Грешка', 'Възникна грешка при зареждане на количката');
        }
    }

    showCheckoutModal(cartData) {
        // Затвори cart panel първо
        this.closePanel();

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
                    <!-- Order Summary -->
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
                    
                    <!-- Notes Section -->
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
                    
                    <!-- Order Info -->
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
                this.confirmCheckout();
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

    async confirmCheckout() {
        const modal = document.querySelector('.checkout-modal-wrapper');
        const notesTextarea = document.getElementById('orderNotes');
        const notes = notesTextarea ? notesTextarea.value.trim() : '';
        const confirmBtn = document.getElementById('confirmCheckoutBtn');

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

            // Добави loading клас за анимация
            confirmBtn.classList.add('loading');

            const response = await fetch('/api/cart/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    [this.csrfHeader]: this.csrfToken
                },
                body: notes ? `notes=${encodeURIComponent(notes)}` : ''
            });

            const result = await response.json();

            if (result.success) {
                // Покажи success състояние
                this.showCheckoutSuccess(modal, result);

                // Изчисти количката
                await this.refreshCart();

                // Пренасочи към страницата с поръчката след кратко забавяне
                setTimeout(() => {
                    window.location.href = result.redirectUrl || '/orders';
                }, 2000);
            } else {
                throw new Error(result.message || 'Грешка при създаване на поръчката');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            this.showToast('error', 'Грешка', error.message || 'Възникна грешка при създаване на поръчката');

            // Възстанови бутона
            confirmBtn.disabled = false;
            confirmBtn.classList.remove('loading');
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
        this.showToast('success', 'Успешно!', 'Поръчката е създадена успешно');
    }

// Допълнителни helper методи за checkout
    validateCheckoutData(cartData) {
        if (!cartData || !cartData.items || cartData.items.length === 0) {
            throw new Error('Количката е празна');
        }

        const hasInvalidItems = cartData.items.some(item =>
            !item.productId ||
            !item.quantity ||
            item.quantity <= 0 ||
            !item.pricePerUnit ||
            item.pricePerUnit <= 0
        );

        if (hasInvalidItems) {
            throw new Error('Има невалидни артикули в количката');
        }

        return true;
    }

    formatCheckoutPrice(price) {
        return parseFloat(price || 0).toFixed(2);
    }

// CSS стилове за checkout модала (добави в checkout.css или main.css)
    addCheckoutStyles() {
        const style = document.createElement('style');
        style.textContent = `
        .checkout-modal-wrapper.modal-show .modal-content {
            opacity: 1;
            transform: translateY(0);
        }
        
        .loading-spinner i {
            animation: spin 1s linear infinite;
        }
        
        .btn.loading {
            pointer-events: none;
            opacity: 0.7;
        }
        
        .success-animation {
            text-align: center;
            margin-bottom: 2rem;
        }
        
        .success-icon {
            font-size: 4rem;
            color: #28a745;
            animation: successPulse 0.6s ease-in-out;
        }
        
        @keyframes successPulse {
            0% { transform: scale(0); opacity: 0; }
            50% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
        }
        
        .checkout-success {
            text-align: center;
            padding: 2rem;
        }
        
        .success-title {
            color: #28a745;
            margin-bottom: 1rem;
        }
        
        .success-message {
            color: #6c757d;
            line-height: 1.6;
            margin-bottom: 2rem;
        }
        
        .redirect-info {
            color: #17a2b8;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        }
    `;
        document.head.appendChild(style);
    }

    async initiateCheckout() {
        try {
            // Проверка дали има артикули в количката
            const cartData = await this.fetchCartData();
            if (!cartData.items || cartData.items.length === 0) {
                this.showToast('error', 'Грешка', 'Количката е празна');
                return;
            }

            // Валидация на наличности
            const hasStockIssues = cartData.items.some(item => item.hasStockIssue);
            if (hasStockIssues) {
                this.showToast('warning', 'Внимание', 'Някои артикули нямат достатъчно наличност');
                return;
            }

            // Покажи checkout модал
            this.showCheckoutModal(cartData);
        } catch (error) {
            console.error('Error initiating checkout:', error);
            this.showToast('error', 'Грешка', 'Възникна грешка при зареждане на количката');
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
        this.close();

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
                    <!-- Order Summary -->
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
                    
                    <!-- Notes Section -->
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
                    
                    <!-- Order Info -->
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
                this.confirmCheckout();
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

    async confirmCheckout() {
        const modal = document.querySelector('.checkout-modal-wrapper');
        const notesTextarea = document.getElementById('orderNotes');
        const notes = notesTextarea ? notesTextarea.value.trim() : '';
        const confirmBtn = document.getElementById('confirmCheckoutBtn');

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
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    [this.csrfHeader]: this.csrfToken
                },
                body: notes ? `notes=${encodeURIComponent(notes)}` : ''
            });

            const result = await response.json();

            if (result.success) {
                // Покажи success състояние
                this.showCheckoutSuccess(modal, result);

                // Изчисли количката
                window.cartManager?.updateBadge();

                // Пренасочи към страницата с поръчката след кратко забавяне
                setTimeout(() => {
                    window.location.href = result.redirectUrl || '/orders';
                }, 2000);
            } else {
                throw new Error(result.message || 'Грешка при създаване на поръчката');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            this.showToast('error', 'Грешка', error.message || 'Възникна грешка при създаване на поръчката');

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
        this.showToast('success', 'Успешно!', 'Поръчката е създадена успешно');
    }

    showToast(type, title, message, duration = 4000) {
        // Use the existing toast system if available
        if (window.Toast && window.Toast[type]) {
            window.Toast[type](title, message, duration);
        } else if (window.toastManager && window.toastManager[type]) {
            window.toastManager[type](message);
        } else {
            // Fallback
            console.log(`${type.toUpperCase()}: ${title} - ${message}`);
            alert(`${title}: ${message}`);
        }
    }

// Инициализирай checkout стиловете при зареждане
    initCheckout() {
        this.addCheckoutStyles();
        console.log('Checkout functionality initialized');
    }

    setupEventListeners() {
        // Слуша за промени в localStorage от други табове (ако е нужно)
        window.addEventListener('storage', (e) => {
            if (e.key === 'cart_updated') {
                this.updateBadge();
            }
        });
        this.setupCheckoutHandlers();
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