/**
 * ORDER REVIEW MAIN ORCHESTRATOR - SYSTEM COORDINATION & INITIALIZATION
 * =====================================================================
 * This file serves as the conductor for the entire order review system.
 * It coordinates between OrderReviewCatalog, existing dashboard infrastructure,
 * real-time data updates, and user interface components.
 *
 * Architectural Philosophy:
 * - Coordination without tight coupling between components
 * - Graceful degradation when individual components fail
 * - Hybrid data loading strategy for optimal performance
 * - Professional error handling and user feedback
 * - Integration bridge between new catalog interface and existing backend
 *
 * Key Responsibilities:
 * - Initialize all components in proper sequence
 * - Establish real-time data connections
 * - Handle component communication and state synchronization
 * - Manage error recovery and fallback strategies
 * - Coordinate approval workflow with backend validation
 */

class OrderReviewOrchestrator {
    constructor() {
        // Core component references - initialized during setup
        this.dashboardManager = null;
        this.dashboardApi = null;
        this.orderReviewCatalog = null;

        // Configuration from server-side template
        this.config = window.orderReviewConfig || {};

        // State management for order review process
        this.isInitialized = false;
        this.currentOrderId = this.config.orderId;
        this.orderData = null;
        this.realTimeEnabled = false;
        this.errorCount = 0;
        this.maxRetries = 3;

        // Component status tracking for health monitoring
        this.componentStatus = {
            dashboardApi: 'pending',      // pending, connected, error
            orderCatalog: 'pending',      // pending, loaded, error
            realTimeData: 'pending',      // pending, streaming, error
            backendValidation: 'pending'  // pending, available, error
        };

        // Event listeners collection for cleanup
        this.eventListeners = new Map();

        // Performance monitoring for optimization
        this.performanceMetrics = {
            initStartTime: Date.now(),
            firstDataLoad: null,
            realTimeConnected: null,
            userFirstInteraction: null
        };

        console.log('OrderReviewOrchestrator initialized for order:', this.currentOrderId);
    }

    // ==========================================
    // INITIALIZATION SEQUENCE - STEP-BY-STEP SYSTEM STARTUP
    // ==========================================

    /**
     * Main initialization method - coordinates entire system startup
     * This follows a careful sequence to ensure dependencies are available
     * when each component needs them
     */
    async initialize() {
        try {
            console.log('=== ORDER REVIEW SYSTEM INITIALIZATION ===');
            this.updateLoadingState('Initializing order review system...');

            // Step 1: Validate configuration and prerequisites
            this.validateConfiguration();

            // Step 2: Initialize dashboard infrastructure components
            await this.initializeDashboardInfrastructure();

            // Step 3: Load initial order data using hybrid strategy
            await this.loadInitialOrderData();

            // Step 4: Initialize order review catalog with loaded data
            await this.initializeOrderReviewCatalog();

            // Step 5: Establish real-time data connections
            await this.establishRealTimeConnections();

            // Step 6: Set up user interface event handlers
            this.setupUserInterfaceEvents();

            // Step 7: Initialize workflow state management
            this.initializeWorkflowManagement();

            // Step 8: Complete initialization and show interface
            this.completeInitialization();

            console.log('✓ Order review system fully initialized');
            return true;

        } catch (error) {
            console.error('Failed to initialize order review system:', error);
            this.handleInitializationError(error);
            return false;
        }
    }

    /**
     * Validate that all required configuration is available
     * Early validation prevents mysterious failures later in the process
     */
    validateConfiguration() {
        console.log('Validating system configuration...');

        // Check for required configuration values
        const requiredConfig = ['orderId', 'csrfToken', 'csrfHeader'];
        const missingConfig = requiredConfig.filter(key => !this.config[key]);

        if (missingConfig.length > 0) {
            throw new Error(`Missing required configuration: ${missingConfig.join(', ')}`);
        }

        // Validate order ID format (should be numeric)
        if (!Number.isInteger(this.config.orderId) || this.config.orderId <= 0) {
            throw new Error(`Invalid order ID: ${this.config.orderId}`);
        }

        // Check for DOM elements required by the interface
        const requiredElements = [
            'order-items-container',
            'loading-state',
            'approval-controls',
            'order-statistics'
        ];

        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        if (missingElements.length > 0) {
            throw new Error(`Missing required DOM elements: ${missingElements.join(', ')}`);
        }

        console.log('✓ Configuration validation completed');
    }

