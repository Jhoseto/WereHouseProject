/**
 * DASHBOARD UI - USER INTERFACE OPERATIONS
 * ========================================
 * Handles all visual updates and user interactions
 * Manages DOM manipulation, animations, and modal dialogs
 * Provides clean interface for UI state management
 *
 * REFACTORED VERSION - All HTTP requests moved to DashboardApi
 * Fixed status mapping issues and architectural concerns
 */

class DashboardUI {
    constructor() {
        this.manager = null; // Will be set when DashboardManager is connected

        // DOM element cache for performance
        this.elements = {};

        // Modal state management
        this.activeModal = null;
        this.rejectionContext = null;

        // Animation and transition settings
        this.animationDuration = 300;

        // Status to tab mapping - CORRECTED MAPPING
        this.statusToTabMapping = {
            'urgent': 'urgent',
            'pending': 'pending',     // ПРОМЕНЕНО: беше 'warning'
            'confirmed': 'confirmed', // ПРОМЕНЕНО: беше 'info'
            'cancelled': 'cancelled', // ПРОМЕНЕНО: беше 'danger'
            'activity': 'activity'
        };

        console.log('DashboardUI initialized');
    }

    /**
     * Initialize UI components and cache DOM elements
     */
    initialize() {
        try {
            console.log('=== DashboardUI Initialization ===');

            this.cacheElements();
            this.setupEventListeners();
            this.setupKeyboardShortcuts();
            this.setupTouchGestures();

            console.log('✓ DashboardUI initialized successfully');

        } catch (error) {
            console.error('Failed to initialize DashboardUI:', error);
        }
    }

    /**
     * Connect the dashboard manager for data operations
     */
    setManager(manager) {
        this.manager = manager;
        console.log('✓ Dashboard Manager connected to UI');
    }

    /**
     * Cache frequently used DOM elements to avoid repeated queries
     */
    cacheElements() {
        this.elements = {
            // Counter elements - ОПРАВЕНИ ID-ТА
            urgentCount: document.getElementById('urgent-tab-count'),
            pendingCount: document.getElementById('pending-tab-count'),
            confirmedCount: document.getElementById('confirmed-tab-count'),
            cancelledCount: document.getElementById('cancelled-tab-count'),

            // Badge elements - ОПРАВЕНИ ID-ТА
            urgentBadge: document.getElementById('urgent-badge'),
            pendingBadge: document.getElementById('pending-badge'),
            confirmedBadge: document.getElementById('confirmed-badge'),
            cancelledBadge: document.getElementById('cancelled-badge'),

            // Tab navigation
            tabButtons: document.querySelectorAll('.tab-btn'),
            tabContents: document.querySelectorAll('.tab-content'),
            statusItems: document.querySelectorAll('.status-item'),

            // Modal elements - INTEGRATED FROM HTML
            rejectionModal: document.getElementById('rejection-modal'),
            customReason: document.getElementById('custom-reason'),

            // Content areas
            content: document.querySelector('.content')
        };

        console.log('✓ DOM elements cached');
    }

