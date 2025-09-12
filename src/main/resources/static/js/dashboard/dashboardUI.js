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
            'pending': 'warning',
            'confirmed': 'info',    // FIXED: was 'ready'
            'cancelled': 'danger',  // ADDED: was missing
            'activity': 'success'
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
            // Counter elements
            urgentCount: document.getElementById('urgent-count'),
            pendingCount: document.getElementById('pending-count'),
            readyCount: document.getElementById('ready-count'),
            completedCount: document.getElementById('completed-count'),
            cancelledCount: document.getElementById('cancelled-count'), // ADDED

            // Badge elements
            urgentBadge: document.getElementById('urgent-badge'),
            pendingBadge: document.getElementById('pending-badge'),
            readyBadge: document.getElementById('ready-badge'),
            confirmedBadge: document.getElementById('confirmed-badge'), // ADDED
            cancelledBadge: document.getElementById('cancelled-badge'), // ADDED

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
            this.animateCounter(this.elements.urgentCount, data.urgentCount);
            this.animateCounter(this.elements.pendingCount, data.pendingCount);
            this.animateCounter(this.elements.readyCount, data.readyCount);
            this.animateCounter(this.elements.completedCount, data.completedCount);
            this.animateCounter(this.elements.cancelledCount, data.cancelledCount); // ADDED

            this.updateBadge(this.elements.urgentBadge, data.urgentCount);
            this.updateBadge(this.elements.pendingBadge, data.pendingCount);
            this.updateBadge(this.elements.readyBadge, data.readyCount);
            this.updateBadge(this.elements.confirmedBadge, data.completedCount); // ADDED
            this.updateBadge(this.elements.cancelledBadge, data.cancelledCount); // ADDED

            console.log('✓ Counters updated');

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
        this.elements.statusItems.forEach(item => {
            item.style.background = '';
        });

        // FIXED: Use the corrected mapping
        const statusClass = this.statusToTabMapping[tabName];
        if (statusClass) {
            const statusItem = document.querySelector(`.status-item.${statusClass}`);
            if (statusItem) {
                const colors = {
                    'urgent': 'rgba(231, 76, 60, 0.1)',
                    'warning': 'rgba(243, 156, 18, 0.1)',
                    'info': 'rgba(52, 152, 219, 0.1)',
                    'danger': 'rgba(220, 53, 69, 0.1)',  // ADDED for cancelled
                    'success': 'rgba(39, 174, 96, 0.1)'
                };
                statusItem.style.background = colors[statusClass] || '';
            }
        }
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

            tabElement.innerHTML = "";

            if (safeOrders.length === 0) {
                tabElement.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #888;">
                    <i class="bi bi-inbox" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    <p>Няма намерени поръчки за този статус</p>
                </div>
            `;
                return;
            }

            safeOrders.forEach((order, index) => {
                const orderElement = document.createElement("div");
                orderElement.className = "order-item";
                orderElement.dataset.orderId = order.id || index;

                const orderId = order.id || "N/A";
                const customerName = order.customerName || order.customerInfo || "Неизвестен клиент";
                const status = order.status || "Неизвестен статус";
                const submittedAt = order.submittedAt
                    ? this.formatOrderTime(order.submittedAt)
                    : "Неизвестно време";
                const priority = this.getOrderPriority(order);

                orderElement.innerHTML = `
                <div class="order-summary">
                    <div class="order-priority priority-${priority}"></div>
                    <div class="order-info">
                        <div class="order-header">
                            <div class="order-number">#${orderId}</div>
                            <div class="order-time">${submittedAt}</div>
                        </div>
                        <div class="order-client">${customerName}</div>
                        <div class="order-meta">
                            <span>Статус: ${status}</span>
                            <i class="bi bi-chevron-down expand-icon" id="expand-icon-${order.id}"></i>
                        </div>
                    </div>
                </div>
                
                <!-- Expandable Details -->
                <div class="order-details" id="order-details-${order.id}" style="display: none;">
                    <div class="details-header">
                        <div class="details-title">Детайли на поръчката</div>
                        <div class="order-total">Общо: ${order.totalGross || "0.00"} лв</div>
                    </div>
                    
                    <div class="product-list" id="product-list-${order.id}">
                        <div class="loading-items">
                            <i class="bi bi-hourglass-split"></i> Зареждане на артикули...
                        </div>
                    </div>
                    
                    <div class="order-actions">
                        ${this.generateOrderActions(order, tabName)}
                        <button class="order-action action-save" data-order-id="${order.id}" style="display: none;">
                            <i class="bi bi-check2"></i> Запази промените
                        </button>
                    </div>
                </div>
            `;

                // 📌 Закачаме listener за разпъване на детайлите
                const summaryElement = orderElement.querySelector(".order-summary");
                summaryElement.addEventListener("click", () => this.toggleOrderDetails(order.id));

                // 📌 Закачаме listener за бутона "Запази промените"
                const saveButton = orderElement.querySelector(".action-save");
                if (saveButton) {
                    saveButton.addEventListener("click", () => this.saveOrderChanges(order.id));
                }

                tabElement.appendChild(orderElement);
            });

            console.log(`✅ ${tabName} tab content updated with ${safeOrders.length} orders`);
        } catch (err) {
            console.error(`❌ Error updating ${tabName} tab content:`, err);
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

    // ==========================================
    // EXPANDABLE ORDER DETAILS FUNCTIONALITY
    // ==========================================

    async toggleOrderDetails(orderId) {
        const detailsDiv = document.getElementById(`order-details-${orderId}`);
        const expandIcon = document.getElementById(`expand-icon-${orderId}`);

        if (!detailsDiv || !expandIcon) {
            console.warn(`Order details elements not found for ID: ${orderId}`);
            return;
        }

        if (detailsDiv.style.display === 'none') {
            this.expandOrder(orderId);
            detailsDiv.style.display = 'block';
            expandIcon.className = 'bi bi-chevron-up expand-icon';

            await this.loadOrderItems(orderId);

            if (this.manager && this.manager.expandedOrders) {
                this.manager.expandedOrders.add(orderId);
            }
        } else {
            this.collapseOrder(orderId);
            detailsDiv.style.display = 'none';
            expandIcon.className = 'bi bi-chevron-down expand-icon';

            if (this.manager && this.manager.expandedOrders) {
                this.manager.expandedOrders.delete(orderId);
            }
        }
    }

    /**
     * Expand order with smooth animation
     */
    expandOrder(orderId) {
        try {
            const orderItem = document.querySelector(`[data-order-id="${orderId}"]`);
            const details = document.getElementById(`order-details-${orderId}`);

            if (!orderItem || !details) {
                console.warn(`Order elements not found for ID: ${orderId}`);
                return;
            }

            orderItem.classList.add('expanded');
            details.classList.add('expanded');

            setTimeout(() => {
                details.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }, this.animationDuration);

            console.log(`✓ Order ${orderId} expanded`);

        } catch (error) {
            console.error(`Error expanding order ${orderId}:`, error);
        }
    }

    /**
     * Collapse order
     */
    collapseOrder(orderId) {
        try {
            const orderItem = document.querySelector(`[data-order-id="${orderId}"]`);
            const details = document.getElementById(`order-details-${orderId}`);

            if (!orderItem || !details) return;

            orderItem.classList.remove('expanded');
            details.classList.remove('expanded');

            console.log(`✓ Order ${orderId} collapsed`);

        } catch (error) {
            console.error(`Error collapsing order ${orderId}:`, error);
        }
    }

    /**
     * Load order items via API - REFACTORED TO USE API
     */
    async loadOrderItems(orderId) {
        const productList = document.getElementById(`product-list-${orderId}`);

        try {
            // Check if API is available
            if (!this.manager || !this.manager.api) {
                console.error('API not available for loading order items');
                productList.innerHTML = '<div class="error-message">API не е достъпно</div>';
                return;
            }

            // Use API instead of direct fetch
            const result = await this.manager.api.getOrderDetailsWithItems(orderId);

            if (result.success && result.data) {
                const order = result.data;
                this.displayOrderItems(orderId, order.items || []);
            } else {
                productList.innerHTML = '<div class="error-message">Грешка при зареждане на артикулите</div>';
            }

        } catch (error) {
            console.error('Error loading order items:', error);
            productList.innerHTML = '<div class="error-message">Грешка при зареждане на артикулите</div>';
        }
    }

    displayOrderItems(orderId, items) {
        const productList = document.getElementById(`product-list-${orderId}`);

        if (items.length === 0) {
            productList.innerHTML = '<div class="no-items">Няма артикули в поръчката</div>';
            return;
        }

        const itemsHTML = items.map(item => `
            <div class="product-item" data-item-id="${item.id}" data-product-id="${item.productId || item.id}">
                <div class="product-image">
                    <i class="bi bi-box"></i>
                </div>
                <div class="product-info">
                    <div class="product-name">${item.productName || 'Неизвестен продукт'}</div>
                    <div class="product-sku">SKU: ${item.productSku || 'N/A'}</div>
                    <div class="product-price">Цена: ${item.unitPrice || '0.00'} лв</div>
                </div>
                <div class="product-quantity">
                    <label>Количество:</label>
                    <input type="number" 
                           value="${item.quantity || 0}" 
                           min="0"
                           class="quantity-input"
                           id="qty-${orderId}-${item.productId || item.id}"
                           onchange="updateProductQuantity(${orderId}, ${item.productId || item.id}, this.value)"
                           data-original="${item.quantity || 0}">
                </div>
                <div class="product-availability">
                    <label>
                        <input type="checkbox" 
                               ${item.available !== false ? 'checked' : ''} 
                               onchange="toggleItemAvailability(${orderId}, ${item.id}, this)"
                               class="availability-checkbox">
                        В наличност
                    </label>
                </div>
                <div class="product-actions">
                    <button class="btn btn-accept" onclick="approveProduct(${orderId}, ${item.productId || item.id})">
                        <i class="bi bi-check"></i> Одобри
                    </button>
                    <button class="btn btn-reject" onclick="rejectProduct(${orderId}, ${item.productId || item.id})">
                        <i class="bi bi-x"></i> Отказ
                    </button>
                </div>
                <div class="product-total">
                    Общо: <span class="item-total">${((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}</span> лв
                </div>
            </div>
        `).join('');

        productList.innerHTML = itemsHTML;
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

    // ==========================================
    // LOADING AND ERROR STATES
    // ==========================================

    showLoadingIndicator(show) {
        // Implement loading indicator logic if needed
        console.log(`Loading indicator: ${show ? 'shown' : 'hidden'}`);
    }

    updateConnectionStatus(connected) {
        // Update connection indicator if needed
        console.log(`Connection status: ${connected ? 'connected' : 'disconnected'}`);
    }
}

// Global functions for HTML onclick handlers - FULLY INTEGRATED
window.toggleOrderDetails = function(orderId) {
    if (window.mainDashboard && window.mainDashboard.ui) {
        window.mainDashboard.ui.toggleOrderDetails(orderId);
    }
};

window.markOrderAsModified = function(orderId) {
    if (window.mainDashboard && window.mainDashboard.ui) {
        window.mainDashboard.ui.markOrderAsModified(orderId);
    }
};

window.toggleItemAvailability = function(orderId, itemId, checkbox) {
    if (window.mainDashboard && window.mainDashboard.ui) {
        window.mainDashboard.ui.toggleItemAvailability(orderId, itemId, checkbox);
    }
};

window.saveOrderChanges = function(orderId) {
    if (window.mainDashboard && window.mainDashboard.ui) {
        window.mainDashboard.ui.saveOrderChanges(orderId);
    }
};

window.updateProductQuantity = function(orderId, productId, quantity) {
    if (window.mainDashboard && window.mainDashboard.ui) {
        window.mainDashboard.ui.updateProductQuantity(orderId, productId, quantity);
    }
};

window.approveProduct = function(orderId, productId) {
    if (window.mainDashboard && window.mainDashboard.ui) {
        window.mainDashboard.ui.approveProduct(orderId, productId);
    }
};

window.rejectProduct = function(orderId, productId) {
    if (window.mainDashboard && window.mainDashboard.ui) {
        window.mainDashboard.ui.rejectProduct(orderId, productId);
    }
};

window.rejectEntireOrder = function(orderId) {
    if (window.mainDashboard && window.mainDashboard.ui) {
        window.mainDashboard.ui.rejectEntireOrder(orderId);
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