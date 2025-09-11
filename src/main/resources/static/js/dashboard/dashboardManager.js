/**
 * DASHBOARD MANAGER - CORE DASHBOARD LOGIC
 * ========================================
 * Central coordinator for all dashboard operations
 * Manages data flow, state, and business logic
 * Integrates API calls with UI updates
 */

class DashboardManager {
    constructor(config = {}) {
        this.config = config;
        this.api = new DashboardAPI(config);
        this.ui = null; // Will be set when DashboardUI is initialized

        // State management
        this.currentTab = 'urgent';
        this.dashboardData = {};
        this.expandedOrders = new Set();
        this.refreshInterval = null;

        // Cache for performance
        this.orderCache = new Map();
        this.lastRefresh = null;

        console.log('DashboardManager initialized with config:', config);
    }

    /**
     * Initialize dashboard - the main entry point
     * Sets up all components and starts the dashboard
     */
    async initialize() {
        try {
            console.log('=== DashboardManager Initialization ===');

            // Set up auto-refresh if enabled
            if (this.config.enableRealTimeUpdates) {
                this.startAutoRefresh();
            }

            // Load initial dashboard data
            await this.loadDashboardData();

            console.log('✓ DashboardManager initialized successfully');

        } catch (error) {
            console.error('Failed to initialize dashboard:', error);
            this.api.showWarning('Възникна грешка при зареждане на dashboard-а');
        }
    }

    /**
     * Set the UI manager reference
     * This creates the connection between data logic and UI operations
     */
    setUI(uiManager) {
        this.ui = uiManager;
        console.log('✓ UI Manager connected to Dashboard Manager');
    }

    // ==========================================
    // DATA MANAGEMENT
    // ==========================================

    /**
     * Load complete dashboard data from server
     * Updates both counters and initial order lists
     */
    async loadDashboardData() {
        try {
            console.log('🔄 Loading dashboard data from server...');

            // Get overview data (counters and statistics)
            const apiResponse = await this.api.getDashboardOverview();

            if (apiResponse.success && apiResponse.data) {
                console.log('✅ API data received successfully');

                // ✅ CRITICAL FIX: Handle the ACTUAL structure from AdminDashboardController
                // The data comes wrapped in DashboardOverviewResponseDTO
                const serverData = apiResponse.data;

                // ✅ Map the actual field names from DashboardOverviewResponseDTO
                this.dashboardData = {
                    submittedCount: this.safeParseInt(serverData.submittedCount, 0),
                    confirmedCount: this.safeParseInt(serverData.confirmedCount, 0),
                    pickedCount: this.safeParseInt(serverData.pickedCount, 0),
                    shippedCount: this.safeParseInt(serverData.shippedCount, 0),
                    cancelledCount: this.safeParseInt(serverData.cancelledCount, 0),

                    // Daily stats (same structure)
                    dailyStats: serverData.dailyStats || {
                        processed: 0,
                        revenue: '0.0',
                        avgTime: '0.0ч',
                        activeClients: 0
                    },

                    // Metadata
                    hasUrgentAlerts: serverData.hasUrgentAlerts || false,
                    lastUpdate: new Date().toISOString(),
                    isValid: true,
                    error: null
                };

                this.lastRefresh = new Date();

                // ✅ Update UI with correctly mapped data
                if (this.ui) {
                    // Create the data structure that UI expects
                    const uiData = {
                        urgentCount: this.dashboardData.submittedCount,
                        pendingCount: this.dashboardData.confirmedCount,
                        readyCount: this.dashboardData.pickedCount,
                        completedCount: this.dashboardData.shippedCount,
                        cancelledCount: this.dashboardData.cancelledCount,
                        dailyStats: this.dashboardData.dailyStats
                    };

                    this.ui.updateCounters(uiData);
                    this.ui.updateDailyStats(this.dashboardData.dailyStats);
                }

                // ✅ Load data for current tab
                await this.loadTabData(this.currentTab);

                console.log('✅ Dashboard data loaded and processed successfully');

            } else {
                throw new Error(apiResponse.message || 'API request returned unsuccessful response');
            }

        } catch (error) {
            console.error('❌ Error loading dashboard data from API:', error);

            // ✅ FALLBACK: Try to use initial data from HTML
            console.log('🔄 Attempting to use initial data from server as fallback...');
            this.tryLoadInitialData();
        }
    }

