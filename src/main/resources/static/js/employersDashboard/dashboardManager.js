/**
 * DASHBOARD MANAGER - STATE COORDINATION & BUSINESS LOGIC
 * =====================================================
 * Централен координатор между API и UI компонентите.
 * Управлява състоянието на dashboard-а и обработва бизнес логиката.
 *
 * Основни отговорности:
 * - State management и data coordination
 * - Tab switching и navigation логика
 * - Real-time event processing от WebSocket
 * - Change tracking за редактирани поръчки
 * - Smart caching и refresh стратегии
 * - Error recovery и user feedback
 */

class DashboardManager {
    constructor() {
        // Core components
        this.api = null;
        this.ui = null;

        // State management
        this.currentTab = 'urgent';
        this.previousTab = null;
        this.isInitialized = false;
        this.isConnected = false;

        // Data cache and state
        this.dashboardData = null;
        this.currentCounters = null;
        this.loadedOrders = new Map();
        this.orderChanges = new Map(); // Track changes for each order

        // UI state tracking
        this.modifiedOrders = new Set();

        // Auto-refresh configuration
        this.autoRefreshInterval = null;
        this.autoRefreshEnabled = true;
        this.refreshIntervalMs = 30000; // 30 seconds fallback

        // Performance tracking
        this.lastUpdate = null;
        this.updateCount = 0;

        this.orderStates = new Map(); // {orderId: {original: {}, pending: {}, inventory: {}}}
        console.log('DashboardManager initialized');
    }

    // ==========================================
    // INITIALIZATION & SETUP
    // ==========================================

    /**
     * Initialize manager with API and UI components
     */
    async initialize(api, ui) {
        try {
            console.log('=== DashboardManager Initialization ===');

            // Connect components
            this.api = api;
            this.ui = ui;

            // Cross-reference components
            this.api.setEventCallbacks({
                onCountersUpdate: (data) => this.handleCountersUpdate(data),
                onOrderUpdate: (data) => this.handleOrderUpdate(data),
                onNewOrder: (data) => this.handleNewOrder(data),
                onConnectionStatus: (connected) => this.handleConnectionStatus(connected)
            });

            this.ui.setManager(this);

            // Start auto-refresh as fallback for WebSocket
            this.startAutoRefresh();

            this.isInitialized = true;
            console.log('✓ DashboardManager initialized successfully');

            return true;

        } catch (error) {
            console.error('Failed to initialize DashboardManager:', error);
            this.showErrorNotification('Грешка при инициализация на dashboard-а');
            return false;
        }
    }

    /**
     * Load initial dashboard data
     */
    async loadInitialData() {
        try {
            console.log('Loading initial dashboard data...');

            // Load full dashboard data
            const dashboardResponse = await this.api.getFullDashboard();

            if (dashboardResponse.success) {
                this.dashboardData = dashboardResponse;
                this.currentCounters = {
                    urgentCount: dashboardResponse.urgentCount || 0,
                    pendingCount: dashboardResponse.pendingCount || 0,
                    completedCount: dashboardResponse.completedCount || 0,
                    cancelledCount: dashboardResponse.cancelledCount || 0
                };

                // Update UI with initial data ВЕДНАГА
                this.ui.updateCounters(this.currentCounters);
                this.ui.updateDailyStats(dashboardResponse);

                // Load orders for current tab БЕЗ tab switching
                await this.loadTabData(this.currentTab);

                console.log('✓ Initial data loaded successfully');

            } else {
                throw new Error(dashboardResponse.message || 'Failed to load dashboard data');
            }

        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showErrorNotification('Грешка при зареждане на данните');
            throw error;
        }
    }


    // ==========================================
    // TAB MANAGEMENT & NAVIGATION
    // ==========================================

    /**
     * Switch to different tab with data loading
     */
    async switchTab(tabName) {
        if (tabName === this.currentTab) {
            console.log(`Already on tab: ${tabName}`);
            return;
        }

        try {
            console.log(`Switching from ${this.currentTab} to ${tabName}`);

            this.previousTab = this.currentTab;
            this.currentTab = tabName;

            // Update UI immediately for better UX
            this.ui.updateTabUI(tabName, this.previousTab);

            // Load data for new tab
            await this.loadTabData(tabName);

            console.log(`✓ Successfully switched to tab: ${tabName}`);

        } catch (error) {
            console.error(`Error switching to tab ${tabName}:`, error);

            // Revert tab on error
            this.currentTab = this.previousTab;
            this.ui.updateTabUI(this.previousTab, tabName);

            this.showErrorNotification('Грешка при зареждане на данните');
        }
    }



