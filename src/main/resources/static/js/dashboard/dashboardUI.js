/**
 * DASHBOARD UI - USER INTERFACE OPERATIONS
 * ========================================
 * Handles all visual updates and user interactions
 * Manages DOM manipulation, animations, and modal dialogs
 * Provides clean interface for UI state management
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

        console.log('DashboardUI initialized');
    }

    /**
     * Initialize UI components and cache DOM elements
     * Sets up event listeners and prepares the interface
     */
    initialize() {
        try {
            console.log('=== DashboardUI Initialization ===');

            // Cache frequently used DOM elements
            this.cacheElements();

            // Set up event listeners
            this.setupEventListeners();

            // Initialize keyboard shortcuts
            this.setupKeyboardShortcuts();

            // Initialize touch gestures for mobile
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

            // Badge elements
            urgentBadge: document.getElementById('urgent-badge'),
            pendingBadge: document.getElementById('pending-badge'),
            readyBadge: document.getElementById('ready-badge'),

            // Tab navigation
            tabButtons: document.querySelectorAll('.tab-btn'),
            tabContents: document.querySelectorAll('.tab-content'),
            statusItems: document.querySelectorAll('.status-item'),

            // Modal elements
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

        // Status item clicks (top bar navigation)
        this.elements.statusItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const tabMap = {
                    'urgent': 'urgent',
                    'warning': 'pending',
                    'info': 'ready',
                    'success': 'activity'
                };

                const classList = Array.from(item.classList);
                const statusClass = classList.find(cls => tabMap[cls]);

                if (statusClass && this.manager) {
                    this.manager.switchTab(tabMap[statusClass]);
                }
            });
        });

        // Modal overlay clicks (close modal)
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

    /**
     * Update dashboard counters with new data
     * Provides smooth number transitions for better UX
     */
    updateCounters(data) {
        try {
            // Update main counters
            this.animateCounter(this.elements.urgentCount, data.urgentCount);
            this.animateCounter(this.elements.pendingCount, data.pendingCount);
            this.animateCounter(this.elements.readyCount, data.readyCount);
            this.animateCounter(this.elements.completedCount, data.completedCount);

            // Update badges
            this.updateBadge(this.elements.urgentBadge, data.urgentCount);
            this.updateBadge(this.elements.pendingBadge, data.pendingCount);
            this.updateBadge(this.elements.readyBadge, data.readyCount);

            console.log('✓ Counters updated');

        } catch (error) {
            console.error('Error updating counters:', error);
        }
    }

    /**
     * Animate counter changes for smooth visual feedback
     */
    animateCounter(element, targetValue) {
        if (!element) return;

        const currentValue = parseInt(element.textContent) || 0;
        const difference = targetValue - currentValue;
        const duration = Math.min(500, Math.abs(difference) * 50); // Max 500ms
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
                element.textContent = targetValue; // Ensure exact final value
            }
        }, stepDuration);
    }

    /**
     * Update badge with visual highlight if value changed
     */
    updateBadge(element, newValue) {
        if (!element) return;

        const oldValue = parseInt(element.textContent) || 0;
        element.textContent = newValue;

        // Highlight if value increased (new items)
        if (newValue > oldValue) {
            element.style.animation = 'pulse 0.5s ease-in-out';
            setTimeout(() => {
                element.style.animation = '';
            }, 500);
        }
    }

    /**
     * Update daily statistics display
     */
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

    /**
     * Update tab UI when switching between tabs
     */
    updateTabUI(activeTab, previousTab) {
        try {
            // Update tab button states
            this.elements.tabButtons.forEach(btn => {
                if (btn.dataset.tab === activeTab) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            // Update tab content visibility
            this.elements.tabContents.forEach(content => {
                if (content.id === `${activeTab}-tab`) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });

            // Update status bar highlighting
            this.updateStatusBarSelection(activeTab);

            console.log(`✓ Tab UI updated: ${previousTab} → ${activeTab}`);

        } catch (error) {
            console.error('Error updating tab UI:', error);
        }
    }

    /**
     * Highlight corresponding status item when switching tabs
     */
    updateStatusBarSelection(tabName) {
        // Reset all status items
        this.elements.statusItems.forEach(item => {
            item.style.background = '';
        });

        // Map tabs to status item classes
        const statusMap = {
            'urgent': 'urgent',
            'pending': 'warning',
            'ready': 'info',
            'activity': 'success'
        };

        const statusClass = statusMap[tabName];
        if (statusClass) {
            const statusItem = document.querySelector(`.status-item.${statusClass}`);
            if (statusItem) {
                const colors = {
                    'urgent': 'rgba(231, 76, 60, 0.1)',
                    'warning': 'rgba(243, 156, 18, 0.1)',
                    'info': 'rgba(52, 152, 219, 0.1)',
                    'success': 'rgba(39, 174, 96, 0.1)'
                };
                statusItem.style.background = colors[statusClass] || '';
            }
        }
    }

    /**
     * Update tab content with new order data
     */
    updateTabContent(tabName, orders) {
        const safeOrders = Array.isArray(orders) ? orders : [];

        console.log(`Updating tab ${tabName} with ${safeOrders.length} orders`);

        try {
            const tabElement = document.querySelector(`#${tabName}-tab-content`);
            if (!tabElement) {
                console.warn(`⚠️ Tab element for '${tabName}' not found!`);
                return;
            }

            // Изчистваме съдържанието
            tabElement.innerHTML = "";

            if (safeOrders.length === 0) {
                tabElement.innerHTML = `<p class="empty-message">Няма намерени поръчки</p>`;
                return;
            }

            // Добавяме новите елементи
            safeOrders.forEach(order => {
                const item = document.createElement("div");
                item.className = "order-item";
                item.innerHTML = `
                <div class="order-id">#${order.id}</div>
                <div class="order-customer">${order.customerName || "Неизвестен клиент"}</div>
                <div class="order-status">${order.status}</div>
            `;
                tabElement.appendChild(item);
            });

            console.log(`✓ ${tabName} tab content updated with ${safeOrders.length} orders`);

        } catch (err) {
            console.error(`❌ Error updating ${tabName} tab content:`, err);
        }
    }


    // ==========================================
    // ORDER DISPLAY AND INTERACTION
    // ==========================================

    /**
     * Create HTML for an order item
     */
    createOrderItemHTML(order, tabContext) {
        const statusActions = {
            'urgent': `<button class="order-action action-confirm" onclick="confirmOrder(${order.id})">Потвърди</button>`,
            'pending': `<button class="order-action action-pick" onclick="startPicking(${order.id})">Пикинг</button>`,
            'ready': `<button class="order-action action-ship" onclick="shipOrder(${order.id})">Изпрати</button>`
        };

        const actionButton = statusActions[tabContext] || '';
        const timeText = this.formatOrderTime(order.submittedAt);

        return `
            <div class="order-item" data-order-id="${order.id}">
                <div class="order-summary">
                    <div class="order-priority priority-${this.getOrderPriority(order)}"></div>
                    <div class="order-info" onclick="toggleOrderDetails(${order.id})" style="cursor: pointer; flex: 1;">
                        <div class="order-header">
                            <div class="order-number">Поръчка #${order.id}</div>
                            <div class="order-time">${timeText}</div>
                        </div>
                        <div class="order-client">${order.clientName}</div>
                        <div class="order-meta">
                            <span>${order.totalGross} лв • ${order.itemsCount} арт.</span>
                            <span>${order.status}</span>
                        </div>
                    </div>
                    ${actionButton}
                </div>
                
                <div class="order-details" id="details-${order.id}">
                    <div class="details-header">
                        <div class="details-title">Детайли поръчка #${order.id}</div>
                        <div class="order-total">${order.totalGross} лв</div>
                    </div>
                    
                    <div class="product-list">
                        <!-- Products will be loaded when expanded -->
                        <div class="loading-placeholder">Зареждане на продукти...</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create empty state HTML for tabs with no data
     */
    createEmptyStateHTML(tabName) {
        const messages = {
            'urgent': 'Няма спешни поръчки',
            'pending': 'Няма поръчки в обработка',
            'ready': 'Няма готови поръчки',
            'activity': 'Няма последна активност'
        };

        return `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="bi bi-inbox"></i>
                </div>
                <div class="empty-message">${messages[tabName] || 'Няма данни'}</div>
            </div>
        `;
    }

    // ==========================================
    // ORDER DETAILS EXPANSION
    // ==========================================

    /**
     * Expand order details with smooth animation
     */
    expandOrder(orderId) {
        try {
            const orderItem = document.querySelector(`[data-order-id="${orderId}"]`);
            const details = document.getElementById(`details-${orderId}`);

            if (!orderItem || !details) {
                console.warn(`Order elements not found for ID: ${orderId}`);
                return;
            }

            // Add expanded classes
            details.classList.add('expanded');
            orderItem.classList.add('expanded');

            // Smooth scroll into view
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
     * Collapse order details
     */
    collapseOrder(orderId) {
        try {
            const orderItem = document.querySelector(`[data-order-id="${orderId}"]`);
            const details = document.getElementById(`details-${orderId}`);

            if (!orderItem || !details) return;

            // Remove expanded classes
            details.classList.remove('expanded');
            orderItem.classList.remove('expanded');

            console.log(`✓ Order ${orderId} collapsed`);

        } catch (error) {
            console.error(`Error collapsing order ${orderId}:`, error);
        }
    }

    // ==========================================
    // PRODUCT OPERATIONS UI
    // ==========================================

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
     * Mark product as approved with visual changes
     */
    markProductApproved(orderId, productId) {
        try {
            const productItem = this.findProductItem(orderId, productId);
            if (!productItem) return;

            productItem.style.border = '2px solid #27ae60';

            const approveBtn = productItem.querySelector('.btn-accept');
            const rejectBtn = productItem.querySelector('.btn-reject');

            if (approveBtn) {
                approveBtn.textContent = '✓ Одобрен';
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
     * Mark product as rejected with visual changes
     */
    markProductRejected(orderId, productId, reason) {
        try {
            const productItem = this.findProductItem(orderId, productId);
            if (!productItem) return;

            productItem.style.border = '2px solid #e74c3c';
            productItem.style.opacity = '0.7';

            const approveBtn = productItem.querySelector('.btn-accept');
            const rejectBtn = productItem.querySelector('.btn-reject');

            if (rejectBtn) {
                rejectBtn.textContent = '✗ Отказан';
                rejectBtn.style.background = '#e74c3c';
                rejectBtn.style.color = 'white';
                rejectBtn.disabled = true;
            }

            if (approveBtn) {
                approveBtn.disabled = true;
                approveBtn.style.opacity = '0.5';
            }

        } catch (error) {
            console.error('Error marking product rejected:', error);
        }
    }

    // ==========================================
    // MODAL MANAGEMENT
    // ==========================================

    /**
     * Show rejection modal for product rejection
     */
    showRejectionModal(orderId, productId) {
        try {
            this.rejectionContext = { orderId, productId };

            // Reset modal state
            this.resetRejectionModal();

            // Show modal
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
     * Reset rejection modal to initial state
     */
    resetRejectionModal() {
        // Clear reason selections
        document.querySelectorAll('.reason-option').forEach(option => {
            option.classList.remove('selected');
        });

        // Clear custom reason text
        if (this.elements.customReason) {
            this.elements.customReason.value = '';
        }
    }

    // ==========================================
    // KEYBOARD AND TOUCH SUPPORT
    // ==========================================

    /**
     * Set up keyboard shortcuts for power users
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts with Ctrl/Cmd key
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
                        if (this.manager) this.manager.switchTab('ready');
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

            // Escape key to close modals
            if (e.key === 'Escape') {
                this.closeRejectionModal();
            }
        });

        console.log('✓ Keyboard shortcuts set up');
    }

    /**
     * Set up touch gestures for mobile navigation
     */
    setupTouchGestures() {
        let touchStartX = 0;

        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        });

        document.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const diff = touchStartX - touchEndX;

            // Minimum swipe distance to trigger navigation
            if (Math.abs(diff) > 50 && this.manager) {
                const tabs = ['urgent', 'pending', 'ready', 'activity', 'manage'];
                const currentIndex = tabs.indexOf(this.manager.currentTab);

                if (diff > 0 && currentIndex < tabs.length - 1) {
                    // Swipe left - next tab
                    this.manager.switchTab(tabs[currentIndex + 1]);
                } else if (diff < 0 && currentIndex > 0) {
                    // Swipe right - previous tab
                    this.manager.switchTab(tabs[currentIndex - 1]);
                }
            }
        });

        console.log('✓ Touch gestures set up');
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    /**
     * Find product item element in DOM
     */
    findProductItem(orderId, productId) {
        const detailsContainer = document.getElementById(`details-${orderId}`);
        if (!detailsContainer) return null;

        const productItems = detailsContainer.querySelectorAll('.product-item');
        for (let item of productItems) {
            const skuElement = item.querySelector('.product-sku');
            if (skuElement && skuElement.textContent.includes(productId)) {
                return item;
            }
        }
        return null;
    }

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
     * Get order priority based on time and status
     */
    getOrderPriority(order) {
        const orderDate = new Date(order.submittedAt);
        const now = new Date();
        const hoursOld = (now - orderDate) / (1000 * 60 * 60);

        if (hoursOld > 4) return 'urgent';
        if (hoursOld > 2) return 'high';
        return 'normal';
    }

    /**
     * Update activity feed
     */
    updateActivityFeed(activities) {
        try {
            const activityTab = document.getElementById('activity-tab');
            if (!activityTab) return;

            const panelContent = activityTab.querySelector('.panel-content');
            if (!panelContent) return;

            if (activities.length === 0) {
                panelContent.innerHTML = this.createEmptyStateHTML('activity');
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
}

// Export for use in other modules
window.DashboardUI = DashboardUI;