    tryLoadInitialData() {
        try {
            if (window.dashboardConfig && window.dashboardConfig.initialDashboardData) {
                const initialData = window.dashboardConfig.initialDashboardData;

                if (initialData.isValid) {
                    console.log('✅ Using initial data from HTML as fallback');

                    // ✅ Map initial data structure to internal structure
                    this.dashboardData = {
                        submittedCount: this.safeParseInt(initialData.submittedCount, 0),
                        confirmedCount: this.safeParseInt(initialData.confirmedCount, 0),
                        pickedCount: this.safeParseInt(initialData.pickedCount, 0),
                        shippedCount: this.safeParseInt(initialData.shippedCount, 0),
                        cancelledCount: this.safeParseInt(initialData.cancelledCount, 0),
                        dailyStats: initialData.dailyStats || {
                            processed: 0,
                            revenue: '0.0',
                            avgTime: '0.0ч',
                            activeClients: 0
                        },
                        hasUrgentAlerts: initialData.hasUrgentAlerts || false,
                        lastUpdate: initialData.lastUpdate || new Date().toISOString(),
                        isValid: true,
                        error: null
                    };

                    if (this.ui) {
                        const uiData = {
                            urgentCount: this.dashboardData.submittedCount,
                            pendingCount: this.dashboardData.confirmedCount,
                            readyCount: this.dashboardData.pickedCount,
                            completedCount: this.dashboardData.shippedCount,
                            cancelledCount: this.dashboardData.cancelledCount,
                            dailyStats: this.dashboardData.dailyStats
                        };

                        this.ui.updateCounters(uiData);
                        this.ui.updateDailyStats(this.dashboardData.dailyStats);
                    }

                    // Load tab data
                    this.loadTabData(this.currentTab);

                    console.log('✅ Fallback data loaded successfully');
                    return;
                }
            }

            // ✅ Final fallback - show error state
            console.error('❌ No valid data source available');
            this.showGracefulDegradation();

        } catch (error) {
            console.error('❌ Error loading initial data:', error);
            this.showGracefulDegradation();
        }
    }

    showGracefulDegradation() {
        if (this.ui) {
            // Show zero counts but keep UI functional
            const fallbackData = {
                urgentCount: 0,
                pendingCount: 0,
                readyCount: 0,
                completedCount: 0,
                cancelledCount: 0,
                dailyStats: {
                    processed: 0,
                    revenue: '0.0',
                    avgTime: '0.0ч',
                    activeClients: 0
                }
            };

            this.ui.updateCounters(fallbackData);
            this.ui.updateDailyStats(fallbackData.dailyStats);

            // Show error message
            if (window.toastManager) {
                window.toastManager.showError('Не могат да бъдат заредени данните за dashboard-а. Моля, опреснете страницата.');
            } else {
                console.error('Dashboard data could not be loaded');
            }
        }
    }


    safeParseInt(value, defaultValue = 0) {
        if (value === null || value === undefined || value === '') {
            return defaultValue;
        }

        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? defaultValue : parsed;
    }

