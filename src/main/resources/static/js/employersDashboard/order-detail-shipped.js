/**
 * ORDER DETAIL SHIPPED - WAREHOUSE LOADING INTERFACE
 * ================================================
 * Основен JavaScript контролер за warehouse shipping операции.
 * Адаптиран от order-review архитектурата с фокус върху real-time loading tracking.
 * Интегриран с ShippingApi за централизирано управление на endpoints.
 */

class OrderDetailShipped {
    constructor() {
        // Core configuration
        this.config = window.shippedOrderConfig || {};
        this.orderId = this.config.orderId;

        // API integration
        this.shippingApi = null;

        // Data management
        this.orderData = null;
        this.clientInfo = null;
        this.orderItems = [];
        this.filteredItems = [];
        this.loadedItems = new Set(); // Track заредените items по ID

        // UI state management
        this.currentFilter = 'all';
        this.currentSort = 'name';
        this.searchTerm = '';
        this.isControlsExpanded = false;
        this.shippingNote = '';

        // DOM element cache
        this.elements = {};

        // Event management
        this.eventListeners = new Map();
        this.realTimeUnsubscribe = null;

        // Loading states
        this.isLoading = false;
        this.isSubmitting = false;

        console.log('OrderDetailShipped инициализиран за поръчка:', this.orderId);
    }

    /**
     * INITIALIZATION - ГЛАВНА ИНИЦИАЛИЗАЦИЯ
     * ===================================
     */

    async initialize() {
        try {
            console.log('🚛 Инициализиране на OrderDetailShipped интерфейса...');

            // Validate основна конфигурация
            this.validateConfiguration();

            // Initialize API layer
            await this.initializeShippingApi();

            // Cache DOM elements
            this.cacheElementReferences();

            // Setup event listeners
            this.setupEventListeners();

            // Load initial data
            await this.loadInitialData();

            // Setup real-time functionality
            this.setupRealTimeTracking();

            // Initialize mobile optimizations
            this.initializeMobileFeatures();

            console.log('✅ OrderDetailShipped инициализация завършена успешно');
            return true;

        } catch (error) {
            console.error('❌ Грешка при инициализация на OrderDetailShipped:', error);
            this.showErrorState(error.message);
            return false;
        }
    }

    /**
     * Validate основна конфигурация и dependencies
     */
    validateConfiguration() {
        if (!this.orderId || this.orderId <= 0) {
            throw new Error('Невалиден ID на поръчка');
        }

        if (!this.config.csrfToken || !this.config.csrfHeader) {
            throw new Error('CSRF конфигурация липсва');
        }

        // Check за задължителни DOM elements
        const requiredElements = [
            'order-items-container',
            'loading-state',
            'shipping-controls-overlay',
            'complete-shipping'
        ];

        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        if (missingElements.length > 0) {
            throw new Error(`Липсват задължителни DOM елементи: ${missingElements.join(', ')}`);
        }
    }

    /**
     * Initialize ShippingApi integration
     */
    async initializeShippingApi() {
        if (!window.ShippingApi) {
            throw new Error('ShippingApi не е зареден');
        }

        this.shippingApi = new ShippingApi();
        console.log('✅ ShippingApi интеграция успешна');
    }

