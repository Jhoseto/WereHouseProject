/**
 * ORDER DETAIL SHIPPED - MOBILE-OPTIMIZED WAREHOUSE INTERFACE
 * ===========================================================
 * Система за управление на изпращането на обработени поръчки
 * Оптимизирана за складови служители с мобилни устройства
 */

class OrderDetailShipped {
    constructor() {
        // Core properties
        this.config = window.shippedOrderConfig || {};
        this.orderId = this.config.orderId;
        this.dashboardApi = null;

        // Data management
        this.orderData = null;
        this.orderItems = [];
        this.filteredItems = [];
        this.loadingTracking = new Map(); // Track loaded items

        // UI state management
        this.currentFilter = 'all';
        this.currentSort = 'name';
        this.searchTerm = '';
        this.isControlsExpanded = false;

        // DOM element references
        this.elements = {};

        // Event listeners tracking
        this.eventListeners = new Map();

        // Touch handling for mobile optimization
        this.touchStartTime = 0;
        this.touchStartPos = { x: 0, y: 0 };
    }

    /**
     * Initialize the shipped orders interface
     * Sets up all necessary components and loads initial data
     */
    async initialize() {
        try {
            console.log('🚛 Initializing OrderDetailShipped interface...');

            // Validate configuration
            this.validateConfiguration();

            // Initialize dashboard API connection
            await this.initializeDashboardApi();

            // Cache DOM elements for performance
            this.cacheElementReferences();

            // Set up all event listeners
            this.setupEventListeners();

            // Load and display order data
            await this.loadOrderData();

            // Initialize mobile-specific features
            this.initializeMobileFeatures();

            // Set up auto-save functionality
            this.setupAutoSave();

            console.log('✅ OrderDetailShipped initialization complete');
            return true;

        } catch (error) {
            console.error('❌ Failed to initialize OrderDetailShipped:', error);
            this.showErrorState(error.message);
            return false;
        }
    }

    /**
     * Validate required configuration and DOM elements
     */
    validateConfiguration() {
        // Check configuration
        if (!this.orderId || this.orderId <= 0) {
            throw new Error('Invalid order ID provided');
        }

        if (!this.config.csrfToken || !this.config.csrfHeader) {
            throw new Error('CSRF configuration missing');
        }

        // Check required DOM elements
        const requiredElements = [
            'order-items-container',
            'loading-state',
            'shipping-controls',
            'complete-shipping'
        ];

        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        if (missingElements.length > 0) {
            throw new Error(`Missing required DOM elements: ${missingElements.join(', ')}`);
        }
    }

    /**
     * Initialize dashboard API connection
     */
    async initializeDashboardApi() {
        if (window.dashboardApi) {
            this.dashboardApi = window.dashboardApi;
            console.log('✓ Using existing dashboard API instance');
        } else {
            // Create new instance if needed
            this.dashboardApi = new DashboardApi();
            await this.dashboardApi.initialize();
            window.dashboardApi = this.dashboardApi;
            console.log('✓ Created new dashboard API instance');
        }
    }

    /**
     * Cache DOM element references for better performance
     */
    cacheElementReferences() {
        this.elements = {
            // Container elements
            loadingState: document.getElementById('loading-state'),
            itemsContainer: document.getElementById('order-items-container'),
            emptyState: document.getElementById('empty-state'),

            // Controls
            controlsHeader: document.querySelector('.controls-header'),
            controlsPanel: document.getElementById('controls-panel'),
            toggleControls: document.getElementById('toggle-controls'),

            // Search and filters
            searchInput: document.getElementById('search-input'),
            clearSearch: document.getElementById('clear-search'),
            filterButtons: document.querySelectorAll('.filter-btn'),
            sortSelect: document.getElementById('sort-select'),

            // Statistics
            totalItems: document.getElementById('total-items'),
            loadedItems: document.getElementById('loaded-items'),
            remainingItems: document.getElementById('remaining-items'),

            // Shipping controls
            shippingControls: document.getElementById('shipping-controls'),
            completeBtn: document.getElementById('complete-shipping'),
            progressFill: document.getElementById('progress-fill'),
            progressLoaded: document.getElementById('progress-loaded'),
            progressTotal: document.getElementById('progress-total'),

            // Modal elements
            shippingModal: document.getElementById('shipping-modal'),
            modalOrderNumber: document.getElementById('modal-order-number'),
            modalTotalItems: document.getElementById('modal-total-items'),
            modalLoadedItems: document.getElementById('modal-loaded-items'),
            cancelShipping: document.getElementById('cancel-shipping'),
            confirmShipping: document.getElementById('confirm-shipping'),
            closeModal: document.getElementById('close-shipping-modal')
        };
    }

