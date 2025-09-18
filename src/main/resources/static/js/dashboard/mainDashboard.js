/**
 * MAIN DASHBOARD - INITIALIZATION & ORCHESTRATION
 * ==============================================
 * Главен координатор на цялата dashboard система.
 * Инициализира всички компоненти и осигурява API за HTML handlers.
 *
 * Основни отговорности:
 * - Initialization lifecycle management
 * - Component connection и configuration
 * - Global API exposure за HTML onclick handlers
 * - Error handling и graceful degradation
 * - Configuration management от server-side данни
 */

class MainDashboard {
    constructor() {
        // Core components
        this.api = null;
        this.manager = null;
        this.ui = null;

        // Configuration from server
        this.config = null;

        // Initialization state
        this.isInitialized = false;
        this.initializationPromise = null;

        // Error handling
        this.lastError = null;
        this.errorCount = 0;

        console.log('MainDashboard created');
    }

    // ==========================================
    // INITIALIZATION & LIFECYCLE
    // ==========================================

    /**
     * Initialize the entire dashboard system
     */
    async initialize() {
        // Prevent multiple initialization attempts
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._performInitialization();
        return this.initializationPromise;
    }

    /**
     * Perform the actual initialization steps
     */
    async _performInitialization() {
        try {
            console.log('=== MAIN DASHBOARD INITIALIZATION ===');

            // Step 1: Load and validate configuration
            this.loadConfiguration();

            // Step 2: Create core components
            this.createComponents();

            // Step 3: Initialize components in sequence
            await this.initializeComponents();

            // Step 4: Connect components together
            this.connectComponents();

            // Step 5: Expose global API for HTML
            this.exposeGlobalAPI();

            // Step 6: Setup error handling
            this.setupErrorHandling();

            this.isInitialized = true;
            console.log('✓ MainDashboard initialized successfully');

            // Show success notification
            if (window.toastManager) {
                window.toastManager.success('Dashboard заредено успешно', '');
            }

            return true;

        } catch (error) {
            console.error('Failed to initialize MainDashboard:', error);
            this.lastError = error;
            this.errorCount++;

            // Show error notification
            if (window.toastManager) {
                window.toastManager.error('Грешка при зареждане на dashboard-а', 'Инициализация');
            }

            // Attempt graceful degradation
            this.handleInitializationError(error);

            throw error;
        }
    }


    /**
     * Load configuration from window.dashboardConfig
     */
    loadConfiguration() {
        console.log('Loading dashboard configuration...');

        this.config = window.dashboardConfig || {};

        // Validate required configuration
        if (!this.config.csrfToken) {
            throw new Error('CSRF token не е намерен в конфигурацията');
        }

        // Set defaults for missing configuration
        this.config.csrfHeader = this.config.csrfHeader || 'X-CSRF-TOKEN';
        this.config.userId = this.config.userId || '';
        this.config.initialDashboardData = this.config.initialDashboardData || {};

        // Expose configuration globally for components
        window.csrfToken = this.config.csrfToken;
        window.csrfHeader = this.config.csrfHeader;

        console.log('✓ Configuration loaded:', {
            hasToken: !!this.config.csrfToken,
            hasInitialData: !!this.config.initialDashboardData,
            userId: this.config.userId
        });
    }

    /**
     * Create component instances
     */
    createComponents() {
        console.log('Creating dashboard components...');

        // Create components
        this.api = new DashboardApi();
        this.manager = new DashboardManager();
        this.ui = new DashboardUI();

        console.log('✓ Components created');
    }

    /**
     * Initialize components in proper sequence
     */
    async initializeComponents() {
        console.log('Initializing components...');

        // Initialize API client first (establishes connections)
        const apiSuccess = await this.api.initialize();
        if (!apiSuccess) {
            throw new Error('Failed to initialize API client');
        }

        // Initialize UI (DOM setup and event listeners)
        this.ui.initialize();

        // Initialize manager last (coordinates everything)
        const managerSuccess = await this.manager.initialize(this.api, this.ui);
        if (!managerSuccess) {
            throw new Error('Failed to initialize Dashboard Manager');
        }
        await this.manager.loadInitialData();

        console.log('✓ All components initialized');
    }