    /**
     * Load orders for a specific tab/status
     * Provides data for tab content updates
     */
    async loadTabData(tabName) {
        try {
            const statusMap = {
                'urgent': 'SUBMITTED',
                'pending': 'CONFIRMED',
                'ready': 'PICKED',
                'activity': null // Special case for activity feed
            };

            const status = statusMap[tabName];

            if (status) {
                console.log(`Loading ${tabName} tab data for status: ${status}`);

                // Check cache first for better performance
                const cacheKey = `orders_${status}`;
                if (this.orderCache.has(cacheKey) && this.isCacheValid(cacheKey)) {
                    const cachedData = this.orderCache.get(cacheKey);
                    if (this.ui) {
                        this.ui.updateTabContent(tabName, cachedData.orders);
                    }
                    return;
                }

                // Fetch fresh data from server
                const data = await this.api.getOrdersByStatus(status);

                if (data.success) {
                    // API връща "data" обект вътре
                    const apiData = data.data || {};
                    const safeOrders = Array.isArray(apiData.orders) ? apiData.orders : [];

                    this.orderCache.set(cacheKey, {
                        orders: safeOrders,
                        timestamp: new Date(),
                        totalCount: apiData.totalCount || 0
                    });

                    if (this.ui) {
                        this.ui.updateTabContent(tabName, safeOrders);
                    }

                    console.log(`✓ Loaded ${safeOrders.length} orders for ${tabName} tab`);
                } else {
                    throw new Error(data.message || 'Failed to load tab data');
                }

            } else if (tabName === 'activity') {
                // Load activity feed data (different endpoint or logic)
                await this.loadActivityData();
            }

        } catch (error) {
            console.error(`Error loading tab data for ${tabName}:`, error);
            this.api.showWarning(`Грешка при зареждане на ${tabName} данните`);
        }
    }

    /**
     * Load activity feed data
     * Shows recent actions and system events
     */
    async loadActivityData() {
        try {
            // For now, we'll use cached dashboard data
            // In the future, this could be a separate API endpoint
            const activities = this.generateActivityFeed();

            if (this.ui) {
                this.ui.updateActivityFeed(activities);
            }

        } catch (error) {
            console.error('Error loading activity data:', error);
        }
    }

    /**
     * Generate activity feed from current data
     * Creates timeline of recent events
     */
    generateActivityFeed() {
        const activities = [];

        // This would typically come from a real activity log
        // For now, generate some sample activities based on current data
        if (this.dashboardData.completedCount > 0) {
            activities.push({
                type: 'shipped',
                message: `${this.dashboardData.completedCount} поръчки изпратени днес`,
                time: 'Преди 10 мин',
                icon: 'bi-truck'
            });
        }

        if (this.dashboardData.urgentCount > 0) {
            activities.push({
                type: 'submitted',
                message: `${this.dashboardData.urgentCount} нови поръчки за обработка`,
                time: 'Преди 15 мин',
                icon: 'bi-plus-circle'
            });
        }

        return activities;
    }

    // ==========================================
    // ORDER OPERATIONS
    // ==========================================

    /**
     * Confirm an order and refresh relevant data
     * Handles the complete workflow of order confirmation
     */
    async confirmOrder(orderId) {
        try {
            console.log(`Processing order confirmation for order ${orderId}`);

            const result = await this.api.confirmOrder(orderId);

            if (result.success) {
                this.api.showSuccess(`Поръчка #${orderId} потвърдена успешно`);

                // Refresh dashboard data to reflect changes
                await this.refreshDashboard();

                console.log(`✓ Order ${orderId} confirmed successfully`);
            } else {
                throw new Error(result.message || 'Failed to confirm order');
            }

        } catch (error) {
            console.error(`Error confirming order ${orderId}:`, error);
            this.api.showWarning(`Грешка при потвърждаване на поръчка #${orderId}`);
        }
    }

    /**
     * Start picking process for an order
     */
    async startPicking(orderId) {
        try {
            console.log(`Starting picking process for order ${orderId}`);

            const result = await this.api.startPicking(orderId);

            if (result.success) {
                this.api.showInfo(`Пикинг започнат за поръчка #${orderId}`);
                await this.refreshDashboard();

                console.log(`✓ Picking started for order ${orderId}`);
            } else {
                throw new Error(result.message || 'Failed to start picking');
            }

        } catch (error) {
            console.error(`Error starting picking for order ${orderId}:`, error);
            this.api.showWarning(`Грешка при започване на пикинг за поръчка #${orderId}`);
        }
    }