    /**
     * Set up all event listeners for the interface
     */
    setupEventListeners() {
        // Controls panel toggle
        if (this.elements.controlsHeader) {
            this.addEventListener(this.elements.controlsHeader, 'click', () => {
                this.toggleControlsPanel();
            });
        }

        // Search functionality
        if (this.elements.searchInput) {
            this.addEventListener(this.elements.searchInput, 'input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        if (this.elements.clearSearch) {
            this.addEventListener(this.elements.clearSearch, 'click', () => {
                this.clearSearch();
            });
        }

        // Filter buttons
        this.elements.filterButtons.forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                this.handleFilterChange(e.target.dataset.filter);
            });
        });

        // Sort dropdown
        if (this.elements.sortSelect) {
            this.addEventListener(this.elements.sortSelect, 'change', (e) => {
                this.handleSortChange(e.target.value);
            });
        }

        // Complete shipping button
        if (this.elements.completeBtn) {
            this.addEventListener(this.elements.completeBtn, 'click', () => {
                this.showShippingModal();
            });
        }

        // Modal event listeners
        this.setupModalEventListeners();

        // Mobile-specific event listeners
        this.setupMobileEventListeners();
    }

    /**
     * Set up modal-specific event listeners
     */
    setupModalEventListeners() {
        if (this.elements.cancelShipping) {
            this.addEventListener(this.elements.cancelShipping, 'click', () => {
                this.hideShippingModal();
            });
        }

        if (this.elements.confirmShipping) {
            this.addEventListener(this.elements.confirmShipping, 'click', () => {
                this.completeShipping();
            });
        }

        if (this.elements.closeModal) {
            this.addEventListener(this.elements.closeModal, 'click', () => {
                this.hideShippingModal();
            });
        }

        // Close modal on overlay click
        if (this.elements.shippingModal) {
            this.addEventListener(this.elements.shippingModal, 'click', (e) => {
                if (e.target === this.elements.shippingModal) {
                    this.hideShippingModal();
                }
            });
        }
    }

    /**
     * Set up mobile-specific event listeners and optimizations
     */
    setupMobileEventListeners() {
        // Prevent zoom on double tap for better UX
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });

        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 100);
        });

        // Optimize scrolling performance
        document.addEventListener('touchmove', (e) => {
            // Allow scrolling within containers
            const scrollableParent = e.target.closest('.order-items-container, .modal-container');
            if (!scrollableParent) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    /**
     * Load order data and initialize interface
     */
    async loadOrderData() {
        try {
            this.showLoadingState('Зареждане на данни за поръчката...');

            // Fetch order details from API
            const response = await this.dashboardApi.getOrderDetailsAndItems(this.orderId);

            if (!response.success) {
                throw new Error(response.message || 'Failed to load order data');
            }

            this.orderData = response.data;
            this.orderItems = this.orderData.items || [];

            // Initialize loading tracking
            this.initializeLoadingTracking();

            // Update statistics
            this.updateStatistics();

            // Apply initial filters and render items
            this.applyFiltersAndRender();

            // Update UI state
            this.updateShippingControls();

            this.hideLoadingState();

            console.log(`✓ Loaded ${this.orderItems.length} items for order ${this.orderId}`);

        } catch (error) {
            console.error('❌ Failed to load order data:', error);
            this.showErrorState(error.message);
        }
    }

    /**
     * Initialize loading tracking for each item
     */
    initializeLoadingTracking() {
        this.orderItems.forEach(item => {
            // Check if item was previously loaded (from localStorage if needed)
            const isLoaded = this.getItemLoadedState(item.id);
            this.loadingTracking.set(item.id, isLoaded);
        });
    }

    /**
     * Get loaded state for an item (can be enhanced with localStorage)
     */
    getItemLoadedState(itemId) {
        // For now, assume all items start as not loaded
        // This can be enhanced to persist state in localStorage
        return false;
    }

    /**
     * Toggle controls panel visibility
     */
    toggleControlsPanel() {
        this.isControlsExpanded = !this.isControlsExpanded;

        const panel = this.elements.controlsPanel;
        const toggleBtn = this.elements.toggleControls;

        if (this.isControlsExpanded) {
            panel.classList.add('expanded');
            toggleBtn.classList.add('expanded');
        } else {
            panel.classList.remove('expanded');
            toggleBtn.classList.remove('expanded');
        }
    }

    /**
     * Handle search input changes
     */
    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase().trim();

        // Show/hide clear button
        if (this.searchTerm) {
            this.elements.clearSearch.classList.remove('hidden');
        } else {
            this.elements.clearSearch.classList.add('hidden');
        }

        // Apply filters and re-render
        this.applyFiltersAndRender();
    }

    /**
     * Clear search input and filters
     */
    clearSearch() {
        this.searchTerm = '';
        this.elements.searchInput.value = '';
        this.elements.clearSearch.classList.add('hidden');
        this.applyFiltersAndRender();
    }

    /**
     * Handle filter button changes
     */
    handleFilterChange(filter) {
        this.currentFilter = filter;

        // Update active button
        this.elements.filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        this.applyFiltersAndRender();
    }

    /**
     * Handle sort dropdown changes
     */
    handleSortChange(sortBy) {
        this.currentSort = sortBy;
        this.applyFiltersAndRender();
    }

    /**
     * Apply current filters and sort, then render items
     */
    applyFiltersAndRender() {
        // Start with all items
        let filtered = [...this.orderItems];

        // Apply search filter
        if (this.searchTerm) {
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(this.searchTerm) ||
                item.category.toLowerCase().includes(this.searchTerm)
            );
        }

        // Apply status filter
        switch (this.currentFilter) {
            case 'loaded':
                filtered = filtered.filter(item => this.loadingTracking.get(item.id));
                break;
            case 'pending':
                filtered = filtered.filter(item => !this.loadingTracking.get(item.id));
                break;
            // 'all' shows everything
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (this.currentSort) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'category':
                    return a.category.localeCompare(b.category);
                case 'quantity':
                    return b.quantity - a.quantity;
                case 'status':
                    const aLoaded = this.loadingTracking.get(a.id);
                    const bLoaded = this.loadingTracking.get(b.id);
                    return aLoaded === bLoaded ? 0 : (aLoaded ? 1 : -1);
                default:
                    return 0;
            }
        });

        this.filteredItems = filtered;
        this.renderItems();
    }

    /**
     * Render filtered and sorted items
     */
    renderItems() {
        const container = this.elements.itemsContainer;

        if (this.filteredItems.length === 0) {
            this.showEmptyState();
            return;
        }

        // Hide empty state and show container
        this.elements.emptyState.classList.add('hidden');
        container.classList.remove('hidden');

        // Clear existing content
        container.innerHTML = '';

        // Render each item
        this.filteredItems.forEach(item => {
            const itemElement = this.createItemElement(item);
            container.appendChild(itemElement);
        });
    }

    /**
     * Create DOM element for a single order item
     */
    createItemElement(item) {
        const isLoaded = this.loadingTracking.get(item.id);

        const itemDiv = document.createElement('div');
        itemDiv.className = `order-item ${isLoaded ? 'loaded' : ''}`;
        itemDiv.dataset.itemId = item.id;

        itemDiv.innerHTML = `
            <div class="item-header">
                <div class="item-info">
                    <div class="item-name">${this.escapeHtml(item.name)}</div>
                    <div class="item-details">
                        <div class="item-category">${this.escapeHtml(item.category)}</div>
                        <div class="item-quantity">Количество: ${item.quantity}</div>
                    </div>
                </div>
                <button class="load-toggle ${isLoaded ? 'loaded' : ''}" 
                        data-item-id="${item.id}"
                        aria-label="${isLoaded ? 'Отмяна на зареждането' : 'Отбелязване като заредено'}">
                    <i class="bi ${isLoaded ? 'bi-check-circle-fill' : 'bi-circle'}"></i>
                </button>
            </div>
        `;

        // Add event listener to toggle button
        const toggleBtn = itemDiv.querySelector('.load-toggle');
        this.addEventListener(toggleBtn, 'click', (e) => {
            e.preventDefault();
            this.toggleItemLoaded(item.id);
        });

        // Add touch feedback for mobile
        this.addTouchFeedback(toggleBtn);

        return itemDiv;
    }

    /**
     * Toggle loaded state for an item
     */
    toggleItemLoaded(itemId) {
        const currentState = this.loadingTracking.get(itemId);
        const newState = !currentState;

        // Update tracking
        this.loadingTracking.set(itemId, newState);

        // Update UI
        const itemElement = document.querySelector(`[data-item-id="${itemId}"]`).closest('.order-item');
        const toggleBtn = document.querySelector(`[data-item-id="${itemId}"]`);
        const icon = toggleBtn.querySelector('i');

        if (newState) {
            // Item is now loaded
            itemElement.classList.add('loaded');
            toggleBtn.classList.add('loaded');
            icon.className = 'bi bi-check-circle-fill';
            toggleBtn.setAttribute('aria-label', 'Отмяна на зареждането');
        } else {
            // Item is now unloaded
            itemElement.classList.remove('loaded');
            toggleBtn.classList.remove('loaded');
            icon.className = 'bi bi-circle';
            toggleBtn.setAttribute('aria-label', 'Отбелязване като заредено');
        }

        // Update statistics and controls
        this.updateStatistics();
        this.updateShippingControls();

        // Save state (can be enhanced with localStorage)
        this.saveItemState(itemId, newState);

        // Provide haptic feedback on mobile
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }

    /**
     * Update statistics display
     */
    updateStatistics() {
        const total = this.orderItems.length;
        const loaded = Array.from(this.loadingTracking.values()).filter(Boolean).length;
        const remaining = total - loaded;

        this.elements.totalItems.textContent = total;
        this.elements.loadedItems.textContent = loaded;
        this.elements.remainingItems.textContent = remaining;

        // Update progress bar
        const percentage = total > 0 ? (loaded / total) * 100 : 0;
        this.elements.progressFill.style.width = `${percentage}%`;
        this.elements.progressLoaded.textContent = loaded;
        this.elements.progressTotal.textContent = total;
    }

    /**
     * Update shipping controls state
     */
    updateShippingControls() {
        const total = this.orderItems.length;
        const loaded = Array.from(this.loadingTracking.values()).filter(Boolean).length;
        const allLoaded = total > 0 && loaded === total;

        this.elements.completeBtn.disabled = !allLoaded;

        if (allLoaded) {
            this.elements.completeBtn.innerHTML = `
                <i class="bi bi-check-circle"></i>
                Потвърди изпращането
            `;
        } else {
            this.elements.completeBtn.innerHTML = `
                <i class="bi bi-clock"></i>
                Заредете всички артикули (${loaded}/${total})
            `;
        }
    }

    /**
     * Show shipping confirmation modal
     */
    showShippingModal() {
        const total = this.orderItems.length;
        const loaded = Array.from(this.loadingTracking.values()).filter(Boolean).length;

        // Update modal content
        this.elements.modalOrderNumber.textContent = this.orderId;
        this.elements.modalTotalItems.textContent = total;
        this.elements.modalLoadedItems.textContent = loaded;

        // Show modal
        this.elements.shippingModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Hide shipping confirmation modal
     */
    hideShippingModal() {
        this.elements.shippingModal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    /**
     * Complete shipping process
     */
    async completeShipping() {
        try {
            // Disable buttons to prevent double submission
            this.elements.confirmShipping.disabled = true;
            this.elements.confirmShipping.innerHTML = `
                <div class="loading-spinner" style="width: 20px; height: 20px; margin-right: 8px;"></div>
                Потвърждаване...
            `;

            // Call API to mark order as shipped
            const response = await this.dashboardApi.markOrderAsShipped(this.orderId);

            if (response.success) {
                // Show success message
                if (window.toastManager) {
                    window.toastManager.success('Поръчката е успешно маркирана като изпратена!');
                }

                // Redirect to dashboard after short delay
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1500);

            } else {
                throw new Error(response.message || 'Failed to mark order as shipped');
            }

        } catch (error) {
            console.error('❌ Failed to complete shipping:', error);

            // Re-enable button
            this.elements.confirmShipping.disabled = false;
            this.elements.confirmShipping.innerHTML = `
                <i class="bi bi-check-circle"></i>
                Потвърди изпращането
            `;

            // Show error message
            if (window.toastManager) {
                window.toastManager.error('Грешка при потвърждаване на изпращането: ' + error.message);
            }
        }
    }

    /**
     * Show loading state
     */
    showLoadingState(message = 'Зареждане...') {
        this.elements.loadingState.classList.remove('hidden');
        this.elements.itemsContainer.classList.add('hidden');
        this.elements.emptyState.classList.add('hidden');

        const loadingText = this.elements.loadingState.querySelector('p');
        if (loadingText) {
            loadingText.textContent = message;
        }
    }

    /**
     * Hide loading state
     */
    hideLoadingState() {
        this.elements.loadingState.classList.add('hidden');
    }

    /**
     * Show empty state
     */
    showEmptyState() {
        this.elements.emptyState.classList.remove('hidden');
        this.elements.itemsContainer.classList.add('hidden');
    }

    /**
     * Show error state
     */
    showErrorState(message) {
        this.hideLoadingState();

        if (window.toastManager) {
            window.toastManager.error(message);
        } else {
            alert('Грешка: ' + message);
        }
    }

    /**
     * Initialize mobile-specific features
     */
    initializeMobileFeatures() {
        // Optimize for iOS Safari
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            document.body.classList.add('ios-device');

            // Fix iOS 100vh issue
            const updateViewportHeight = () => {
                const vh = window.innerHeight * 0.01;
                document.documentElement.style.setProperty('--vh', `${vh}px`);
            };

            updateViewportHeight();
            window.addEventListener('resize', updateViewportHeight);
        }

        // Add pull-to-refresh hint
        this.addPullToRefreshHint();
    }

    /**
     * Add pull-to-refresh hint for mobile users
     */
    addPullToRefreshHint() {
        let startY = 0;
        let isRefreshing = false;

        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (isRefreshing || window.scrollY > 0) return;

            const currentY = e.touches[0].clientY;
            const pullDistance = currentY - startY;

            if (pullDistance > 100) {
                isRefreshing = true;
                this.refreshData();
            }
        });

        document.addEventListener('touchend', () => {
            startY = 0;
            isRefreshing = false;
        });
    }

    /**
     * Refresh order data
     */
    async refreshData() {
        await this.loadOrderData();
    }

    /**
     * Handle orientation changes
     */
    handleOrientationChange() {
        // Re-calculate layouts if needed
        this.updateShippingControls();
    }

    /**
     * Set up auto-save functionality
     */
    setupAutoSave() {
        // Auto-save loading state every 30 seconds
        setInterval(() => {
            this.saveAllItemStates();
        }, 30000);

        // Save on page unload
        window.addEventListener('beforeunload', () => {
            this.saveAllItemStates();
        });
    }

    /**
     * Save individual item state (can be enhanced with localStorage)
     */
    saveItemState(itemId, isLoaded) {
        // For now, just log. Can be enhanced to use localStorage
        console.log(`Item ${itemId} state saved: ${isLoaded}`);
    }

    /**
     * Save all item states
     */
    saveAllItemStates() {
        this.loadingTracking.forEach((isLoaded, itemId) => {
            this.saveItemState(itemId, isLoaded);
        });
    }

    /**
     * Add touch feedback for better mobile UX
     */
    addTouchFeedback(element) {
        element.addEventListener('touchstart', () => {
            element.style.transform = 'scale(0.95)';
        });

        element.addEventListener('touchend', () => {
            element.style.transform = '';
        });

        element.addEventListener('touchcancel', () => {
            element.style.transform = '';
        });
    }

    /**
     * Utility method to safely add event listeners
     */
    addEventListener(element, event, handler) {
        if (element && typeof handler === 'function') {
            element.addEventListener(event, handler);

            // Track for cleanup
            const key = `${element.id || 'unknown'}_${event}`;
            this.eventListeners.set(key, { element, event, handler });
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Cleanup method for when component is destroyed
     */
    destroy() {
        // Remove all event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners.clear();

        // Save final state
        this.saveAllItemStates();

        console.log('🧹 OrderDetailShipped destroyed and cleaned up');
    }
}

// Export for global access
window.OrderDetailShipped = OrderDetailShipped;