    /**
     * Cache DOM element references за performance
     */
    cacheElementReferences() {
        this.elements = {
            // Container elements
            loadingState: document.getElementById('loading-state'),
            itemsContainer: document.getElementById('order-items-container'),
            emptyState: document.getElementById('empty-state'),

            // Progress panel elements
            loadedCount: document.getElementById('loaded-count'),
            totalCount: document.getElementById('total-count'),
            remainingCount: document.getElementById('remaining-count'),
            progressFill: document.getElementById('progress-fill'),
            progressText: document.getElementById('progress-text'),
            completionStatus: document.getElementById('completion-status'),

            // Statistics elements
            totalItemsStat: document.getElementById('total-items-stat'),
            loadedItemsStat: document.getElementById('loaded-items-stat'),
            pendingItemsStat: document.getElementById('pending-items-stat'),
            completionPercentage: document.getElementById('completion-percentage'),

            // Controls elements
            controlsHeader: document.querySelector('.controls-header'),
            controlsPanel: document.getElementById('controls-panel'),
            toggleControls: document.getElementById('toggle-controls'),

            // Search and filtering
            searchInput: document.getElementById('search-input'),
            clearSearch: document.getElementById('clear-search'),
            filterButtons: document.querySelectorAll('.filter-btn'),
            sortSelect: document.getElementById('sort-select'),
            refreshProgress: document.getElementById('refresh-progress'),

            // Truck input
            truckNumber: document.getElementById('truck-number'),

            // Shipping controls
            shippingControlsOverlay: document.getElementById('shipping-controls-overlay'),
            summaryProgressText: document.getElementById('summary-progress-text'),
            miniProgressFill: document.getElementById('mini-progress-fill'),
            addShippingNote: document.getElementById('add-shipping-note'),
            completeShipping: document.getElementById('complete-shipping'),

            // Modals
            shippingNoteModal: document.getElementById('shipping-note-modal'),
            shippingNoteText: document.getElementById('shipping-note-text'),
            saveShippingNote: document.getElementById('save-shipping-note'),
            cancelShippingNote: document.getElementById('cancel-shipping-note'),
            closeShippingNoteModal: document.getElementById('close-shipping-note-modal'),

            shippingConfirmationModal: document.getElementById('shipping-confirmation-modal'),
            modalOrderNumber: document.getElementById('modal-order-number'),
            modalTruckNumber: document.getElementById('modal-truck-number'),
            modalTotalItems: document.getElementById('modal-total-items'),
            modalLoadedItems: document.getElementById('modal-loaded-items'),
            confirmShipping: document.getElementById('confirm-shipping'),
            cancelShippingConfirmation: document.getElementById('cancel-shipping-confirmation'),
            closeShippingConfirmationModal: document.getElementById('close-shipping-confirmation-modal')
        };
    }