    /**
     * Set up event listeners for UI interactions
     */
    setupEventListeners() {
        // Tab button clicks
        this.elements.tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = btn.dataset.tab;
                if (this.manager) {
                    this.manager.switchTab(tabName);
                }
            });
        });

        // Status item clicks (top bar navigation) - FIXED MAPPING
        this.elements.statusItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const tabMap = {
                    'urgent': 'urgent',
                    'warning': 'pending',
                    'info': 'confirmed',    // FIXED: was 'ready'
                    'danger': 'cancelled',  // ADDED: was missing
                    'success': 'activity'
                };

                const classList = Array.from(item.classList);
                const statusClass = classList.find(cls => tabMap[cls]);

                if (statusClass && this.manager) {
                    this.manager.switchTab(tabMap[statusClass]);
                }
            });
        });

        // Modal overlay clicks (close modal) - INTEGRATED FROM HTML
        if (this.elements.rejectionModal) {
            this.elements.rejectionModal.addEventListener('click', (e) => {
                if (e.target === this.elements.rejectionModal) {
                    this.closeRejectionModal();
                }
            });
        }

        console.log('✓ Event listeners set up');
    }

    // ==========================================
    // COUNTER AND STATS UPDATES
    // ==========================================

    updateCounters(data) {
        try {
            console.log('UI updating counters with:', data);

            // ТОЧНИ DOM ID-та от HTML
            const urgentEl = document.getElementById('urgent-tab-count');
            const pendingEl = document.getElementById('pending-tab-count');
            const confirmedEl = document.getElementById('confirmed-tab-count');
            const cancelledEl = document.getElementById('cancelled-tab-count');

            // ТОЧНИ field names от server data
            if (urgentEl) urgentEl.textContent = data.urgentCount || 0;
            if (pendingEl) pendingEl.textContent = data.pendingCount || 0;
            if (confirmedEl) confirmedEl.textContent = data.completedCount || 0;
            if (cancelledEl) cancelledEl.textContent = data.cancelledCount || 0;

            console.log('✓ Counters updated successfully');

        } catch (error) {
            console.error('Error updating counters:', error);
        }
    }

    animateCounter(element, targetValue) {
        if (!element) return;

        const currentValue = parseInt(element.textContent) || 0;
        const difference = targetValue - currentValue;
        const duration = Math.min(500, Math.abs(difference) * 50);
        const steps = Math.max(10, Math.abs(difference));
        const stepValue = difference / steps;
        const stepDuration = duration / steps;

        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep++;
            const newValue = Math.round(currentValue + (stepValue * currentStep));
            element.textContent = newValue;

            if (currentStep >= steps) {
                clearInterval(timer);
                element.textContent = targetValue;
            }
        }, stepDuration);
    }

    updateBadge(element, newValue) {
        if (!element) return;

        const oldValue = parseInt(element.textContent) || 0;
        element.textContent = newValue;

        if (newValue > oldValue) {
            element.style.animation = 'pulse 0.5s ease-in-out';
            setTimeout(() => {
                element.style.animation = '';
            }, 500);
        }
    }

    updateDailyStats(dailyStats) {
        try {
            const statElements = {
                processed: document.querySelector('#orders-processed'),
                revenue: document.querySelector('#total-revenue'),
                avgTime: document.querySelector('#avg-time'),
                activeClients: document.querySelector('#active-clients')
            };

            if (statElements.processed) statElements.processed.textContent = dailyStats.processed;
            if (statElements.revenue) statElements.revenue.textContent = dailyStats.revenue;
            if (statElements.avgTime) statElements.avgTime.textContent = dailyStats.avgTime;
            if (statElements.activeClients) statElements.activeClients.textContent = dailyStats.activeClients;

            console.log('✓ Daily stats updated');

        } catch (error) {
            console.error('Error updating daily stats:', error);
        }
    }

    // ==========================================
    // TAB MANAGEMENT
    // ==========================================

    updateTabUI(activeTab, previousTab) {
        try {
            this.elements.tabButtons.forEach(btn => {
                if (btn.dataset.tab === activeTab) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            this.elements.tabContents.forEach(content => {
                if (content.id === `${activeTab}-tab`) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });

            this.updateStatusBarSelection(activeTab);

            console.log(`✓ Tab UI updated: ${previousTab} → ${activeTab}`);

        } catch (error) {
            console.error('Error updating tab UI:', error);
        }
    }

    updateStatusBarSelection(tabName) {
        // ДОБАВИ проверка да не прави ненужни промени
        if (this.lastSelectedTab === tabName) return;

        this.elements.statusItems.forEach(item => {
            item.style.background = '';
        });

        const statusClass = this.statusToTabMapping[tabName];
        if (statusClass) {
            const statusItem = document.querySelector(`.status-item.${statusClass}`);
            if (statusItem) {
                const colors = {
                    'urgent': 'rgba(231, 76, 60, 0.1)',
                    'pending': 'rgba(243, 156, 18, 0.1)',
                    'confirmed': 'rgba(52, 152, 219, 0.1)',
                    'cancelled': 'rgba(220, 53, 69, 0.1)',
                    'activity': 'rgba(39, 174, 96, 0.1)'
                };
                statusItem.style.background = colors[statusClass] || '';
            }
        }

        this.lastSelectedTab = tabName;
    }

    // ==========================================
    // ORDER CONTENT - EXPANDABLE DETAILS WITH FULL INTEGRATION
    // ==========================================

    updateTabContent(tabName, orders) {
        const safeOrders = Array.isArray(orders) ? orders : [];
        console.log(`Updating tab ${tabName} with ${safeOrders.length} orders`);

        try {
            const tabElement = document.querySelector(`#${tabName}-tab .panel-content`);
            if (!tabElement) {
                console.warn(`⚠️ Tab element for '${tabName}' not found!`);
                return;
            }

            // Clear existing content to prevent duplicate entries
            tabElement.innerHTML = "";

            // Show empty state when no orders are available
            if (safeOrders.length === 0) {
                tabElement.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #888;">
                    <i class="bi bi-inbox" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    <p>Няма намерени поръчки за този статус</p>
                </div>
            `;
                return;
            }

            // Generate order cards with navigation functionality
            safeOrders.forEach((order, index) => {
                const orderElement = document.createElement("div");
                orderElement.className = "order-item";
                orderElement.dataset.orderId = order.id || index;

                // Extract order data with fallback values for robustness
                const orderId = order.id || "N/A";
                const customerName = order.customerName || order.customerInfo || "Неизвестен клиент";
                const status = order.status || "Неизвестен статус";
                const submittedAt = order.submittedAt
                    ? this.formatOrderTime(order.submittedAt)
                    : "Неизвестно време";
                const priority = this.getOrderPriority(order);

                // Generate HTML with new clickable navigation structure
                orderElement.innerHTML = `
                <div class="order-summary clickable-order" data-order-id="${order.id}">
                    <div class="order-priority priority-${priority}"></div>
                    <div class="order-info">
                        <div class="order-header">
                            <div class="order-number">#${orderId}</div>
                            <div class="order-time">${submittedAt}</div>
                        </div>
                        <div class="order-client">${customerName}</div>
                        <div class="order-meta">
                            <span>Статус: ${status}</span>
                            <div class="review-indicator">
                                <i class="bi bi-arrow-right-circle review-arrow"></i>
                                <span class="review-text">Review</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;

                // Add navigation event listener to replace old expand/collapse functionality
                const clickableOrder = orderElement.querySelector('.clickable-order');
                if (clickableOrder) {
                    clickableOrder.addEventListener('click', (e) => {
                        e.preventDefault();

                        // Extract order ID and validate it exists
                        const orderIdToReview = clickableOrder.dataset.orderId;
                        if (!orderIdToReview || orderIdToReview === 'undefined') {
                            console.error('Invalid order ID for navigation:', orderIdToReview);
                            if (window.toastManager) {
                                window.toastManager.error('Unable to open order review. Invalid order ID.');
                            }
                            return;
                        }

                        console.log(`Navigating to order review for order ${orderIdToReview}`);

                        // Navigate to the new order review interface
                        window.location.href = `/employer/dashboard/order/${orderIdToReview}/detailOrder`;
                    });
                }

                // Add the completed order element to the tab container
                tabElement.appendChild(orderElement);
            });

            console.log(`✅ ${tabName} tab content updated with ${safeOrders.length} orders`);

        } catch (err) {
            console.error(`❌ Error updating ${tabName} tab content:`, err);

            // Show error state to user if something goes wrong
            const tabElement = document.querySelector(`#${tabName}-tab .panel-content`);
            if (tabElement) {
                tabElement.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #dc3545;">
                    <i class="bi bi-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    <p>Грешка при зареждане на поръчките. Моля опитайте отново.</p>
                </div>
            `;
            }
        }
    }

    // ==========================================
    // COMPATIBILITY METHODS FOR DASHBOARD MANAGER
    // ==========================================

    /**
     * Alias method for backward compatibility with DashboardManager
     */
    updateOrdersList(tabName, orders) {
        console.log(`updateOrdersList called for tab: ${tabName} with ${orders?.length || 0} orders`);
        return this.updateTabContent(tabName, orders);
    }

    generateOrderActions(order, tabContext) {
        const actions = {
            'urgent': `<button class="order-action action-confirm" onclick="confirmOrder(${order.id})">
                        <i class="bi bi-check-circle"></i> Потвърди
                       </button>
                       <button class="order-action action-reject" onclick="rejectEntireOrder(${order.id})">
                        <i class="bi bi-x-circle"></i> Отказ
                       </button>`,
            'pending': `<button class="order-action action-pick" onclick="startPicking(${order.id})">
                        <i class="bi bi-box-seam"></i> Пикинг
                        </button>`,
            'confirmed': `<button class="order-action action-ship" onclick="shipOrder(${order.id})">
                         <i class="bi bi-truck"></i> Изпрати
                        </button>`,
            'cancelled': '',
            'activity': ''
        };

        return actions[tabContext] || '';
    }


    /**
     * Load order items via API - REFACTORED TO USE API
     */
    // Замени loadOrderItems метода в dashboardUI.js (около ред 500-530)

    async loadOrderItems(orderId) {
        const productList = document.getElementById(`product-list-${orderId}`);

        try {
            let result = null;

            // Опитай API методите
            if (this.manager?.api?.getOrderDetailsWithItems) {
                result = await this.manager.api.getOrderDetailsWithItems(orderId);
            } else if (this.manager?.api?.getOrderDetails) {
                result = await this.manager.api.getOrderDetails(orderId);
            } else {
                // Fallback към direct fetch
                const response = await fetch(`/employer/dashboard/order/${orderId}/detailOrder`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                result = await response.json();
            }

            // Обработи response-а правилно
            let orderData = null;
            if (result.success && result.order) {
                orderData = result.order;
            } else if (result.data) {
                orderData = result.data;
            } else if (result.id) {
                orderData = result;
            }

            if (orderData && orderData.items) {
                // Инициализирай state management ако има manager
                if (this.manager && typeof this.manager.initOrderState === 'function') {
                    this.manager.initOrderState(orderId, orderData);
                }

                this.displayOrderItems(orderId, orderData);
            } else {
                productList.innerHTML = '<div class="error-message">Няма данни за артикули</div>';
            }

        } catch (error) {
            console.error('Error loading order items:', error);
            productList.innerHTML = '<div class="error-message">Грешка при зареждане на артикулите</div>';
        }
    }

    displayOrderItems(orderId, orderData) {
        const productList = document.getElementById(`product-list-${orderId}`);

        if (!orderData.items || orderData.items.length === 0) {
            productList.innerHTML = '<div class="no-items">Няма артикули в поръчката</div>';
            return;
        }

        const itemsHTML = orderData.items.map(item => {
            const available = item.availableQuantity || 0;
            const stockClass = available >= item.quantity ? 'stock-good' : 'stock-low';

            return `
        <div class="order-item" data-product-id="${item.productId || item.id}">
            <div class="item-name">${item.productName || 'Неизвестен продукт'}</div>
            <div class="item-quantity">
                <input type="number" 
                       value="${item.quantity || 0}" 
                       min="0" 
                       max="${available}"
                       class="qty-input ${stockClass}"
                       onchange="handleQuantityChange(${orderId}, ${item.productId || item.id}, this.value)">
                <span class="unit">бр.</span>
            </div>
            <div class="stock-info ${stockClass}">
                <span class="stock-badge">${available >= item.quantity ? 'В наличност' : 'Малко'}</span>
                <small>налични: ${available}</small>
            </div>
            <div class="item-price">${item.unitPrice || '0.00'} лв</div>
        </div>
        `;
        }).join('');

        productList.innerHTML = `
        <div class="items-container">
            ${itemsHTML}
        </div>
        <div class="order-summary">
            <div class="approval-panel">
                <textarea id="note-${orderId}" placeholder="Бележка към клиента за промените..."></textarea>
                <button class="btn-approve" onclick="approveOrderFinal(${orderId})">
                    Одобри поръчката
                </button>
                <button class="btn-reject" onclick="rejectOrderFinal(${orderId})">
                    Откажи поръчката
                </button>
            </div>
        </div>
    `;
    }


    // ==========================================
    // PRODUCT OPERATIONS - REFACTORED TO USE API
    // ==========================================

    /**
     * Update product quantity with visual feedback - USES API
     */
    async updateProductQuantity(orderId, productId, quantity) {
        try {
            const input = document.getElementById(`qty-${orderId}-${productId}`);

            if (this.manager && this.manager.api) {
                const result = await this.manager.api.updateProductQuantity(orderId, productId, quantity);

                if (result.success) {
                    this.highlightQuantityUpdate(orderId, productId, quantity);
                    this.updateItemTotals(orderId);
                    this.markOrderAsModified(orderId);
                } else {
                    this.revertQuantityUpdate(orderId, productId);
                    if (window.toastManager) {
                        window.toastManager.showError('Грешка при обновяване на количеството');
                    }
                }
            }
        } catch (error) {
            console.error('Error updating product quantity:', error);
            this.revertQuantityUpdate(orderId, productId);
        }
    }

    /**
     * Approve product with visual feedback - USES API
     */
    async approveProduct(orderId, productId) {
        try {
            if (this.manager && this.manager.api) {
                const result = await this.manager.api.approveProduct(orderId, productId);

                if (result.success) {
                    this.markProductApproved(orderId, productId);
                    if (window.toastManager) {
                        window.toastManager.showSuccess('Продуктът е одобрен');
                    }
                } else {
                    if (window.toastManager) {
                        window.toastManager.showError('Грешка при одобряване на продукта');
                    }
                }
            }
        } catch (error) {
            console.error('Error approving product:', error);
        }
    }

    /**
     * Reject product with modal
     */
    rejectProduct(orderId, productId) {
        this.showRejectionModal(orderId, productId);
    }

    /**
     * Reject entire order
     */
    rejectEntireOrder(orderId) {
        this.showRejectionModal(orderId, null);
    }

    /**
     * Highlight quantity update with visual feedback
     */
    highlightQuantityUpdate(orderId, productId, quantity) {
        try {
            const input = document.getElementById(`qty-${orderId}-${productId}`);
            if (input) {
                input.value = quantity;
                input.style.background = '#e8f5e8';
                setTimeout(() => {
                    input.style.background = '';
                }, 1000);
            }
        } catch (error) {
            console.error('Error highlighting quantity update:', error);
        }
    }

    /**
     * Revert quantity update on error
     */
    revertQuantityUpdate(orderId, productId) {
        try {
            const input = document.getElementById(`qty-${orderId}-${productId}`);
            if (input) {
                input.value = input.dataset.original;
                input.style.background = '#ffe6e6';
                setTimeout(() => {
                    input.style.background = '';
                }, 2000);
            }
        } catch (error) {
            console.error('Error reverting quantity update:', error);
        }
    }

    /**
     * Mark product as approved - VISUAL FEEDBACK
     */
    markProductApproved(orderId, productId) {
        try {
            const productItem = this.findProductItem(orderId, productId);
            if (!productItem) return;

            productItem.style.border = '2px solid #27ae60';
            productItem.classList.add('approved');

            const approveBtn = productItem.querySelector('.btn-accept');
            const rejectBtn = productItem.querySelector('.btn-reject');

            if (approveBtn) {
                approveBtn.innerHTML = '<i class="bi bi-check"></i> Одобрен';
                approveBtn.style.background = '#27ae60';
                approveBtn.style.color = 'white';
                approveBtn.disabled = true;
            }

            if (rejectBtn) {
                rejectBtn.disabled = true;
                rejectBtn.style.opacity = '0.5';
            }

        } catch (error) {
            console.error('Error marking product approved:', error);
        }
    }

    /**
     * Mark product as rejected - VISUAL FEEDBACK
     */
    markProductRejected(orderId, productId, reason) {
        try {
            const productItem = this.findProductItem(orderId, productId);
            if (!productItem) return;

            productItem.style.border = '2px solid #e74c3c';
            productItem.style.opacity = '0.7';
            productItem.classList.add('rejected');

            const approveBtn = productItem.querySelector('.btn-accept');
            const rejectBtn = productItem.querySelector('.btn-reject');

            if (rejectBtn) {
                rejectBtn.innerHTML = '<i class="bi bi-x"></i> Отказан';
                rejectBtn.style.background = '#e74c3c';
                rejectBtn.style.color = 'white';
                rejectBtn.disabled = true;
            }

            if (approveBtn) {
                approveBtn.disabled = true;
                approveBtn.style.opacity = '0.5';
            }

            // Add rejection reason as tooltip
            if (reason) {
                productItem.title = `Отказан: ${reason}`;
            }

        } catch (error) {
            console.error('Error marking product rejected:', error);
        }
    }

    /**
     * Find product item in DOM
     */
    findProductItem(orderId, productId) {
        const productList = document.getElementById(`product-list-${orderId}`);
        if (!productList) return null;

        return productList.querySelector(`[data-product-id="${productId}"]`);
    }

    markOrderAsModified(orderId) {
        const saveButton = document.querySelector(`#order-details-${orderId} .action-save`);
        if (saveButton) {
            saveButton.style.display = 'inline-flex';
        }

        this.updateItemTotals(orderId);
    }

    toggleItemAvailability(orderId, itemId, checkbox) {
        const productItem = checkbox.closest('.product-item');

        if (checkbox.checked) {
            productItem.classList.remove('unavailable');
        } else {
            productItem.classList.add('unavailable');
            const quantityInput = productItem.querySelector('.quantity-input');
            if (quantityInput && quantityInput.value > 0) {
                if (confirm('Артикулът е недостъпен. Да се зададе количество 0?')) {
                    quantityInput.value = 0;
                }
            }
        }

        this.markOrderAsModified(orderId);
    }

    updateItemTotals(orderId) {
        const productList = document.getElementById(`product-list-${orderId}`);
        const items = productList.querySelectorAll('.product-item');

        items.forEach(item => {
            const quantityInput = item.querySelector('.quantity-input');
            const priceText = item.querySelector('.product-price').textContent;
            const price = parseFloat(priceText.match(/[\d.]+/)?.[0] || 0);
            const quantity = parseInt(quantityInput.value || 0);
            const total = (price * quantity).toFixed(2);

            item.querySelector('.item-total').textContent = total;
        });
    }

    /**
     * Save order changes - REFACTORED TO USE API
     */
    async saveOrderChanges(orderId) {
        const productList = document.getElementById(`product-list-${orderId}`);
        const items = productList.querySelectorAll('.product-item');

        const changes = [];

        items.forEach(item => {
            const itemId = item.dataset.itemId;
            const quantityInput = item.querySelector('.quantity-input');
            const availabilityCheckbox = item.querySelector('.availability-checkbox');
            const originalQuantity = parseInt(quantityInput.dataset.original);
            const newQuantity = parseInt(quantityInput.value);

            if (newQuantity !== originalQuantity || !availabilityCheckbox.checked) {
                changes.push({
                    itemId: itemId,
                    quantity: newQuantity,
                    available: availabilityCheckbox.checked
                });
            }
        });

        if (changes.length === 0) {
            alert('Няма промени за запазване');
            return;
        }

        try {
            if (window.LoaderManager) {
                window.LoaderManager.show('Запазване на промените...');
            }

            // Check if API is available
            if (!this.manager || !this.manager.api) {
                throw new Error('API не е достъпно');
            }

            // Use API instead of direct fetch
            const result = await this.manager.api.saveOrderItemChanges(orderId, changes);

            if (result.success) {
                const saveButton = document.querySelector(`#order-details-${orderId} .action-save`);
                if (saveButton) {
                    saveButton.style.display = 'none';
                }

                if (window.toastManager) {
                    window.toastManager.showSuccess('Промените са запазени успешно');
                }

                items.forEach(item => {
                    const quantityInput = item.querySelector('.quantity-input');
                    quantityInput.dataset.original = quantityInput.value;
                });

            } else {
                throw new Error(result.message || 'Грешка при запазване');
            }

        } catch (error) {
            console.error('Error saving changes:', error);
            if (window.toastManager) {
                window.toastManager.showError('Грешка при запазване на промените');
            } else {
                alert('Грешка при запазване на промените');
            }
        } finally {
            if (window.LoaderManager) {
                window.LoaderManager.hide();
            }
        }
    }

    // ==========================================
    // MODAL MANAGEMENT - INTEGRATED WITH HTML MODAL
    // ==========================================

    /**
     * Show rejection modal
     */
    showRejectionModal(orderId, productId) {
        try {
            this.rejectionContext = { orderId, productId };
            this.resetRejectionModal();

            if (this.elements.rejectionModal) {
                this.elements.rejectionModal.classList.add('active');
                this.activeModal = 'rejection';
            }

        } catch (error) {
            console.error('Error showing rejection modal:', error);
        }
    }

    /**
     * Close rejection modal
     */
    closeRejectionModal() {
        try {
            if (this.elements.rejectionModal) {
                this.elements.rejectionModal.classList.remove('active');
            }

            this.activeModal = null;
            this.rejectionContext = null;

        } catch (error) {
            console.error('Error closing rejection modal:', error);
        }
    }

    /**
     * Reset rejection modal
     */
    resetRejectionModal() {
        document.querySelectorAll('.reason-option').forEach(option => {
            option.classList.remove('selected');
        });

        if (this.elements.customReason) {
            this.elements.customReason.value = '';
        }
    }

    /**
     * Confirm rejection with reason - USES API
     */
    async confirmRejection() {
        if (!this.rejectionContext) return;

        const { orderId, productId } = this.rejectionContext;

        // Get selected reason
        const selectedOption = document.querySelector('.reason-option.selected');
        const customReason = this.elements.customReason?.value;
        const reason = selectedOption ?
            selectedOption.querySelector('strong').textContent :
            customReason || 'Без посочена причина';

        try {
            if (productId) {
                // Reject specific product
                if (this.manager && this.manager.api) {
                    const result = await this.manager.api.rejectProduct(orderId, productId, reason);
                    if (result.success) {
                        this.markProductRejected(orderId, productId, reason);
                        if (window.toastManager) {
                            window.toastManager.showSuccess('Продуктът е отказан');
                        }
                    }
                }
            } else {
                // Reject entire order
                if (this.manager && this.manager.api) {
                    const result = await this.manager.api.cancelOrder(orderId, reason);
                    if (result.success) {
                        if (window.toastManager) {
                            window.toastManager.showSuccess('Поръчката е отказана');
                        }
                        // Refresh dashboard to update order status
                        if (this.manager) {
                            this.manager.refreshDashboard();
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error during rejection:', error);
            if (window.toastManager) {
                window.toastManager.showError('Грешка при отказване');
            }
        } finally {
            this.closeRejectionModal();
        }
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    /**
     * Format order time for display
     */
    formatOrderTime(submittedAt) {
        try {
            const orderDate = new Date(submittedAt);
            const now = new Date();
            const diffMs = now - orderDate;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor(diffMs / (1000 * 60));

            if (diffHours > 24) {
                return `${Math.floor(diffHours / 24)}д`;
            } else if (diffHours > 0) {
                return `${diffHours}ч`;
            } else {
                return `${diffMins}мин`;
            }
        } catch (error) {
            return 'Неизвестно';
        }
    }

    /**
     * Get order priority based on age and urgency
     */
    getOrderPriority(order) {
        try {
            const orderDate = new Date(order.submittedAt);
            const now = new Date();
            const hoursOld = (now - orderDate) / (1000 * 60 * 60);

            // Priority based on age and total value
            const totalValue = parseFloat(order.totalGross || 0);

            if (hoursOld > 4 || totalValue > 1000) return 'urgent';
            if (hoursOld > 2 || totalValue > 500) return 'high';
            return 'normal';
        } catch (error) {
            return 'normal';
        }
    }

    getStockStatus(available, requested) {
        if (available === 0) {
            return { class: 'stock-none', text: 'Няма' };
        } else if (available < requested) {
            return { class: 'stock-insufficient', text: 'Недостатъчно' };
        } else if (available < requested * 2) {
            return { class: 'stock-low', text: 'Малко' };
        } else {
            return { class: 'stock-good', text: 'В наличност' };
        }
    }


    markOrderAsProcessed(orderId, action) {
        const orderElement = document.querySelector(`[data-order-id="${orderId}"]`);
        if (orderElement) {
            orderElement.classList.add(`order-${action}`);
            orderElement.style.opacity = '0.7';
        }
    }

    showSuccessMessage(message) {
        if (window.toastManager) {
            window.toastManager.success(message);
        } else {
            alert(message);
        }
    }

    showErrorMessage(message) {
        if (window.toastManager) {
            window.toastManager.error(message);
        } else {
            alert('Грешка: ' + message);
        }
    }

    getStockClass(available, requested) {
        if (available === 0) return 'stock-none';
        if (available < requested) return 'stock-insufficient';
        if (available < requested * 1.5) return 'stock-low';
        return 'stock-good';
    }

    getStockText(available, requested) {
        if (available === 0) return 'Няма';
        if (available < requested) return 'Недостатъчно';
        return 'В наличност';
    }

    updateOrderChangeIndicator(orderId, hasChanges) {
        const indicator = document.getElementById(`changes-${orderId}`);
        if (indicator) {
            indicator.style.display = hasChanges ? 'block' : 'none';
        }
    }

    showInventoryWarning(productId, requested, available) {
        const input = document.querySelector(`input[data-product-id="${productId}"]`);
        if (input) {
            input.classList.add('inventory-error');
            input.value = available; // Auto-correct to max available

            if (window.toastManager) {
                window.toastManager.warning(`Само ${available} бр. налични от този артикул`);
            }

            setTimeout(() => input.classList.remove('inventory-error'), 3000);
        }
    }


    async showInventoryConflictDialog(conflicts) {
        const message = conflicts.map(c =>
            `${c.productName}: искате ${c.requested}, има ${c.available}`
        ).join('\n');

        return confirm(`Конфликт с наличности:\n\n${message}\n\nАвтоматично коригиране на количествата?`);
    }





    // ==========================================
    // KEYBOARD AND TOUCH SUPPORT
    // ==========================================

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case '1':
                        e.preventDefault();
                        if (this.manager) this.manager.switchTab('urgent');
                        break;
                    case '2':
                        e.preventDefault();
                        if (this.manager) this.manager.switchTab('pending');
                        break;
                    case '3':
                        e.preventDefault();
                        if (this.manager) this.manager.switchTab('confirmed');  // FIXED
                        break;
                    case '4':
                        e.preventDefault();
                        if (this.manager) this.manager.switchTab('activity');
                        break;
                    case '5':
                        e.preventDefault();
                        if (this.manager) this.manager.switchTab('manage');
                        break;
                    case 'r':
                        e.preventDefault();
                        if (this.manager) this.manager.refreshDashboard();
                        break;
                }
            }

            if (e.key === 'Escape') {
                this.closeRejectionModal();
            }
        });

        console.log('✓ Keyboard shortcuts set up');
    }

    setupTouchGestures() {
        let touchStartX = 0;

        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        });

        document.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const diff = touchStartX - touchEndX;

            if (Math.abs(diff) > 50 && this.manager) {
                const tabs = ['urgent', 'pending', 'confirmed', 'cancelled', 'activity', 'manage'];  // UPDATED
                const currentIndex = tabs.indexOf(this.manager.currentTab);

                if (diff > 0 && currentIndex < tabs.length - 1) {
                    this.manager.switchTab(tabs[currentIndex + 1]);
                } else if (diff < 0 && currentIndex > 0) {
                    this.manager.switchTab(tabs[currentIndex - 1]);
                }
            }
        });

        console.log('✓ Touch gestures set up');
    }

    updateActivityFeed(activities) {
        try {
            const activityTab = document.getElementById('activity-tab');
            if (!activityTab) return;

            const panelContent = activityTab.querySelector('.panel-content');
            if (!panelContent) return;

            if (activities.length === 0) {
                panelContent.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="bi bi-inbox"></i></div><div class="empty-message">Няма последна активност</div></div>';
                return;
            }

            panelContent.innerHTML = activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon activity-${activity.type}">
                        <i class="${activity.icon}"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-text">${activity.message}</div>
                        <div class="activity-time">${activity.time}</div>
                    </div>
                </div>
            `).join('');

            console.log('✓ Activity feed updated');

        } catch (error) {
            console.error('Error updating activity feed:', error);
        }
    }


    /**
     * Render orders list in specified container
     */
    renderOrdersList(orders, containerSelector) {
        // Форсирано намиране на контейнера
        let container = document.querySelector(containerSelector);

        // Ако не го намери веднага, опитай с ID
        if (!container) {
            const containerId = containerSelector.replace('#', '');
            container = document.getElementById(containerId);
        }

        // Ако пак не го намери, създай го
        if (!container) {
            console.error('Container not found, creating:', containerSelector);
            return;
        }

        // Изчисти съдържанието
        container.innerHTML = '';

        if (!orders || orders.length === 0) {
            container.innerHTML = '<div class="no-orders">Няма поръчки за показване</div>';
            return;
        }

        // Генерирай HTML за поръчките
        const ordersHtml = orders.map(order => this.generateOrderCardHtml(order)).join('');
        container.innerHTML = ordersHtml;

        console.log(`✓ Rendered ${orders.length} orders in ${containerSelector}`);
    }

    generateOrderCardHtml(order) {
        // Status mapping с компактни български labels
        const statusMap = {
            'URGENT': {label: 'Спешна', class: 'urgent'},
            'PENDING': {label: 'Изчакваща', class: 'pending'},
            'CONFIRMED': {label: 'Обработена', class: 'confirmed'},
            'CANCELLED': {label: 'Отказана', class: 'cancelled'}
        };

        const status = statusMap[order.status] || {label: 'Изчакваща', class: 'pending'};

        // Форматиране на финансови данни - винаги 2 десетични знака
        const totalGross = order.totalGross ? Number(order.totalGross).toFixed(2) : '0.00';
        const totalNet = order.totalNet ? Number(order.totalNet).toFixed(2) : '0.00';
        const itemsCount = order.itemsCount || 0;

        // Форматиране на дата и час с българска локализация
        const submittedDate = order.submittedAt ?
            new Date(order.submittedAt).toLocaleDateString('bg-BG', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            }) : '';

        const submittedTime = order.submittedAt ?
            new Date(order.submittedAt).toLocaleTimeString('bg-BG', {
                hour: '2-digit', minute: '2-digit'
            }) : '';

        // Съкращаване на дълги фирмени имена за компактност
        const clientCompany = order.clientCompany && order.clientCompany.length > 35
            ? order.clientCompany.substring(0, 35) + '...'
            : order.clientCompany || 'Неизвестна фирма';

        // Форматиране на клиентски детайли с проверка за null/undefined
        const clientDetails = [
            order.clientName,
            order.clientPhone,
            order.clientLocation
        ].filter(detail => detail).join(' • ') || 'Няма данни';

        // Генериране на HTML с нова три-секционна структура
        return `
<div class="order-card" data-order-id="${order.id}" data-status="${status.class}">
    <div class="status-bar ${status.class}"></div>
    
    <div class="order-card-content">
        <!-- ЛЯВА СЕКЦИЯ: Идентификация и клиент -->
        <div class="order-main-info">
            <div class="order-header">
                <div class="order-id">#${order.id}</div>
                <div class="order-status ${status.class}">${status.label}</div>
            </div>
            <div class="client-info">
                <div class="client-company">${clientCompany}</div>
                <div class="client-details">${clientDetails}</div>
            </div>
        </div>
        
        <!-- СРЕДНА СЕКЦИЯ: Финансови данни -->
        <div class="order-financial-info">
            <div class="order-items">${itemsCount} артикула</div>
            <div class="order-total">${totalGross} лв</div>
            <div class="order-net-price">без ДДС: ${totalNet} лв</div>
        </div>
        
        <!-- ДЯСНА СЕКЦИЯ: Време и действие -->
        <div class="order-meta-actions">
            <div class="order-datetime">
                <div class="order-date">${submittedDate}</div>
                <div class="order-time">${submittedTime}</div>
            </div>
            <div class="order-actions">
                <button class="btn-view" onclick="viewOrderDetails(${order.id})">
                    👁 Преглед
                </button>
            </div>
        </div>
    </div>
</div>`;
    }




    /**
     * Show order details (existing functionality)
     */
    showOrderDetails(orderId) {
        if (window.mainDashboard && window.mainDashboard.manager) {
            window.mainDashboard.manager.showOrderDetails(orderId);
        }
    }

    // ==========================================
    // LOADING AND ERROR STATES
    // ==========================================

    showLoadingIndicator(show) {
        // Implement loading indicator logic if needed
        console.log(`Loading indicator: ${show ? 'shown' : 'hidden'}`);
    }

    /**
     * Update WebSocket connection status indicator
     */
    updateConnectionStatus(connected) {
        const indicator = document.getElementById('websocket-indicator');
        const statusText = document.getElementById('websocket-status');

        if (!indicator || !statusText) return;

        if (connected) {
            indicator.className = 'live-dot connected';
            statusText.className = 'live-text connected';
            statusText.textContent = 'На живо';
        } else {
            indicator.className = 'live-dot disconnected';
            statusText.className = 'live-text disconnected';
            statusText.textContent = 'Прекъсната връзка';
        }
    }
}


// Global functions for HTML onclick handlers - FULLY INTEGRATED

window.handleQuantityChange = function(orderId, productId, newQuantity) {
    if (window.mainDashboard?.manager) {
        window.mainDashboard.manager.updatePendingQuantity(orderId, productId, parseInt(newQuantity));
    }
};

window.approveOrderFinal = window.approveOrderFinal || function(orderId) {
    const noteTextarea = document.getElementById(`note-${orderId}`);
    const operatorNote = noteTextarea?.value?.trim() || '';

    if (window.mainDashboard?.manager?.approveOrder) {
        window.mainDashboard.manager.approveOrder(orderId, operatorNote);
    } else {
        alert('Dashboard система не е готова');
    }
};

window.rejectOrderFinal = window.rejectOrderFinal || function(orderId) {
    const reason = prompt('Причина за отказване:');
    if (reason?.trim()) {
        if (window.mainDashboard?.manager?.rejectOrder) {
            window.mainDashboard.manager.rejectOrder(orderId, reason.trim());
        } else {
            alert('Dashboard система не е готова');
        }
    }
};

window.closeRejectionModal = function() {
    if (window.mainDashboard && window.mainDashboard.ui) {
        window.mainDashboard.ui.closeRejectionModal();
    }
};

window.confirmRejection = function() {
    if (window.mainDashboard && window.mainDashboard.ui) {
        window.mainDashboard.ui.confirmRejection();
    }
};

window.selectReason = function(element, reason) {
    // Remove previous selections
    document.querySelectorAll('.reason-option').forEach(option => {
        option.classList.remove('selected');
    });

    // Select current option
    element.classList.add('selected');

    // Clear custom reason if predefined option is selected
    const customReason = document.getElementById('custom-reason');
    if (customReason) {
        customReason.value = '';
    }
};

// Export for use in other modules
window.DashboardUI = DashboardUI;