    /**
     * Ship an order
     */
    async shipOrder(orderId) {
        try {
            console.log(`Shipping order ${orderId}`);

            const result = await this.api.shipOrder(orderId);

            if (result.success) {
                this.api.showSuccess(`Поръчка #${orderId} изпратена успешно`);
                await this.refreshDashboard();

                console.log(`✓ Order ${orderId} shipped successfully`);
            } else {
                throw new Error(result.message || 'Failed to ship order');
            }

        } catch (error) {
            console.error(`Error shipping order ${orderId}:`, error);
            this.api.showWarning(`Грешка при изпращане на поръчка #${orderId}`);
        }
    }

    // ==========================================
    // PRODUCT OPERATIONS
    // ==========================================

    /**
     * Update product quantity in an order
     * Handles validation and immediate UI feedback
     */
    async updateProductQuantity(orderId, productId, quantity) {
        try {
            // Validate input
            const qty = Math.max(0, parseInt(quantity) || 0);

            console.log(`Updating quantity for product ${productId} in order ${orderId} to ${qty}`);

            const result = await this.api.updateProductQuantity(orderId, productId, qty);

            if (result.success) {
                // Provide immediate UI feedback
                if (this.ui) {
                    this.ui.highlightQuantityUpdate(orderId, productId, qty);
                }

                this.api.showInfo(`Количество обновено: ${qty}`);

                console.log(`✓ Quantity updated for product ${productId} in order ${orderId}`);
            } else {
                throw new Error(result.message || 'Failed to update quantity');
            }

        } catch (error) {
            console.error(`Error updating quantity:`, error);
            this.api.showWarning('Грешка при обновяване на количеството');

            // Revert UI changes on error
            if (this.ui) {
                this.ui.revertQuantityUpdate(orderId, productId);
            }
        }
    }

    /**
     * Approve a product in an order
     */
    async approveProduct(orderId, productId) {
        try {
            console.log(`Approving product ${productId} in order ${orderId}`);

            const result = await this.api.approveProduct(orderId, productId);

            if (result.success) {
                // Update UI immediately for responsive feel
                if (this.ui) {
                    this.ui.markProductApproved(orderId, productId);
                }

                this.api.showSuccess(`Продукт одобрен`);

                console.log(`✓ Product ${productId} approved in order ${orderId}`);
            } else {
                throw new Error(result.message || 'Failed to approve product');
            }

        } catch (error) {
            console.error(`Error approving product:`, error);
            this.api.showWarning('Грешка при одобряване на продукта');
        }
    }

    /**
     * Reject a product with reason
     */
    async rejectProduct(orderId, productId, reason) {
        try {
            console.log(`Rejecting product ${productId} in order ${orderId} with reason: ${reason}`);

            const result = await this.api.rejectProduct(orderId, productId, reason);

            if (result.success) {
                // Update UI immediately
                if (this.ui) {
                    this.ui.markProductRejected(orderId, productId, reason);
                }

                this.api.showInfo(`Продукт отказан: ${reason}`);

                console.log(`✓ Product ${productId} rejected in order ${orderId}`);
            } else {
                throw new Error(result.message || 'Failed to reject product');
            }

        } catch (error) {
            console.error(`Error rejecting product:`, error);
            this.api.showWarning('Грешка при отказване на продукта');
        }
    }

    // ==========================================
    // TAB AND VIEW MANAGEMENT
    // ==========================================