    /**
     * Initialize dashboard infrastructure components
     * This connects us to the existing dashboard system for backend communication
     */
    async initializeDashboardInfrastructure() {
        console.log('Initializing dashboard infrastructure...');

        try {
            // Check if dashboard components are already available globally
            if (window.mainDashboard && window.mainDashboard.api) {
                console.log('Using existing dashboard infrastructure');
                this.dashboardApi = window.mainDashboard.api;
                this.dashboardManager = window.mainDashboard.manager;
                this.componentStatus.dashboardApi = 'connected';

            } else {
                console.log('Creating new dashboard API instance');

                // Create new dashboard API instance for order review
                this.dashboardApi = new DashboardApi();
                await this.dashboardApi.initialize();
                this.componentStatus.dashboardApi = 'connected';

                // Create lightweight dashboard manager for state coordination
                this.dashboardManager = new DashboardManager();
                await this.dashboardManager.initialize(this.dashboardApi, null);
            }

            console.log('✓ Dashboard infrastructure ready');

        } catch (error) {
            this.componentStatus.dashboardApi = 'error';
            throw new Error(`Dashboard infrastructure initialization failed: ${error.message}`);
        }
    }

    /**
     * Load initial order data using hybrid loading strategy
     * Combines server-side data with fresh backend queries for optimal performance
     */
    async loadInitialOrderData() {
        console.log('Loading initial order data...');
        this.updateLoadingState('Loading order details...');

        try {
            // Use server-side data as initial state if available
            if (this.config.orderData && this.config.orderData.id) {
                console.log('Using server-side order data as initial state');
                this.orderData = this.config.orderData;
                this.updateOrderStatistics(this.orderData);
            }

            // Always fetch fresh data from backend for accuracy
            console.log('Fetching fresh order data from backend...');
            const freshOrderData = await this.dashboardApi.getOrderDetails(this.currentOrderId);

            if (freshOrderData.success) {
                // Merge fresh data with initial data, preferring fresh values
                this.orderData = {
                    ...this.orderData,
                    ...freshOrderData.data,
                    items: freshOrderData.data.items || [],
                    // Track data freshness for user feedback
                    dataTimestamp: new Date().toISOString(),
                    dataSource: 'fresh'
                };

                console.log(`✓ Order data loaded: ${this.orderData.items.length} items`);
                this.performanceMetrics.firstDataLoad = Date.now();

            } else {
                throw new Error(freshOrderData.message || 'Failed to load order data');
            }

        } catch (error) {
            console.warn('Fresh data loading failed, using cached data if available:', error);

            // Fallback to server-side data if backend request fails
            if (this.orderData && this.orderData.id) {
                console.log('Using server-side data as fallback');
                this.orderData.dataSource = 'cached';
                this.orderData.dataTimestamp = 'unknown';
                this.showDataFreshnessWarning();
            } else {
                throw new Error('No order data available from any source');
            }
        }
    }

    /**
     * Initialize OrderReviewCatalog with loaded data
     * This creates the main catalog interface component
     */
    async initializeOrderReviewCatalog() {
        console.log('Initializing order review catalog...');
        this.updateLoadingState('Setting up product catalog interface...');

        try {
            // Create OrderReviewCatalog instance with proper dependencies
            this.orderReviewCatalog = new OrderReviewCatalog(
                this.currentOrderId,
                this.dashboardManager
            );

            // Initialize catalog with loaded order data
            await this.orderReviewCatalog.init();

            // Set up catalog event handlers for coordination
            this.setupCatalogEventHandlers();

            this.componentStatus.orderCatalog = 'loaded';
            console.log('✓ Order review catalog initialized');

        } catch (error) {
            this.componentStatus.orderCatalog = 'error';
            throw new Error(`Catalog initialization failed: ${error.message}`);
        }
    }

    /**
     * Establish real-time data connections for live inventory updates
     * This implements the real-time portion of our hybrid data strategy
     */
    async establishRealTimeConnections() {
        console.log('Establishing real-time data connections...');

        try {
            // Set up WebSocket callbacks for real-time inventory updates
            if (this.dashboardApi && this.dashboardApi.connectWebSocket) {

                // Set up inventory update callbacks
                this.dashboardApi.onInventoryUpdate = (inventoryData) => {
                    this.handleRealTimeInventoryUpdate(inventoryData);
                };

                // Set up order status change callbacks
                this.dashboardApi.onOrderUpdate = (orderUpdate) => {
                    this.handleRealTimeOrderUpdate(orderUpdate);
                };

                // Monitor connection status
                this.dashboardApi.onConnectionStatus = (isConnected) => {
                    this.handleRealTimeConnectionStatus(isConnected);
                };

                this.realTimeEnabled = true;
                this.componentStatus.realTimeData = 'streaming';
                this.performanceMetrics.realTimeConnected = Date.now();

                console.log('✓ Real-time connections established');

            } else {
                console.warn('Real-time connections not available, using polling fallback');
                this.setupPollingFallback();
            }

        } catch (error) {
            console.warn('Real-time connection failed, continuing without live updates:', error);
            this.componentStatus.realTimeData = 'error';
            this.setupPollingFallback();
        }
    }