    /**
     * Load data for specific tab with enhanced order rendering
     */
    async loadTabData(tabName) {
        try {
            const response = await this.api.getOrdersByStatus(tabName.toUpperCase());

            if (response.success && response.orders) {
                // Форсирано рендериране
                this.ui.renderOrdersList(response.orders, `#${tabName}-orders-list`);
                console.log(`✓ Loaded ${response.orders.length} orders for ${tabName} tab`);
            } else {
                // При липса на данни
                const container = document.getElementById(`${tabName}-orders-list`);
                if (container) {
                    container.innerHTML = '<div class="no-orders">Няма поръчки за показване</div>';
                }
            }

        } catch (error) {
            console.error(`Error loading ${tabName} tab data:`, error);
            const container = document.getElementById(`${tabName}-orders-list`);
            if (container) {
                container.innerHTML = '<div class="no-orders error">Грешка при зареждане на данните</div>';
            }
        }
    }

    refreshAllTabs() {
        // Мигновенно обновяване на всички табове
        const tabs = ['urgent', 'pending', 'confirmed', 'cancelled'];

        tabs.forEach(tab => {
            this.loadTabData(tab);
        });

        // Обнови брояците
        this.refreshCounters();

        console.log('✓ Force refreshed all tabs via WebSocket');
    }


    // ==========================================
    // REAL-TIME EVENT HANDLING
    // ==========================================

    /**
     * Handle real-time counters update from WebSocket
     */
    handleCountersUpdate(data) {
        try {
            console.log('Handling counters update:', data);

            this.currentCounters = {
                urgentCount: data.urgentCount || 0,
                pendingCount: data.pendingCount || 0,
                completedCount: data.completedCount || 0,
                cancelledCount: data.cancelledCount || 0
            };

            // Update UI with animation
            this.ui.updateCounters(this.currentCounters);

            this.lastUpdate = Date.now();
            this.updateCount++;

        } catch (error) {
            console.error('Error handling counters update:', error);
        }
    }

    /**
     * Handle order status change from WebSocket
     */
    handleOrderUpdate(data) {
        try {
            console.log('Handling order update:', data);

            const { orderId, newStatus, previousStatus, orderData } = data;

            if (previousStatus) {
                this.removeOrderFromTab(orderId, previousStatus);
            }

            if (newStatus) {
                const tabMap = {
                    'URGENT': 'urgent',
                    'PENDING': 'pending',
                    'CONFIRMED': 'confirmed',
                    'CANCELLED': 'cancelled'
                };
                if (newStatus in tabMap) {
                    this.addOrderToTab(orderId, newStatus, orderData);
                }
            }

            this.refreshCounters();

        } catch (error) {
            console.error('Error handling order update:', error);
        }
    }

    /**
     * Handle new order notification from WebSocket
     */
    handleNewOrder(data) {
        try {
            console.log('Handling new order:', data);

            const { orderId, orderData } = data;
            const tabMap = {
                'URGENT': 'urgent',
                'PENDING': 'pending',
                'CONFIRMED': 'confirmed',
                'CANCELLED': 'cancelled'
            };

            if (orderData.status in tabMap) {
                this.addOrderToTab(orderId, orderData.status, orderData);
            }

            this.refreshCounters();
            this.showNewOrderNotification(orderId, orderData);

        } catch (error) {
            console.error('Error handling new order:', error);
        }
    }


    /**
     * Handle WebSocket connection status changes
     */
    handleConnectionStatus(connected) {
        this.isConnected = connected;

        if (connected) {
            console.log('✓ Real-time connection established');
            this.showSuccessNotification('Връзката е възстановена');

            // Disable auto-refresh when WebSocket is connected
            this.stopAutoRefresh();

        } else {
            console.warn('⚠ Real-time connection lost');
            this.showWarningNotification('Загубена е real-time връзката');

            // Enable auto-refresh as fallback
            this.startAutoRefresh();
        }

        // Update UI connection indicator
        this.ui.updateConnectionStatus(connected);
    }


