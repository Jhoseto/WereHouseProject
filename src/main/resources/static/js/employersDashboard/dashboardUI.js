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

            // АНИМИРАНИ counter обновления
            if (urgentEl) this.animateCounter(urgentEl, data.urgentCount || 0);
            if (pendingEl) this.animateCounter(pendingEl, data.pendingCount || 0);
            if (confirmedEl) this.animateCounter(confirmedEl, data.completedCount || 0);
            if (cancelledEl) this.animateCounter(cancelledEl, data.cancelledCount || 0);

            console.log('✓ Counters animated successfully');

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

// Export for use in other modules
window.DashboardUI = DashboardUI;