    /**
     * Set up user interface event handlers
     * This connects UI interactions to business logic
     */
    setupUserInterfaceEvents() {
        console.log('Setting up user interface event handlers...');

        // Approval controls event handlers
        this.addEventHandler('approve-order', 'click', () => this.handleOrderApproval());
        this.addEventHandler('reject-order', 'click', () => this.handleOrderRejection());
        this.addEventHandler('preview-corrections', 'click', () => this.handleCorrectionPreview());

        // Modal event handlers
        this.addEventHandler('confirm-rejection', 'click', () => this.handleRejectionConfirmation());
        this.addEventHandler('cancel-rejection', 'click', () => this.handleRejectionCancellation());
        this.addEventHandler('modal-close', 'click', () => this.handleModalClose());

        // Workflow indicators event handlers
        document.querySelectorAll('.workflow-step').forEach((step, index) => {
            this.addEventHandler(step.id, 'click', () => this.handleWorkflowStepClick(index));
        });

        // Keyboard shortcuts for power users
        this.addEventHandler(document, 'keydown', (event) => this.handleKeyboardShortcuts(event));

        // Mobile-specific touch events
        if ('ontouchstart' in window) {
            this.setupMobileSpecificEvents();
        }

        console.log('✓ User interface events configured');
    }

    /**
     * Initialize workflow state management
     * This tracks and manages the review process workflow
     */
    initializeWorkflowManagement() {
        console.log('Initializing workflow state management...');

        // Set initial workflow state based on order status and available data
        this.currentWorkflowStep = this.determineInitialWorkflowStep();
        this.updateWorkflowIndicators();

        // Initialize change tracking for corrections
        this.changeTracker = {
            modifications: new Map(),
            removals: new Set(),
            additions: new Map(),
            startTime: Date.now()
        };

        // Set up workflow transition rules
        this.workflowRules = {
            'analysis': ['corrections', 'approval'], // Can go to corrections or direct approval
            'corrections': ['analysis', 'approval'], // Can go back to analysis or forward to approval
            'approval': ['corrections']               // Can only go back to corrections if needed
        };

        console.log(`✓ Workflow initialized in '${this.currentWorkflowStep}' state`);
    }

    /**
     * Complete initialization and show the interface
     * Final step that transitions from loading state to working interface
     */
    completeInitialization() {
        console.log('Completing system initialization...');

        // Hide loading state
        this.hideLoadingState();

        // Show main interface
        this.showOrderInterface();

        // Update performance metrics
        const initTime = Date.now() - this.performanceMetrics.initStartTime;
        console.log(`✓ System initialization completed in ${initTime}ms`);

        // Mark as fully initialized
        this.isInitialized = true;

        // Set up health monitoring
        this.startHealthMonitoring();

        // Trigger initial data validation
        this.validateDataConsistency();

        // Show system ready notification
        this.showSystemReadyNotification();
    }

    // ==========================================
    // REAL-TIME DATA HANDLING - LIVE INVENTORY UPDATES
    // ==========================================

    /**
     * Handle real-time inventory updates from WebSocket
     * This keeps stock levels current as warehouse operations occur
     */
    handleRealTimeInventoryUpdate(inventoryData) {
        console.log('Processing real-time inventory update:', inventoryData);

        try {
            // Update catalog with fresh inventory data
            if (this.orderReviewCatalog && inventoryData.productUpdates) {
                inventoryData.productUpdates.forEach(update => {
                    this.orderReviewCatalog.updateProductAvailability(
                        update.productId,
                        update.currentStock,
                        update.reservedStock
                    );
                });

                // Update statistics with new availability counts
                this.recalculateOrderStatistics();

                // Show subtle notification about data freshness
                this.showDataUpdateNotification('Stock levels updated');
            }

        } catch (error) {
            console.error('Error processing inventory update:', error);
        }
    }