    // ==========================================
    // REFRESH & DATA MANAGEMENT
    // ==========================================

    /**
     * Refresh dashboard data manually
     */
    async refreshDashboard() {
        try {
            console.log('Refreshing dashboard data...');

            // Show loading indicator
            this.ui.showLoadingIndicator(true);

            // Clear cache and reload
            this.api.clearCache();

            this.showSuccessNotification('Данните са обновени');

        } catch (error) {
            console.error('Error refreshing dashboard:', error);
            this.showErrorNotification('Грешка при обновяване на данните');

        } finally {
            this.ui.showLoadingIndicator(false);
        }
    }


    /**
     * Refresh only counters (lightweight operation)
     */
    async refreshCounters() {
        try {
            const response = await this.api.getCounters();

            if (response.success) {
                this.handleCountersUpdate(response);
            }

        } catch (error) {
            console.error('Error refreshing counters:', error);
        }
    }

    /**
     * Start auto-refresh timer (fallback when WebSocket is down)
     */
    startAutoRefresh() {
        if (this.autoRefreshInterval || !this.autoRefreshEnabled) return;

        console.log(`Starting auto-refresh every ${this.refreshIntervalMs}ms`);

        this.autoRefreshInterval = setInterval(async () => {
            if (!this.isConnected) {
                console.log('Auto-refreshing all tabs (WebSocket down)');
                const tabs = ['urgent', 'pending', 'confirmed', 'cancelled'];
                for (const tab of tabs) {
                    await this.loadTabData(tab);
                }
                await this.refreshCounters();
            }
        }, this.refreshIntervalMs);
    }


    /**
     * Stop auto-refresh timer
     */
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
            console.log('Auto-refresh stopped');
        }
    }


    // ==========================================
    // UTILITY METHODS
    // ==========================================

    /**
     * Remove order from specific tab
     */
    removeOrderFromTab(orderId, status) {
        const tabMap = {
            'URGENT': 'urgent',
            'PENDING': 'pending',
            'CONFIRMED': 'confirmed',
            'CANCELLED': 'cancelled'
        };

        const tabName = tabMap[status];
        if (tabName && this.loadedOrders.has(tabName)) {
            const orders = this.loadedOrders.get(tabName);
            const filteredOrders = orders.filter(order => order.id !== orderId);
            this.loadedOrders.set(tabName, filteredOrders);

            if (tabName === this.currentTab) {
                this.ui.updateOrdersList(tabName, filteredOrders);
            }
        }
    }

    /**
     * Add order to specific tab
     */
    addOrderToTab(orderId, status, orderData) {
        const tabMap = {
            'URGENT': 'urgent',
            'PENDING': 'pending',
            'CONFIRMED': 'confirmed',
            'CANCELLED': 'cancelled'
        };

        const tabName = tabMap[status];
        if (tabName) {
            if (!this.loadedOrders.has(tabName)) {
                this.loadedOrders.set(tabName, []);
            }

            const orders = this.loadedOrders.get(tabName);
            orders.unshift(orderData); // Add to beginning

            if (tabName === this.currentTab) {
                this.ui.updateOrdersList(tabName, orders);
            }
        }
    }

    // ==========================================
    // NOTIFICATION HELPERS
    // ==========================================

    showSuccessNotification(message) {
        if (window.toastManager) {
            window.toastManager.success(message);
        }
    }

    showErrorNotification(message) {
        if (window.toastManager) {
            window.toastManager.error(message);
        }
    }

    showWarningNotification(message) {
        if (window.toastManager) {
            window.toastManager.warning(message);
        }
    }

    showNewOrderNotification(orderId, orderData) {
        this.showSuccessNotification(`Нова поръчка #${orderId} от ${orderData.clientName || 'клиент'}`);
    }

    /**
     * Cleanup resources when dashboard is closed
     */
    destroy() {
        this.stopAutoRefresh();

        if (this.api) {
            this.api.destroy();
        }

        console.log('DashboardManager destroyed');
    }
}

// Export for use in other modules
window.DashboardManager = DashboardManager;