    /**
     * Connect components together
     */
    connectComponents() {
        console.log('Connecting components...');

        // Manager is already connected to API and UI during its initialization
        // UI has reference to manager through setManager()
        // API has callbacks set by manager

        console.log('✓ Components connected');
    }

    /**
     * Expose global API for HTML onclick handlers and external access
     */
    exposeGlobalAPI() {
        console.log('Exposing global API...');

        // Main dashboard object for external access
        window.mainDashboard = this;

        // Global functions for HTML onclick handlers
        // These delegate to the appropriate component methods

        // ===== DASHBOARD CONTROL FUNCTIONS =====

        window.refreshDashboard = () => {
            if (this.isReady()) {
                return this.manager.refreshDashboard();
            }
        };

        window.switchTab = (tabName) => {
            if (this.isReady() && this.manager) {
                return this.manager.switchTab(tabName);
            } else {
                console.warn('Dashboard not ready for tab switching');
            }
        };

        // ===== ORDER INTERACTION FUNCTIONS =====


        // Global function for order details viewing
        window.viewOrderDetails = function(orderId) {
            if (window.mainDashboard?.manager) {
                const detailUrl = `/employer/dashboard/order/${orderId}/detailOrder`;
                window.open(detailUrl, '_blank');
            }
        };


    }

    /**
     * Setup error handling and recovery mechanisms
     */
    setupErrorHandling() {
        // Global error handler for unhandled dashboard errors
        window.addEventListener('error', (event) => {
            if (event.filename && (event.filename.includes('dashboard') || event.filename.includes('Dashboard'))) {
                console.error('Dashboard error caught:', event.error);
                this.handleGlobalError(event.error);
            }
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            if (event.reason && event.reason.stack && event.reason.stack.includes('Dashboard')) {
                console.error('Dashboard promise rejection:', event.reason);
                this.handleGlobalError(event.reason);
            }
        });

        console.log('✓ Error handling setup complete');
    }

    // ==========================================
    // ERROR HANDLING & RECOVERY
    // ==========================================

    /**
     * Handle initialization errors with graceful degradation
     */
    handleInitializationError(error) {
        console.warn('Attempting graceful degradation due to initialization error');

        // Try to provide minimal functionality
        try {
            // At minimum, ensure the UI component works for basic interactions
            if (!this.ui && window.DashboardUI) {
                this.ui = new DashboardUI();
                this.ui.initialize();
                console.log('✓ Minimal UI functionality restored');
            }

            // Expose basic API even if backend is unavailable
            this.exposeBasicAPI();

        } catch (degradationError) {
            console.error('Graceful degradation also failed:', degradationError);
        }
    }

    /**
     * Handle global errors during runtime
     */
    handleGlobalError(error) {
        this.errorCount++;
        this.lastError = error;

        console.error(`Dashboard error #${this.errorCount}:`, error);

        // Show user-friendly error message
        if (window.toastManager) {
            window.toastManager.error('Възникна техническа грешка', 'Dashboard');
        }

        // Attempt recovery if error count is not too high
        if (this.errorCount < 3) {
            console.log('Attempting error recovery...');
            setTimeout(() => {
                this.attemptRecovery();
            }, 5000);
        }
    }

    /**
     * Attempt to recover from errors
     */
    async attemptRecovery() {
        try {
            console.log('Attempting dashboard recovery...');

            // Check if components are still functional
            if (this.api && this.manager) {
                // Try to refresh data
                await this.manager.refreshCounters();
                console.log('✓ Recovery successful');

                if (window.toastManager) {
                    window.toastManager.success('Връзката е възстановена');
                }

                // Reset error count on successful recovery
                this.errorCount = 0;

            } else {
                console.warn('Components are corrupted, full restart needed');
            }

        } catch (recoveryError) {
            console.error('Recovery attempt failed:', recoveryError);
        }
    }