    /**
     * Handle real-time order status updates
     * This responds to changes made by other operators or system processes
     */
    handleRealTimeOrderUpdate(orderUpdate) {
        console.log('Processing real-time order update:', orderUpdate);

        try {
            if (orderUpdate.orderId === this.currentOrderId) {
                // Check if another operator modified this order
                if (orderUpdate.modifiedBy !== this.getCurrentUserId()) {
                    this.handleConcurrentModification(orderUpdate);
                }

                // Update order status if changed
                if (orderUpdate.newStatus !== this.orderData.status) {
                    this.handleOrderStatusChange(orderUpdate.newStatus);
                }
            }

        } catch (error) {
            console.error('Error processing order update:', error);
        }
    }

    /**
     * Handle real-time connection status changes
     * This manages fallback strategies when connectivity issues occur
     */
    handleRealTimeConnectionStatus(isConnected) {
        if (isConnected) {
            console.log('✓ Real-time connection restored');
            this.componentStatus.realTimeData = 'streaming';
            this.hideConnectivityWarning();

            // Request fresh data after reconnection
            this.refreshDataAfterReconnection();

        } else {
            console.warn('⚠ Real-time connection lost');
            this.componentStatus.realTimeData = 'error';
            this.showConnectivityWarning();

            // Start polling fallback
            this.setupPollingFallback();
        }
    }

    // ==========================================
    // USER INTERACTION HANDLERS - BUSINESS WORKFLOW ACTIONS
    // ==========================================

    /**
     * Handle order approval with backend validation
     * This implements the critical final validation we discussed
     */
    async handleOrderApproval() {
        console.log('Processing order approval request...');

        try {
            // Track user interaction timing
            if (!this.performanceMetrics.userFirstInteraction) {
                this.performanceMetrics.userFirstInteraction = Date.now();
            }

            // Show approval in progress
            this.showApprovalInProgress();

            // Generate correction note from tracked changes
            const correctionNote = this.generateCorrectionNote();

            // Critical: Final backend validation before approval
            console.log('Performing final backend validation...');
            const validationResult = await this.performFinalValidation();

            if (!validationResult.success) {
                this.handleValidationFailure(validationResult);
                return;
            }

            // Proceed with approval using dashboard manager
            const approvalResult = await this.dashboardManager.approveOrder(
                this.currentOrderId,
                correctionNote
            );

            if (approvalResult.success) {
                this.handleApprovalSuccess(approvalResult);
            } else {
                this.handleApprovalFailure(approvalResult);
            }

        } catch (error) {
            console.error('Order approval failed:', error);
            this.handleApprovalError(error);
        } finally {
            this.hideApprovalInProgress();
        }
    }

    /**
     * Perform final backend validation
     * This is the critical safety check we discussed earlier
     */
    async performFinalValidation() {
        console.log('Performing final inventory and business rules validation...');

        try {
            // Collect all modifications for validation
            const modificationsToValidate = {
                orderId: this.currentOrderId,
                modifications: Array.from(this.changeTracker.modifications.entries()),
                removals: Array.from(this.changeTracker.removals),
                additions: Array.from(this.changeTracker.additions.entries()),
                timestamp: new Date().toISOString()
            };

            // Call backend validation endpoint
            const response = await fetch('/employer/dashboard/validate-order-approval', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [this.config.csrfHeader]: this.config.csrfToken
                },
                body: JSON.stringify(modificationsToValidate)
            });

            const validationResult = await response.json();

            if (validationResult.success) {
                console.log('✓ Final validation passed');
                this.componentStatus.backendValidation = 'available';
            } else {
                console.warn('⚠ Final validation failed:', validationResult.errors);
            }