    /**
     * Setup всички event listeners
     */
    setupEventListeners() {
        // Controls panel toggle
        this.addEventListener(this.elements.controlsHeader, 'click', () => {
            this.toggleControlsPanel();
        });

        // Search functionality
        this.addEventListener(this.elements.searchInput, 'input', (e) => {
            this.handleSearch(e.target.value);
        });

        this.addEventListener(this.elements.clearSearch, 'click', () => {
            this.clearSearch();
        });

        // Filter buttons
        this.elements.filterButtons.forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                this.handleFilterChange(e.target.dataset.filter);
            });
        });

        // Sort dropdown
        this.addEventListener(this.elements.sortSelect, 'change', (e) => {
            this.handleSortChange(e.target.value);
        });

        // Refresh button
        this.addEventListener(this.elements.refreshProgress, 'click', () => {
            this.refreshData();
        });

        // Truck number validation
        this.addEventListener(this.elements.truckNumber, 'blur', () => {
            this.validateTruckNumber();
        });

        // Shipping note modal
        this.addEventListener(this.elements.addShippingNote, 'click', () => {
            this.showShippingNoteModal();
        });

        this.addEventListener(this.elements.saveShippingNote, 'click', () => {
            this.saveShippingNote();
        });

        this.addEventListener(this.elements.cancelShippingNote, 'click', () => {
            this.hideShippingNoteModal();
        });

        this.addEventListener(this.elements.closeShippingNoteModal, 'click', () => {
            this.hideShippingNoteModal();
        });

        // Complete shipping
        this.addEventListener(this.elements.completeShipping, 'click', () => {
            this.showShippingConfirmationModal();
        });

        // Shipping confirmation modal
        this.addEventListener(this.elements.confirmShipping, 'click', () => {
            this.confirmShippingSubmission();
        });

        this.addEventListener(this.elements.cancelShippingConfirmation, 'click', () => {
            this.hideShippingConfirmationModal();
        });

        this.addEventListener(this.elements.closeShippingConfirmationModal, 'click', () => {
            this.hideShippingConfirmationModal();
        });

        // Modal overlay clicks за затваряне
        [this.elements.shippingNoteModal, this.elements.shippingConfirmationModal].forEach(modal => {
            if (modal) {
                this.addEventListener(modal, 'click', (e) => {
                    if (e.target === modal) {
                        modal.classList.add('hidden');
                        document.body.style.overflow = '';
                    }
                });
            }
        });

        // Setup mobile-specific event listeners
        this.setupMobileEventListeners();
    }

    /**
     * Setup mobile-specific event listeners
     */
    setupMobileEventListeners() {
        // Prevent zoom on double tap
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

        // Optimize touch performance
        document.addEventListener('touchmove', (e) => {
            const scrollableParent = e.target.closest('.order-items-container, .modal-container');
            if (!scrollableParent) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    /**
     * DATA LOADING - ЗАРЕЖДАНЕ НА ДАННИ
     * ================================
     */

    /**
     * Load initial order data
     */
    async loadInitialData() {
        try {
            this.showLoadingState('Зареждане на данни за поръчката...');

            const response = await this.shippingApi.loadShippingOrderData();

            if (!response.success) {
                throw new Error(response.message || 'Неуспешно зареждане на данните');
            }

            // Store заредените данни
            const { order, client, items, statistics } = response.data;
            this.orderData = order;
            this.clientInfo = client;
            this.orderItems = items;

            // Update статистиките в UI
            this.updateStatistics(statistics);

            // Render items в UI
            this.applyFiltersAndRender();

            // Show shipping controls
            this.showShippingControls();

            this.hideLoadingState();

            console.log(`✅ Заредени ${this.orderItems.length} артикула за поръчка ${this.orderId}`);

        } catch (error) {
            console.error('❌ Грешка при зареждане на данни:', error);
            this.showErrorState(error.message);
        }
    }

    /**
     * Refresh order data - за manual refresh
     */
    async refreshData() {
        console.log('🔄 Обновяване на данните...');

        // Show loading indicator на refresh button
        const refreshBtn = this.elements.refreshProgress;
        const originalIcon = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise" style="animation: spin 1s linear infinite;"></i>';
        refreshBtn.disabled = true;

        try {
            await this.loadInitialData();

            // Show success feedback
            if (window.toastManager) {
                window.toastManager.success('Данните са обновени успешно', 'Обновяване');
            }

        } catch (error) {
            console.error('❌ Грешка при обновяване:', error);
            if (window.toastManager) {
                window.toastManager.error('Грешка при обновяване на данните', 'Обновяване');
            }
        } finally {
            // Restore refresh button
            setTimeout(() => {
                refreshBtn.innerHTML = originalIcon;
                refreshBtn.disabled = false;
            }, 1000);
        }
    }

    /**
     * REAL-TIME TRACKING - РЕАЛНО ВРЕМЕ ФУНКЦИОНАЛНОСТ
     * ===============================================
     */

    /**
     * Setup real-time progress tracking
     */
    setupRealTimeTracking() {
        if (!this.shippingApi || !this.shippingApi.websocket.enabled) {
            console.log('Real-time tracking не е активиран');
            return;
        }

        // Subscribe за progress updates от други clients
        this.realTimeUnsubscribe = this.shippingApi.subscribeToProgressUpdates((progressData) => {
            this.handleRealTimeProgressUpdate(progressData);
        });

        // Listen за local events от API layer
        document.addEventListener('shippingItemStatusUpdate', (e) => {
            this.handleLocalItemUpdate(e.detail);
        });

        console.log('✅ Real-time tracking активиран');
    }

    /**
     * Handle real-time progress updates от други devices
     */
    handleRealTimeProgressUpdate(progressData) {
        console.log('📡 Real-time progress update получен:', progressData);

        // Sync local state с remote updates
        if (progressData.itemId && typeof progressData.isLoaded === 'boolean') {
            this.syncItemLoadingStatus(progressData.itemId, progressData.isLoaded, false);
        }

        // Update UI statistics
        if (progressData.statistics) {
            this.updateStatistics(progressData.statistics);
        }

        // Show notification за sync
        if (window.toastManager && progressData.message) {
            window.toastManager.info(progressData.message, 'Синхронизация');
        }
    }

    /**
     * Handle local item updates
     */
    handleLocalItemUpdate(updateData) {
        // Update UI instantly за local changes
        this.updateItemVisualState(updateData.itemId, updateData.isLoaded);

        // Recalculate и update statistics
        const statistics = this.shippingApi.calculateProgressStatistics(
            this.loadedItems,
            this.orderItems.length
        );
        this.updateStatistics(statistics);
    }

    /**
     * ITEM MANAGEMENT - УПРАВЛЕНИЕ НА АРТИКУЛИ
     * =======================================
     */

    /**
     * Apply filters и render items
     */
    applyFiltersAndRender() {
        // Start с всички items
        let filtered = [...this.orderItems];

        // Apply search filter
        if (this.searchTerm) {
            filtered = filtered.filter(item =>
                item.productName.toLowerCase().includes(this.searchTerm) ||
                item.productCategory.toLowerCase().includes(this.searchTerm)
            );
        }

        // Apply status filter
        switch (this.currentFilter) {
            case 'loaded':
                filtered = filtered.filter(item => this.loadedItems.has(item.id));
                break;
            case 'pending':
                filtered = filtered.filter(item => !this.loadedItems.has(item.id));
                break;
            // 'all' shows everything
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (this.currentSort) {
                case 'name':
                    return a.productName.localeCompare(b.productName);
                case 'category':
                    return a.productCategory.localeCompare(b.productCategory);
                case 'quantity':
                    return b.quantity - a.quantity;
                case 'status':
                    const aLoaded = this.loadedItems.has(a.id);
                    const bLoaded = this.loadedItems.has(b.id);
                    return aLoaded === bLoaded ? 0 : (aLoaded ? 1 : -1);
                default:
                    return 0;
            }
        });

        this.filteredItems = filtered;
        this.renderItems();
    }

    /**
     * Render filtered items в UI
     */
    renderItems() {
        const container = this.elements.itemsContainer;

        if (this.filteredItems.length === 0) {
            this.showEmptyState();
            return;
        }

        // Hide empty state и show container
        this.elements.emptyState.classList.add('hidden');
        container.classList.remove('hidden');

        // Clear existing content
        container.innerHTML = '';

        // Render всеки item
        this.filteredItems.forEach(item => {
            const itemElement = this.createItemElement(item);
            container.appendChild(itemElement);
        });
    }

    /**
     * Create DOM element за single order item
     */
    createItemElement(item) {
        const isLoaded = this.loadedItems.has(item.id);

        // Безопасно извличане на данни с fallback стойности
        const itemName = item.productName || 'Неизвестен артикул';
        const itemCategory = item.productCategory || 'Без категория';
        const itemQuantity = Number(item.quantity) || 0;
        const itemPrice = Number(item.pricePerUnit) || 0;

        const itemDiv = document.createElement('div');
        itemDiv.className = `order-item-card ${isLoaded ? 'loaded' : ''}`;
        itemDiv.dataset.itemId = item.id;

        itemDiv.innerHTML = `
        <div class="item-content">
            <div class="item-details">
                <div class="item-name">${this.escapeHtml(itemName)}</div>
                <div class="item-meta">
                    <div class="item-meta-item">
                        <i class="bi bi-tag"></i>
                        <span>${this.escapeHtml(itemCategory)}</span>
                    </div>
                    <div class="item-meta-item">
                        <i class="bi bi-box"></i>
                        <span>Количество: ${itemQuantity}</span>
                    </div>
                    <div class="item-meta-item">
                        <i class="bi bi-currency-exchange"></i>
                        <span>Цена: ${itemPrice.toFixed(2)} лв.</span>
                    </div>
                </div>
            </div>
        </div>
        <button class="loading-toggle ${isLoaded ? 'loaded' : ''}" 
                data-item-id="${item.id}"
                data-processing="false"
                aria-label="${isLoaded ? 'Отмяна на зареждането' : 'Отбелязване като заредено'}"
                title="${isLoaded ? 'Натиснете за отмяна на зареждането' : 'Натиснете за отбелязване като заредено'}">
            <i class="bi ${isLoaded ? 'bi-check-circle-fill' : 'bi-circle'}"></i>
        </button>
    `;

        // КРИТИЧНО ПОДОБРЕНИЕ: Robust toggle handling
        const toggleBtn = itemDiv.querySelector('.loading-toggle');

        // Премахва стари event listeners ако има такива
        this.removeEventListener(toggleBtn, 'click');

        // НОВА ЛОГИКА: Използваме data-processing вместо disabled
        this.addEventListener(toggleBtn, 'click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Проверка дали вече се процесва - използваме data атрибут
            if (toggleBtn.dataset.processing === 'true') {
                console.log(`❌ Button ${item.id} already processing, ignoring click`);
                return;
            }

            console.log(`🔄 Starting toggle for item ${item.id}`);

            // Маркираме като "в процес" но НЕ disable-ваме бутона
            toggleBtn.dataset.processing = 'true';
            toggleBtn.classList.add('processing');

            try {
                // Извикваме async операцията със стабилен error handling
                await this.toggleItemLoadingStatus(item.id);

                console.log(`✅ Toggle completed successfully for item ${item.id}`);

                // Haptic feedback на mobile
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }

            } catch (error) {
                console.error(`❌ Error toggling item ${item.id}:`, error);

                // Показваме грешка на потребителя
                if (window.toastManager) {
                    window.toastManager.error('Грешка при промяна на статуса');
                }

                // КРИТИЧНО: Връщаме старото състояние при грешка
                const currentState = this.loadedItems.has(item.id);
                const previousState = !currentState;
                this.syncItemLoadingStatus(item.id, previousState, true);

            } finally {
                // ВИНАГИ премахваме processing state след операцията
                setTimeout(() => {
                    toggleBtn.dataset.processing = 'false';
                    toggleBtn.classList.remove('processing');
                    console.log(`🔓 Released processing lock for item ${item.id}`);
                }, 100); // Кратко delay за да се види visual feedback
            }
        });

        // Touch feedback за mobile devices
        this.addTouchFeedback(toggleBtn);

        return itemDiv;
    }

    /**
     * Toggle loading status за конкретен item
     */
    async toggleItemLoadingStatus(itemId) {
        const currentState = this.loadedItems.has(itemId);
        const newState = !currentState;

        console.log(`🔄 Toggle item ${itemId}: ${currentState} → ${newState}`);

        try {
            // ПЪРВО обновяваме visual state за instant feedback
            this.syncItemLoadingStatus(itemId, newState, true);

            // СЛЕД ТОВА изпращаме API заявката
            if (this.shippingApi) {
                const progressData = this.shippingApi.calculateProgressStatistics(
                    this.loadedItems,
                    this.orderItems.length
                );

                // Това е критичната точка където може да има грешка
                await this.shippingApi.updateItemLoadingStatus(itemId, newState, progressData);
            }

            // Показваме success toast
            const action = newState ? 'зареден' : 'премахнат от заредените';
            if (window.toastManager) {
                window.toastManager.success(`Артикул ${action}`);
            }

        } catch (error) {
            console.error('API error in toggleItemLoadingStatus:', error);

            // КРИТИЧНО: При API грешка връщаме визуалното състояние обратно
            this.syncItemLoadingStatus(itemId, currentState, true);

            // Re-throw error-а за да го хване calling функцията
            throw error;
        }
    }


    /**
     * Sync item loading status (за both local и remote updates)
     */
    syncItemLoadingStatus(itemId, isLoaded, updateVisuals = true) {
        // Update internal tracking
        if (isLoaded) {
            this.loadedItems.add(itemId);
        } else {
            this.loadedItems.delete(itemId);
        }

        // Update visual state ако се изисква
        if (updateVisuals) {
            this.updateItemVisualState(itemId, isLoaded);
        }

        // Recalculate statistics
        const statistics = this.shippingApi.calculateProgressStatistics(
            this.loadedItems,
            this.orderItems.length
        );
        this.updateStatistics(statistics);

        // Update shipping controls availability
        this.updateShippingControlsState();
    }

    /**
     * Update visual state на конкретен item
     */
    updateItemVisualState(itemId, isLoaded) {
        // Намира всички elements за този item
        const itemElements = document.querySelectorAll(`[data-item-id="${itemId}"]`);

        if (itemElements.length === 0) {
            console.warn(`⚠️ No elements found for item ${itemId}`);
            return;
        }

        itemElements.forEach(element => {
            // Намира container-а и button-а
            const itemContainer = element.closest('.order-item-card');
            const toggleBtn = element.classList.contains('loading-toggle') ?
                element : element.querySelector('.loading-toggle');
            const icon = toggleBtn?.querySelector('i');

            if (itemContainer) {
                // Обновява container класа за background color
                if (isLoaded) {
                    itemContainer.classList.add('loaded');
                } else {
                    itemContainer.classList.remove('loaded');
                }
            }

            if (toggleBtn) {
                // Обновява button класа и атрибутите
                if (isLoaded) {
                    toggleBtn.classList.add('loaded');
                } else {
                    toggleBtn.classList.remove('loaded');
                }

                // Обновява accessibility атрибутите
                const label = isLoaded ? 'Отмяна на зареждането' : 'Отбелязване като заредено';
                const title = isLoaded ? 'Натиснете за отмяна на зареждането' : 'Натиснете за отбелязване като заредено';

                toggleBtn.setAttribute('aria-label', label);
                toggleBtn.setAttribute('title', title);
            }

            if (icon) {
                // Обновява иконата
                icon.className = isLoaded ? 'bi bi-check-circle-fill' : 'bi bi-circle';
            }
        });

        console.log(`🎨 Visual state updated for item ${itemId}: ${isLoaded ? 'loaded' : 'unloaded'}`);
    }

    /**
     * STATISTICS & PROGRESS - СТАТИСТИКИ И ПРОГРЕС
     * ==========================================
     */

    /**
     * Update всички statistics в UI
     */
    updateStatistics(statistics) {
        const {
            totalItems,
            loadedItems,
            remainingItems,
            completionPercentage,
            isCompleted
        } = statistics;

        // Update progress panel
        if (this.elements.loadedCount) this.elements.loadedCount.textContent = loadedItems;
        if (this.elements.totalCount) this.elements.totalCount.textContent = totalItems;
        if (this.elements.remainingCount) this.elements.remainingCount.textContent = remainingItems;

        // Update progress bar
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = `${completionPercentage}%`;
        }
        if (this.elements.progressText) {
            this.elements.progressText.textContent = `${completionPercentage}%`;
        }

        // Update completion status
        if (this.elements.completionStatus) {
            if (isCompleted) {
                this.elements.completionStatus.textContent = 'Готово за изпращане';
                this.elements.completionStatus.style.color = 'var(--color-success)';
            } else {
                this.elements.completionStatus.textContent = 'В процес на товарене';
                this.elements.completionStatus.style.color = 'var(--color-info)';
            }
        }

        // Update statistics cards
        if (this.elements.totalItemsStat) this.elements.totalItemsStat.textContent = totalItems;
        if (this.elements.loadedItemsStat) this.elements.loadedItemsStat.textContent = loadedItems;
        if (this.elements.pendingItemsStat) this.elements.pendingItemsStat.textContent = remainingItems;
        if (this.elements.completionPercentage) this.elements.completionPercentage.textContent = `${completionPercentage}%`;

        // Update mini progress в shipping controls
        if (this.elements.summaryProgressText) {
            this.elements.summaryProgressText.textContent = `${completionPercentage}% завършен`;
        }
        if (this.elements.miniProgressFill) {
            this.elements.miniProgressFill.style.width = `${completionPercentage}%`;
        }
    }

    /**
     * Update shipping controls state based на progress
     */
    updateShippingControlsState() {
        const statistics = this.shippingApi.calculateProgressStatistics(
            this.loadedItems,
            this.orderItems.length
        );

        const { isCompleted, loadedItems, totalItems } = statistics;

        // Update complete shipping button
        const completeBtn = this.elements.completeShipping;
        if (completeBtn) {
            completeBtn.disabled = !isCompleted;

            if (isCompleted) {
                completeBtn.innerHTML = `
                    <i class="bi bi-check-circle"></i>
                    Завърши изпращането
                `;
                completeBtn.classList.remove('btn-disabled');
            } else {
                completeBtn.innerHTML = `
                    <i class="bi bi-hourglass-split"></i>
                    Заредете всички артикули (${loadedItems}/${totalItems})
                `;
                completeBtn.classList.add('btn-disabled');
            }
        }

        // Update shipping status
        const shippingStatus = document.getElementById('shipping-status');
        if (shippingStatus) {
            if (isCompleted) {
                shippingStatus.textContent = 'Готово за изпращане';
                shippingStatus.style.color = 'var(--color-success)';
            } else {
                shippingStatus.textContent = 'Товарене в процес';
                shippingStatus.style.color = 'var(--color-info)';
            }
        }
    }

    /**
     * FILTERING & SEARCH - ФИЛТРИРАНЕ И ТЪРСЕНЕ
     * ========================================
     */

    /**
     * Handle search input changes
     */
    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase().trim();

        // Show/hide clear button
        if (this.searchTerm && this.elements.clearSearch) {
            this.elements.clearSearch.classList.remove('hidden');
        } else if (this.elements.clearSearch) {
            this.elements.clearSearch.classList.add('hidden');
        }

        // Apply filters и re-render
        this.applyFiltersAndRender();
    }

    /**
     * Clear search input и filters
     */
    clearSearch() {
        this.searchTerm = '';
        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
        }
        if (this.elements.clearSearch) {
            this.elements.clearSearch.classList.add('hidden');
        }
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
     * MODALS & SHIPPING FLOW - МОДАЛИ И SHIPPING ПРОЦЕС
     * ==============================================
     */

    /**
     * Show shipping note modal
     */
    showShippingNoteModal() {
        if (this.elements.shippingNoteModal) {
            this.elements.shippingNoteModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';

            // Focus textarea
            if (this.elements.shippingNoteText) {
                setTimeout(() => {
                    this.elements.shippingNoteText.focus();
                }, 100);
            }
        }
    }

    /**
     * Hide shipping note modal
     */
    hideShippingNoteModal() {
        if (this.elements.shippingNoteModal) {
            this.elements.shippingNoteModal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    /**
     * Save shipping note
     */
    saveShippingNote() {
        if (this.elements.shippingNoteText) {
            this.shippingNote = this.elements.shippingNoteText.value.trim();
        }

        this.hideShippingNoteModal();

        // Update UI за да покаже че има запазена бележка
        const noteBtn = this.elements.addShippingNote;
        if (noteBtn && this.shippingNote) {
            noteBtn.innerHTML = `
                <i class="bi bi-sticky-fill"></i>
                Бележка (запазена)
            `;
            noteBtn.classList.add('has-note');
        } else if (noteBtn) {
            noteBtn.innerHTML = `
                <i class="bi bi-sticky"></i>
                Бележка
            `;
            noteBtn.classList.remove('has-note');
        }

        if (window.toastManager) {
            if (this.shippingNote) {
                window.toastManager.success('Бележката е запазена', 'Запазване');
            } else {
                window.toastManager.info('Бележката е изчистена', 'Запазване');
            }
        }
    }

    /**
     * Validate truck number input
     */
    validateTruckNumber() {
        const truckInput = this.elements.truckNumber;
        if (!truckInput) return true;

        const validation = this.shippingApi.validateTruckNumber(truckInput.value);

        if (validation.valid) {
            truckInput.classList.remove('error');
            truckInput.style.borderColor = '';
            return true;
        } else {
            truckInput.classList.add('error');
            truckInput.style.borderColor = 'var(--color-danger)';

            if (window.toastManager) {
                window.toastManager.error(validation.error, 'Валидация');
            }
            return false;
        }
    }

    /**
     * Show shipping confirmation modal
     */
    showShippingConfirmationModal() {
        // Validate truck number преди показване на modal
        if (!this.validateTruckNumber()) {
            return;
        }

        // Check ако всички items са заредени
        const statistics = this.shippingApi.calculateProgressStatistics(
            this.loadedItems,
            this.orderItems.length
        );

        if (!statistics.isCompleted) {
            if (window.toastManager) {
                window.toastManager.warning(
                    `Моля заредете всички артикули преди потвърждаване (${statistics.loadedItems}/${statistics.totalItems})`,
                    'Незавършено товарене'
                );
            }
            return;
        }

        // Update modal data
        if (this.elements.modalOrderNumber) {
            this.elements.modalOrderNumber.textContent = this.orderId;
        }
        if (this.elements.modalTruckNumber) {
            const truckNumber = this.elements.truckNumber?.value.trim() || 'Не е въведен';
            this.elements.modalTruckNumber.textContent = truckNumber;
        }
        if (this.elements.modalTotalItems) {
            this.elements.modalTotalItems.textContent = statistics.totalItems;
        }
        if (this.elements.modalLoadedItems) {
            this.elements.modalLoadedItems.textContent = statistics.loadedItems;
        }

        // Show modal
        if (this.elements.shippingConfirmationModal) {
            this.elements.shippingConfirmationModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Hide shipping confirmation modal
     */
    hideShippingConfirmationModal() {
        if (this.elements.shippingConfirmationModal) {
            this.elements.shippingConfirmationModal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    /**
     * Confirm shipping submission - финална операция
     */
    async confirmShippingSubmission() {
        if (this.isSubmitting) return;

        try {
            this.isSubmitting = true;

            // Disable confirmation button
            const confirmBtn = this.elements.confirmShipping;
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = `
                    <div class="loading-spinner" style="width: 20px; height: 20px; margin-right: 8px;"></div>
                    Потвърждаване...
                `;
            }

            // Get данни за submission
            const truckNumber = this.elements.truckNumber?.value.trim() || '';
            const loadedItemsArray = Array.from(this.loadedItems);

            // Submit чрез API
            const result = await this.shippingApi.confirmShipping(
                truckNumber,
                this.shippingNote,
                loadedItemsArray
            );

            if (result.success) {
                // Show success message
                if (window.toastManager) {
                    window.toastManager.success(
                        'Поръчката е успешно маркирана като изпратена!',
                        'Успешно изпращане'
                    );
                }

                // Hide modal
                this.hideShippingConfirmationModal();

                // Redirect след кратко delay
                setTimeout(() => {
                    window.location.href = '/employer/dashboard';
                }, 2000);

            } else {
                throw new Error(result.message || 'Неуспешно потвърждаване');
            }

        } catch (error) {
            console.error('❌ Грешка при потвърждаване на shipping:', error);

            // Show error message
            if (window.toastManager) {
                window.toastManager.error(
                    'Грешка при потвърждаване на изпращането: ' + error.message,
                    'Грешка'
                );
            }

            // Re-enable confirmation button
            const confirmBtn = this.elements.confirmShipping;
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = `
                    <i class="bi bi-check-circle"></i>
                    Потвърди изпращането
                `;
            }

        } finally {
            this.isSubmitting = false;
        }
    }

    /**
     * UI STATE MANAGEMENT - УПРАВЛЕНИЕ НА UI СЪСТОЯНИЯТА
     * =================================================
     */

    /**
     * Show loading state
     */
    showLoadingState(message = 'Зареждане...') {
        if (this.elements.loadingState) {
            this.elements.loadingState.classList.remove('hidden');
            const loadingText = this.elements.loadingState.querySelector('p');
            if (loadingText) {
                loadingText.textContent = message;
            }
        }

        if (this.elements.itemsContainer) {
            this.elements.itemsContainer.classList.add('hidden');
        }
        if (this.elements.emptyState) {
            this.elements.emptyState.classList.add('hidden');
        }
    }

    /**
     * Hide loading state
     */
    hideLoadingState() {
        if (this.elements.loadingState) {
            this.elements.loadingState.classList.add('hidden');
        }
    }

    /**
     * Show empty state когато няма items
     */
    showEmptyState() {
        if (this.elements.emptyState) {
            this.elements.emptyState.classList.remove('hidden');
        }
        if (this.elements.itemsContainer) {
            this.elements.itemsContainer.classList.add('hidden');
        }
    }

    /**
     * Show shipping controls overlay
     */
    showShippingControls() {
        if (this.elements.shippingControlsOverlay) {
            this.elements.shippingControlsOverlay.style.display = 'block';
        }
    }

    /**
     * Show error state с съобщение
     */
    showErrorState(message) {
        this.hideLoadingState();

        if (window.toastManager) {
            window.toastManager.error(message, 'Грешка');
        } else {
            alert('Грешка: ' + message);
        }
    }

    /**
     * MOBILE OPTIMIZATIONS - МОБИЛНИ ОПТИМИЗАЦИИ
     * =========================================
     */

    /**
     * Initialize mobile-specific features
     */
    initializeMobileFeatures() {
        // Optimize за iOS Safari
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
     * Add pull-to-refresh functionality за mobile
     */
    addPullToRefreshHint() {
        let startY = 0;
        let isRefreshing = false;

        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
            }
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (isRefreshing || window.scrollY > 0) return;

            const currentY = e.touches[0].clientY;
            const pullDistance = currentY - startY;

            if (pullDistance > 100) {
                isRefreshing = true;
                this.refreshData();
            }
        }, { passive: true });

        document.addEventListener('touchend', () => {
            startY = 0;
            isRefreshing = false;
        }, { passive: true });
    }

    /**
     * Handle orientation changes
     */
    handleOrientationChange() {
        // Re-calculate layouts ако е необходимо
        this.updateShippingControlsState();

        // Re-apply filters за responsive layout
        setTimeout(() => {
            this.applyFiltersAndRender();
        }, 200);
    }

    /**
     * Add touch feedback за по-добър mobile UX
     */
    addTouchFeedback(element) {
        element.addEventListener('touchstart', () => {
            element.style.transform = 'scale(0.95)';
        }, { passive: true });

        element.addEventListener('touchend', () => {
            element.style.transform = '';
        }, { passive: true });

        element.addEventListener('touchcancel', () => {
            element.style.transform = '';
        }, { passive: true });
    }

    /**
     * UTILITY METHODS - ПОМОЩНИ МЕТОДИ
     * ==============================
     */

    /**
     * Safely add event listener с tracking за cleanup
     */
    addEventListener(element, event, handler) {
        if (element && typeof handler === 'function') {
            element.addEventListener(event, handler);

            // Track за cleanup
            const key = `${element.id || 'unknown'}_${event}_${Date.now()}`;
            this.eventListeners.set(key, { element, event, handler });
        }
    }

    /**
     * Escape HTML за security
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Format number за display
     */
    formatNumber(number, decimals = 0) {
        return new Intl.NumberFormat('bg-BG', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(number);
    }

    /**
     * CLEANUP - ОСВОБОЖДАВАНЕ НА РЕСУРСИ
     * =================================
     */

    removeEventListener(element, eventType) {
        if (!element || !this.eventListeners) return;

        if (this.eventListeners.has(element)) {
            const listeners = this.eventListeners.get(element);
            if (listeners && listeners[eventType]) {
                element.removeEventListener(eventType, listeners[eventType]);
                delete listeners[eventType];
                console.log(`🧹 Removed ${eventType} listener from element`);
            }
        }
    }

    /**
     * Cleanup method when component is destroyed
     */
    destroy() {
        // Remove всички event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners.clear();

        // Unsubscribe от real-time updates
        if (this.realTimeUnsubscribe) {
            this.realTimeUnsubscribe();
            this.realTimeUnsubscribe = null;
        }

        // Cleanup ShippingApi
        if (this.shippingApi) {
            this.shippingApi.destroy();
            this.shippingApi = null;
        }

        // Reset DOM state
        document.body.style.overflow = '';

        console.log('🧹 OrderDetailShipped cleanup завършен');
    }
}

// ==========================================
// ГЛОБАЛНА ИНИЦИАЛИЗАЦИЯ
// ==========================================

// Export клас глобално
window.OrderDetailShipped = OrderDetailShipped;