    /**
     * Switch to a different dashboard tab
     * Manages tab state and loads appropriate data
     */
    async switchTab(tabName) {
        try {
            console.log(`Switching to tab: ${tabName}`);

            // Update current tab state
            const previousTab = this.currentTab;
            this.currentTab = tabName;

            // Collapse any expanded orders when switching tabs
            this.collapseAllOrders();

            // Update UI immediately for responsive feel
            if (this.ui) {
                this.ui.updateTabUI(tabName, previousTab);
            }

            // Load data for the new tab
            await this.loadTabData(tabName);

            console.log(`✓ Switched to ${tabName} tab`);

        } catch (error) {
            console.error(`Error switching to tab ${tabName}:`, error);
            // Revert tab state on error
            this.currentTab = previousTab;
            if (this.ui) {
                this.ui.updateTabUI(previousTab, tabName);
            }
        }
    }

    /**
     * Toggle order details expansion
     */
    toggleOrderDetails(orderId) {
        try {
            const isExpanded = this.expandedOrders.has(orderId);

            if (isExpanded) {
                this.collapseOrder(orderId);
            } else {
                this.expandOrder(orderId);
            }

        } catch (error) {
            console.error(`Error toggling order details for ${orderId}:`, error);
        }
    }

    /**
     * Expand a specific order
     */
    expandOrder(orderId) {
        // Collapse all other orders first (accordion behavior)
        this.collapseAllOrders();

        // Expand the selected order
        this.expandedOrders.add(orderId);

        if (this.ui) {
            this.ui.expandOrder(orderId);
        }

        console.log(`Order ${orderId} expanded`);
    }

    /**
     * Collapse a specific order
     */
    collapseOrder(orderId) {
        this.expandedOrders.delete(orderId);

        if (this.ui) {
            this.ui.collapseOrder(orderId);
        }

        console.log(`Order ${orderId} collapsed`);
    }

    /**
     * Collapse all expanded orders
     */
    collapseAllOrders() {
        this.expandedOrders.forEach(orderId => {
            if (this.ui) {
                this.ui.collapseOrder(orderId);
            }
        });

        this.expandedOrders.clear();
    }

    // ==========================================
    // AUTO-REFRESH SYSTEM
    // ==========================================

    /**
     * Start automatic dashboard refresh
     */
    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        const interval = this.config.refreshInterval || 180000; // 3 minutes default

        this.refreshInterval = setInterval(() => {
            this.refreshDashboard();
        }, interval);

        console.log(`Auto-refresh started: every ${interval / 1000} seconds`);
    }

    /**
     * Stop automatic refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            console.log('Auto-refresh stopped');
        }
    }

    /**
     * Manual refresh of dashboard data
     */
    async refreshDashboard() {
        try {
            console.log('Refreshing dashboard...');

            // Clear cache to force fresh data
            this.orderCache.clear();

            // Collapse expanded orders during refresh
            this.collapseAllOrders();

            // Reload all data
            await this.loadDashboardData();

            console.log('✓ Dashboard refreshed successfully');

        } catch (error) {
            console.error('Error refreshing dashboard:', error);
            this.api.showWarning('Грешка при обновяване на dashboard-а');
        }
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    /**
     * Check if cached data is still valid
     */
    isCacheValid(cacheKey) {
        const cached = this.orderCache.get(cacheKey);
        if (!cached) return false;

        const age = Date.now() - cached.timestamp.getTime();
        const maxAge = 30000; // 30 seconds

        return age < maxAge;
    }

    /**
     * Get current dashboard state for debugging
     */
    getState() {
        return {
            currentTab: this.currentTab,
            expandedOrders: Array.from(this.expandedOrders),
            lastRefresh: this.lastRefresh,
            cacheSize: this.orderCache.size,
            dashboardData: this.dashboardData
        };
    }

    /**
     * Clean up resources when dashboard is destroyed
     */
    destroy() {
        this.stopAutoRefresh();
        this.orderCache.clear();
        this.expandedOrders.clear();
        console.log('DashboardManager destroyed');
    }
}

// Export for use in other modules
window.DashboardManager = DashboardManager;