    /**
     * Expose basic API when full initialization fails
     */
    exposeBasicAPI() {
        console.log('Exposing basic fallback API...');

        // Provide non-functional stubs to prevent JavaScript errors
        const noOp = () => {
            if (window.toastManager) {
                window.toastManager.warning('Тази функция не е достъпна в момента');
            }
        };

        window.refreshDashboard = noOp;
        window.switchTab = noOp;
        window.updateProductQuantity = noOp;
        window.approveOrder = noOp;
        window.rejectOrder = noOp;

        console.log('✓ Basic fallback API exposed');
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    /**
     * Check if dashboard is ready for operations
     */
    isReady() {
        return this.isInitialized && this.manager && this.api && this.ui;
    }

    /**
     * Get dashboard status for debugging
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasAPI: !!this.api,
            hasManager: !!this.manager,
            hasUI: !!this.ui,
            isConnected: this.api?.wsConnected || false,
            errorCount: this.errorCount,
            lastError: this.lastError?.message,
            currentTab: this.manager?.currentTab
        };
    }

    /**
     * Manually trigger data refresh (for debugging)
     */
    async forceRefresh() {
        if (this.isReady()) {
            try {
                await this.manager.refreshDashboard();
                console.log('✓ Manual refresh completed');
            } catch (error) {
                console.error('Manual refresh failed:', error);
            }
        } else {
            console.warn('Dashboard not ready for refresh');
        }
    }

    /**
     * Cleanup resources when page is unloaded
     */
    destroy() {
        console.log('Destroying MainDashboard...');

        try {
            if (this.manager) {
                this.manager.destroy();
            }

            if (this.api) {
                this.api.destroy();
            }

            // Clear global references
            delete window.mainDashboard;
            delete window.refreshDashboard;
            delete window.switchTab;
            delete window.toggleOrderDetails;
            delete window.updateProductQuantity;
            delete window.approveOrder;
            delete window.rejectOrder;

            console.log('✓ MainDashboard destroyed');

        } catch (error) {
            console.error('Error during dashboard destruction:', error);
        }
    }
}

// ==========================================
// AUTO-INITIALIZATION
// ==========================================

window.dashboardApi = null;
window.showOrderDetails = null;
window.updateOrderDetailsUI = null;
/**
 * Auto-initialize dashboard when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async function() {
    console.log('=== DASHBOARD AUTO-INITIALIZATION ===');

    try {
        // Create and initialize main dashboard
        const mainDashboard = new MainDashboard();
        await mainDashboard.initialize();

        console.log('✓ Dashboard auto-initialization completed');

    } catch (error) {
        console.error('Dashboard auto-initialization failed:', error);

        // Show critical error to user
        if (window.toastManager) {
            window.toastManager.error('Грешка при зареждане на dashboard-а. Моля опитайте да презаредите страницата.', 'Критична грешка');
        }
    }
});


window.updateItemQuantity = function(orderId, productId, newQuantity) {
    if (window.mainDashboard && window.mainDashboard.manager) {
        window.mainDashboard.manager.updateProductQuantity(orderId, productId, newQuantity);
    }
};

window.approveOrderWithNote = function(orderId) {
    const noteTextarea = document.getElementById(`operator-note-${orderId}`);
    const operatorNote = noteTextarea ? noteTextarea.value.trim() : '';

    if (window.mainDashboard && window.mainDashboard.manager) {
        window.mainDashboard.manager.approveOrder(orderId, operatorNote);
    }
};

window.showRejectDialog = function(orderId) {
    const reason = prompt('Причина за отказване на поръчката:');
    if (reason && reason.trim()) {
        if (window.mainDashboard && window.mainDashboard.manager) {
            window.mainDashboard.manager.rejectOrder(orderId, reason.trim());
        }
    }
};

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', function() {
    if (window.mainDashboard && typeof window.mainDashboard.destroy === 'function') {
        window.mainDashboard.destroy();
    }
});
window.showOrderDetails = function(orderData) {
    let orderId = orderData?.id || orderData?.order?.id || orderData;
    if (window.toggleOrderDetails) {
        window.toggleOrderDetails(orderId);
    }
};

// Експортирай dashboardApi глобално
Object.defineProperty(window, 'dashboardApi', {
    get: function() {
        return window.mainDashboard?.api || null;
    }
});
// Export for manual access if needed
window.MainDashboard = MainDashboard;