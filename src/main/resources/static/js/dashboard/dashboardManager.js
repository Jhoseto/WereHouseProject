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

                // Initialize empty arrays for all tabs to avoid undefined issues
                const tabs = ['urgent', 'pending', 'ready', 'completed', 'activity'];
                tabs.forEach(tab => {
                    if (!this.loadedOrders.has(tab)) this.loadedOrders.set(tab, []);
                });

                // Update UI with initial data
                this.ui.updateCounters(this.currentCounters);
                this.ui.updateDailyStats(dashboardResponse);

                // Load orders for current tab
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
     * Load data for specific tab
     */
    async loadTabData(tabName) {
        const statusMap = {
            'urgent': 'URGENT',
            'pending': 'PENDING',
            'confirmed': 'CONFIRMED',
            'cancelled': 'CANCELLED',
            'activity': null
        };

        try {
            console.log(`Loading tab ${tabName}...`);

            if (tabName === 'activity') {
                // Load activity feed
                await this.loadActivityData();
                // Prevent undefined for UI
                this.loadedOrders.set('activity', []);
                this.ui.updateOrdersList('activity', []);
            } else {
                const status = statusMap[tabName];
                if (status) {
                    const response = await this.api.getOrdersByStatus(status, 10);
                    if (response.success) {
                        const orders = response.orders || [];
                        this.loadedOrders.set(tabName, orders);
                        this.ui.updateOrdersList(tabName, orders);
                        console.log(`✓ Loaded ${orders.length} orders for ${tabName} tab`);
                    }
                }
            }

        } catch (error) {
            console.error(`Error loading data for tab ${tabName}:`, error);
            throw error;
        }
    }


    /**
     * Load activity feed data
     */
    async loadActivityData() {
        try {
            // For now, use static activity data
            // In future, this could be from a separate endpoint
            const activities = [
                {
                    type: 'order',
                    icon: 'bi-box-seam',
                    message: 'Нова поръчка #1234 от Client Ltd.',
                    time: '15:30'
                },
                {
                    type: 'approval',
                    icon: 'bi-check-circle',
                    message: 'Поръчка #1233 одобрена успешно',
                    time: '15:25'
                },
                {
                    type: 'modification',
                    icon: 'bi-pencil',
                    message: 'Поръчка #1232 редактирана от оператор',
                    time: '15:20'
                }
            ];

            this.ui.updateActivityFeed(activities);

        } catch (error) {
            console.error('Error loading activity data:', error);
        }
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
            this.showOrderUpdateNotification(orderId, newStatus);

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
    // ORDER MANAGEMENT OPERATIONS
    // ==========================================


    /**
     * Get order details with caching
     */
    async getOrderDetails(orderId) {
        try {
            const response = await this.api.getOrderDetailsAndItems(orderId);

            if (response.success) {
                return response.data;
            } else {
                throw new Error(response.message);
            }

        } catch (error) {
            console.error(`Error getting order details for ${orderId}:`, error);
            return null;
        }
    }

    /**
     * Update product quantity with change tracking
     */
    async updateProductQuantity(orderId, productId, newQuantity) {
        try {
            // Track the change
            this.trackOrderChange(orderId, 'quantity', {
                productId: productId,
                newQuantity: newQuantity,
                timestamp: Date.now()
            });

            const response = await this.api.updateProductQuantity(orderId, productId, newQuantity);

            if (response.success) {
                this.markOrderAsModified(orderId);
                this.showSuccessNotification('Количеството е обновено');
                return true;
            } else {
                this.showErrorNotification(response.message || 'Грешка при обновяване на количеството');
                return false;
            }

        } catch (error) {
            console.error(`Error updating quantity for product ${productId}:`, error);
            this.showErrorNotification('Грешка при обновяване на количеството');
            return false;
        }
    }

    /**
     * Remove product from order
     */
    async removeProductFromOrder(orderId, productId, reason) {
        try {
            this.trackOrderChange(orderId, 'removal', {
                productId: productId,
                reason: reason,
                timestamp: Date.now()
            });

            const response = await this.api.removeProductFromOrder(orderId, productId, reason);

            if (response.success) {
                this.markOrderAsModified(orderId);
                this.showSuccessNotification('Продуктът е премахнат от поръчката');
                return true;
            } else {
                this.showErrorNotification(response.message || 'Грешка при премахване на продукта');
                return false;
            }

        } catch (error) {
            console.error(`Error removing product ${productId} from order ${orderId}:`, error);
            this.showErrorNotification('Грешка при премахване на продукта');
            return false;
        }
    }

    /**
     * Approve entire order with change notification
     */
    async approveOrder(orderId, operatorNote = '') {
        try {
            const hasChanges = this.modifiedOrders.has(orderId);

            if (hasChanges && !operatorNote) {
                // Prompt for operator note if order was modified
                operatorNote = prompt('Поръчката е модифицирана. Добавете бележка за клиента (опционално):') || '';
            }

            const response = await this.api.approveOrder(orderId, operatorNote);

            if (response.success) {
                // Clear order modifications
                this.modifiedOrders.delete(orderId);
                this.orderChanges.delete(orderId);

                // Show success message
                if (hasChanges) {
                    this.showSuccessNotification('Поръчката е одобрена. Клиентът ще получи съобщение с корекциите.');
                } else {
                    this.showSuccessNotification('Поръчката е одобрена успешно');
                }

                // Refresh current tab
                await this.refreshCurrentTab();

                return true;

            } else {
                this.showErrorNotification(response.message || 'Грешка при одобряване на поръчката');
                return false;
            }

        } catch (error) {
            console.error(`Error approving order ${orderId}:`, error);
            this.showErrorNotification('Грешка при одобряване на поръчката');
            return false;
        }
    }

    /**
     * Reject entire order
     */
    async rejectOrder(orderId, rejectionReason) {
        try {
            const response = await this.api.rejectOrder(orderId, rejectionReason);

            if (response.success) {
                // Clear order modifications
                this.modifiedOrders.delete(orderId);
                this.orderChanges.delete(orderId);

                this.showSuccessNotification('Поръчката е отказана');

                // Refresh current tab
                await this.refreshCurrentTab();

                return true;

            } else {
                this.showErrorNotification(response.message || 'Грешка при отказване на поръчката');
                return false;
            }

        } catch (error) {
            console.error(`Error rejecting order ${orderId}:`, error);
            this.showErrorNotification('Грешка при отказване на поръчката');
            return false;
        }
    }

    // ==========================================
    // CHANGE TRACKING & MODIFICATION MANAGEMENT
    // ==========================================

    /**
     * Track changes made to an order
     */
    trackOrderChange(orderId, changeType, changeData) {
        if (!this.orderChanges.has(orderId)) {
            this.orderChanges.set(orderId, []);
        }

        const changes = this.orderChanges.get(orderId);
        changes.push({
            type: changeType,
            data: changeData,
            timestamp: Date.now()
        });

        console.log(`Tracked ${changeType} change for order ${orderId}:`, changeData);
    }

    /**
     * Mark order as modified
     */
    markOrderAsModified(orderId) {
        this.modifiedOrders.add(orderId);
        this.ui.showOrderModificationIndicator(orderId);
        console.log(`Order ${orderId} marked as modified`);
    }

    /**
     * Get changes for specific order
     */
    getOrderChanges(orderId) {
        return this.orderChanges.get(orderId) || [];
    }

    /**
     * Check if order has unsaved changes
     */
    hasOrderChanges(orderId) {
        return this.modifiedOrders.has(orderId);
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
     * Refresh current tab data
     */
    async refreshCurrentTab() {
        try {
            await this.loadTabData(this.currentTab);

        } catch (error) {
            console.error('Error refreshing current tab:', error);
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
                const tabs = ['urgent', 'pending', 'ready', 'completed'];
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

    async approveOrder(orderId, operatorNote = '') {
        try {
            const response = await this.api.approveOrder(orderId, operatorNote);

            if (response.success) {
                this.ui.markOrderAsProcessed(orderId, 'approved');
                this.ui.showSuccessMessage(response.message);
                this.refreshCurrentTab();
            } else {
                this.ui.showErrorMessage(response.message);
            }

            return response;
        } catch (error) {
            console.error('Error approving order:', error);
            this.ui.showErrorMessage('Грешка при одобряване на поръчката');
        }
    }

    async rejectOrder(orderId, rejectionReason) {
        try {
            const response = await this.api.rejectOrder(orderId, rejectionReason);

            if (response.success) {
                this.ui.markOrderAsProcessed(orderId, 'rejected');
                this.ui.showSuccessMessage(response.message);
                this.refreshCurrentTab();
            } else {
                this.ui.showErrorMessage(response.message);
            }

            return response;
        } catch (error) {
            console.error('Error rejecting order:', error);
            this.ui.showErrorMessage('Грешка при отказване на поръчката');
        }
    }

    initOrderState(orderId, orderData) {
        this.orderStates.set(orderId, {
            original: this.cloneOrderData(orderData),
            pending: new Map(), // {productId: {quantity, action}}
            inventory: new Map(), // {productId: availableQty}
            hasChanges: false
        });

        // Extract inventory data
        orderData.items.forEach(item => {
            this.orderStates.get(orderId).inventory.set(
                item.productId,
                item.availableQuantity || 0
            );
        });
    }

    cloneOrderData(orderData) {
        return JSON.parse(JSON.stringify(orderData));
    }

    updatePendingQuantity(orderId, productId, newQuantity) {
        const state = this.orderStates.get(orderId);
        if (!state) return false;

        const original = state.original.items.find(item => item.productId === productId);
        const available = state.inventory.get(productId);

        // Validation
        if (newQuantity > available) {
            this.ui.showInventoryWarning(productId, newQuantity, available);
            return false;
        }

        // Track change
        if (newQuantity === original.quantity) {
            state.pending.delete(productId);
        } else {
            state.pending.set(productId, {
                quantity: newQuantity,
                originalQuantity: original.quantity,
                action: newQuantity === 0 ? 'remove' : 'modify'
            });
        }

        state.hasChanges = state.pending.size > 0;
        this.ui.updateOrderChangeIndicator(orderId, state.hasChanges);

        return true;
    }

    async processOrderWithChanges(orderId, operatorNote) {
        const state = this.orderStates.get(orderId);
        if (!state) return;

        try {
            // Phase 1: Real-time inventory check
            const inventoryCheck = await this.api.validateInventoryForChanges(orderId, Array.from(state.pending.entries()));

            if (!inventoryCheck.valid) {
                const resolution = await this.ui.showInventoryConflictDialog(inventoryCheck.conflicts);
                if (!resolution) return; // User cancelled

                // Apply resolution (auto-adjust quantities)
                this.applyInventoryResolution(orderId, resolution);
            }

            // Phase 2: Generate change summary
            const changesSummary = this.generateChangesSummary(orderId);

            // Phase 3: Atomic approval
            const approval = await this.api.approveOrderWithChanges(orderId, {
                changes: Array.from(state.pending.entries()),
                operatorNote,
                changesSummary
            });

            if (approval.success) {
                this.ui.showSuccessMessage(approval.message);
                this.orderStates.delete(orderId);
                this.refreshCurrentTab();
            }

        } catch (error) {
            this.ui.showErrorMessage('Грешка при обработка на поръчката');
        }
    }

    generateChangesSummary(orderId) {
        const state = this.orderStates.get(orderId);
        const changes = [];

        state.pending.forEach((change, productId) => {
            const original = state.original.items.find(item => item.productId === productId);

            if (change.action === 'remove') {
                changes.push(`• Премахнат: ${original.productName}`);
            } else {
                changes.push(`• ${original.productName}: ${change.originalQuantity} → ${change.quantity} бр.`);
            }
        });

        return changes.join('\n');
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

    showOrderUpdateNotification(orderId, newStatus) {
        const statusMap = {
            'urgent': 'URGENT',
            'pending': 'PENDING',
            'confirmed': 'CONFIRMED',  // ← Това е ключово!
            'cancelled': 'CANCELLED',
            'activity': null
        };

        const statusText = statusMap[newStatus] || 'обновена';
        this.showSuccessNotification(`Поръчка #${orderId} е ${statusText}`);
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