            return validationResult;

        } catch (error) {
            console.error('Final validation request failed:', error);
            return {
                success: false,
                errors: ['Unable to perform final validation. Please try again.'],
                canProceed: false
            };
        }
    }

    // ==========================================
    // UTILITY METHODS - SUPPORT FUNCTIONS
    // ==========================================

    /**
     * Add event listener with automatic cleanup tracking
     * This ensures proper memory management and prevents event leaks
     */
    addEventHandler(elementOrId, eventType, handler) {
        const element = typeof elementOrId === 'string'
            ? document.getElementById(elementOrId)
            : elementOrId;

        if (element) {
            element.addEventListener(eventType, handler);

            // Track for cleanup
            if (!this.eventListeners.has(element)) {
                this.eventListeners.set(element, []);
            }
            this.eventListeners.get(element).push({ eventType, handler });
        }
    }

    /**
     * Update loading state with user-friendly message
     */
    updateLoadingState(message) {
        const loadingElement = document.getElementById('loading-state');
        if (loadingElement) {
            const messageElement = loadingElement.querySelector('p');
            if (messageElement) {
                messageElement.textContent = message;
            }
            loadingElement.classList.remove('hidden');
        }
    }

    /**
     * Hide loading state and show main interface
     */
    hideLoadingState() {
        const loadingElement = document.getElementById('loading-state');
        if (loadingElement) {
            loadingElement.classList.add('hidden');
        }

        const containerElement = document.getElementById('order-items-container');
        if (containerElement) {
            containerElement.classList.remove('hidden');
        }
    }

    /**
     * Show system ready notification to user
     */
    showSystemReadyNotification() {
        if (window.toastManager) {
            window.toastManager.success(
                `Order review system ready. Order ${this.currentOrderId} loaded with ${this.orderData.items.length} items.`,
                'System Ready'
            );
        }
    }

    /**
     * Cleanup method for proper resource management
     * Called when user navigates away or system shuts down
     */
    destroy() {
        console.log('Cleaning up order review system...');

        // Remove all event listeners
        this.eventListeners.forEach((listeners, element) => {
            listeners.forEach(({ eventType, handler }) => {
                element.removeEventListener(eventType, handler);
            });
        });
        this.eventListeners.clear();

        // Cleanup catalog component
        if (this.orderReviewCatalog && typeof this.orderReviewCatalog.destroy === 'function') {
            this.orderReviewCatalog.destroy();
        }

        // Cleanup dashboard connections
        if (this.dashboardApi && typeof this.dashboardApi.destroy === 'function') {
            this.dashboardApi.destroy();
        }

        console.log('✓ Order review system cleanup completed');
    }
}

// ==========================================
// GLOBAL INITIALIZATION AND ERROR HANDLING
// ==========================================

/**
 * Global initialization function
 * This is called when the page loads and DOM is ready
 */
async function initializeOrderReviewSystem() {
    console.log('=== STARTING ORDER REVIEW SYSTEM INITIALIZATION ===');

    try {
        // Create orchestrator instance
        window.orderReviewOrchestrator = new OrderReviewOrchestrator();

        // Initialize the system
        const success = await window.orderReviewOrchestrator.initialize();

        if (success) {
            console.log('✓ Order review system successfully initialized');
        } else {
            throw new Error('System initialization returned false');
        }

    } catch (error) {
        console.error('Critical error during order review system initialization:', error);

        // Show user-friendly error message
        if (window.toastManager) {
            window.toastManager.error(
                'Failed to initialize order review system. Please refresh the page or contact support.',
                'System Error'
            );
        }

        // Fallback to basic order display if available
        showFallbackOrderDisplay();
    }
}

/**
 * Fallback display when main system fails
 * Provides basic order information even if advanced features don't work
 */
function showFallbackOrderDisplay() {
    console.log('Activating fallback order display...');

    // Hide loading state
    const loadingElement = document.getElementById('loading-state');
    if (loadingElement) {
        loadingElement.classList.add('hidden');
    }

    // Show basic order information
    const containerElement = document.getElementById('order-items-container');
    if (containerElement) {
        containerElement.innerHTML = `
            <div style="padding: 2rem; text-align: center; background: white; border-radius: 8px;">
                <h3>Order Review - Basic Mode</h3>
                <p>Advanced features are currently unavailable. Please refresh the page to try again.</p>
                <p>Order ID: ${window.orderReviewConfig?.orderId || 'Unknown'}</p>
                <button onclick="window.location.reload()" style="padding: 0.5rem 1rem; margin-top: 1rem;">
                    Refresh Page
                </button>
            </div>
        `;
        containerElement.classList.remove('hidden');
    }
}

/**
 * Cleanup on page unload
 * Ensures proper resource cleanup when user navigates away
 */
window.addEventListener('beforeunload', function() {
    if (window.orderReviewOrchestrator && typeof window.orderReviewOrchestrator.destroy === 'function') {
        window.orderReviewOrchestrator.destroy();
    }
});

// ==========================================
// AUTOMATIC INITIALIZATION
// ==========================================

/**
 * Initialize when DOM is ready
 * This ensures all HTML elements are available before we try to use them
 */
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure all scripts are loaded
    setTimeout(initializeOrderReviewSystem, 100);
});

// Export for manual access if needed
window.OrderReviewOrchestrator = OrderReviewOrchestrator;