/**
 * ENHANCED ORDERS NAVIGATION & TABLE SORTING MANAGER
 * =================================================
 * Обединява badge management с sophisticated table sorting functionality
 * Използва patterns от orderReviewCatalog.js и catalog.js за consistent experience
 */

class OrdersNavManager {
    constructor() {
        // Badge management properties
        this.badgeElement = null;
        this.refreshInterval = null;

        // Table sorting properties
        this.ordersTable = null;
        this.originalOrdersData = [];
        this.filteredOrdersData = [];
        this.currentSortField = 'submittedAt'; // Default sort by date
        this.currentSortDirection = 'desc'; // Newest first by default
        this.sortableColumns = {
            'col-order': { field: 'id', type: 'number' },
            'col-status': { field: 'status', type: 'text' },
            'col-date': { field: 'submittedAt', type: 'date' },
            'col-amount': { field: 'totalGross', type: 'number' }
        };

        // Filtering properties - NEW FUNCTIONALITY
        this.currentFilter = null; // null means show all
        this.statisticsCards = [];
        this.statusMapping = {
            // Backend statuses to display groups mapping
            'PENDING': 'pending',
            'URGENT': 'pending',     // Both map to same display group
            'CONFIRMED': 'confirmed',
            'SHIPPED': 'shipped',
            'CANCELLED': 'cancelled'
        };

        this.init();
    }

    // ==========================================
    // INITIALIZATION - ENHANCED
    // ==========================================

    init() {
        console.log('🚀 Initializing Enhanced OrdersNavManager');

        // Initialize badge management
        this.badgeElement = document.getElementById('ordersCount');
        if (this.badgeElement) {
            this.loadOrdersCount();
            this.setupAutoRefresh();
        }

        // Initialize table sorting functionality
        this.initializeTableSorting();

        // Initialize statistics cards filtering functionality
        this.initializeStatisticsFiltering();

        // Add mobile-specific enhancements
        this.setupMobileOptimizations();

        console.log('✅ OrdersNavManager fully initialized with sorting and filtering');
    }

    // ==========================================
    // STATISTICS FILTERING INITIALIZATION
    // ==========================================

    initializeStatisticsFiltering() {
        // Find all statistics cards
        this.statisticsCards = document.querySelectorAll('.stat-card');
        if (this.statisticsCards.length === 0) {
            console.log('ℹ️ Statistics cards not found - skipping filtering setup');
            return;
        }

        console.log('📊 Setting up statistics card filtering functionality');

        // Make statistics cards clickable and add functionality
        this.statisticsCards.forEach((card, index) => {
            this.setupStatisticsCardInteractivity(card, index);
        });

        // Add filter reset functionality
        this.addFilterResetOption();

        console.log('✅ Statistics filtering setup complete');
    }

    setupStatisticsCardInteractivity(card, index) {
        // Determine card type from classes or content
        const cardType = this.determineCardType(card);
        if (!cardType) return; // Skip cards we can't identify

        // Make card visually interactive
        card.style.cursor = 'pointer';
        card.style.transition = 'all 0.2s ease';
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `Филтрирай по ${this.getCardDisplayName(cardType)}`);

        // Add visual hover effects
        const originalTransform = card.style.transform;
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-2px) scale(1.02)';
            card.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
        });

        card.addEventListener('mouseleave', () => {
            if (this.currentFilter !== cardType) {
                card.style.transform = originalTransform;
                card.style.boxShadow = '';
            }
        });

        // Add click functionality with debouncing
        let clickTimeout;
        const handleCardClick = (e) => {
            e.preventDefault();

            clearTimeout(clickTimeout);
            clickTimeout = setTimeout(() => {
                this.handleStatisticsCardClick(cardType, card);
            }, 100);
        };

        card.addEventListener('click', handleCardClick);

        // Add keyboard accessibility
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCardClick(e);
            }
        });

        // Add touch feedback for mobile
        card.addEventListener('touchstart', () => {
            card.style.backgroundColor = 'rgba(243, 156, 18, 0.1)';
        });

        card.addEventListener('touchend', () => {
            setTimeout(() => {
                if (this.currentFilter !== cardType) {
                    card.style.backgroundColor = '';
                }
            }, 150);
        });

        console.log(`✅ Statistics card setup complete: ${cardType}`);
    }

    determineCardType(card) {
        // Check for "total/general" card first (shows all orders)
        const label = card.querySelector('.stat-label');
        if (label) {
            const labelText = label.textContent.toLowerCase();
            if (labelText.includes('общо') || labelText.includes('всички') || labelText.includes('поръчки') && !labelText.includes('чакащи') && !labelText.includes('потвърдени') && !labelText.includes('изпратени') && !labelText.includes('отменени')) {
                return 'all'; // Special type for "show all" functionality
            }
        }

        // Determine specific filter card types from CSS classes
        if (card.classList.contains('stat-pending')) return 'pending';
        if (card.classList.contains('stat-confirmed')) return 'confirmed';
        if (card.classList.contains('stat-shipped')) return 'shipped';
        if (card.classList.contains('stat-cancelled')) return 'cancelled';

        // Fallback: try to determine from label text content
        if (label) {
            const labelText = label.textContent.toLowerCase();
            if (labelText.includes('чакащи') || labelText.includes('потвърждение')) return 'pending';
            if (labelText.includes('потвърдени')) return 'confirmed';
            if (labelText.includes('изпратени')) return 'shipped';
            if (labelText.includes('отменени')) return 'cancelled';
        }

        // If it's the first card and no other type detected, assume it's the "all" card
        const allCards = document.querySelectorAll('.stat-card');
        if (allCards.length > 0 && allCards[0] === card) {
            return 'all';
        }

        return null; // Unknown card type
    }

    getCardDisplayName(cardType) {
        const displayNames = {
            'all': 'всички поръчки',
            'pending': 'чакащи потвърждение поръчки',
            'confirmed': 'потвърдени поръчки',
            'shipped': 'изпратени поръчки',
            'cancelled': 'отменени поръчки'
        };
        return displayNames[cardType] || 'неизвестен тип поръчки';
    }

    handleStatisticsCardClick(cardType, cardElement) {
        console.log(`📋 Statistics card clicked: ${cardType}`);

        // Handle "all" card specially - it always clears filters
        if (cardType === 'all') {
            this.clearFilter();
            this.updateStatisticsCardsVisualState('all');
            this.showFilterFeedback('all');
            this.scrollToTable();
            return;
        }

        // For specific filter cards, toggle filter if same card clicked, otherwise set new filter
        if (this.currentFilter === cardType) {
            this.clearFilter();
        } else {
            this.applyFilter(cardType);
        }

        // Update visual states of all cards
        this.updateStatisticsCardsVisualState(cardType);

        // Show feedback
        this.showFilterFeedback(cardType);

        // Scroll to table for better UX
        this.scrollToTable();
    }

    addFilterResetOption() {
        // Add a "Покажи всички" option that's always visible
        const container = document.querySelector('.orders-container');
        if (!container) return;

        const resetButton = document.createElement('div');
        resetButton.className = 'filter-reset-button';
        resetButton.innerHTML = `
            <i class="bi bi-funnel"></i>
            <span class="filter-text">Всички поръчки</span>
            <span class="filter-count" id="total-orders-count">(${this.originalOrdersData.length})</span>
        `;

        resetButton.style.cssText = `
            display: none;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
            margin: 16px 0;
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border: 2px solid #dee2e6;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            font-weight: 500;
            color: #495057;
        `;

        resetButton.addEventListener('click', () => this.clearFilter());

        // Insert before table
        const tableWrapper = container.querySelector('.orders-table-wrapper');
        if (tableWrapper) {
            container.insertBefore(resetButton, tableWrapper);
        }

        this.filterResetButton = resetButton;
    }

    initializeTableSorting() {
        this.ordersTable = document.querySelector('.orders-table');
        if (!this.ordersTable) {
            console.log('ℹ️ Orders table not found on this page - skipping sorting setup');
            return;
        }

        console.log('📊 Setting up table sorting functionality');

        // Extract and store original data
        this.extractTableData();

        // Make headers clickable
        this.makeHeadersClickable();

        // Apply default sorting
        this.applySorting();

        // Add visual indicators
        this.updateSortIndicators();

        console.log('✅ Table sorting setup complete');
    }

    // ==========================================
    // DATA EXTRACTION - SMART PARSING
    // ==========================================

    extractTableData() {
        const tableBody = this.ordersTable.querySelector('tbody');
        if (!tableBody) return;

        const rows = Array.from(tableBody.querySelectorAll('tr.order-row'));
        this.originalOrdersData = rows.map((row, index) => this.parseRowData(row, index));
        this.filteredOrdersData = [...this.originalOrdersData];

        console.log(`📋 Extracted data for ${this.originalOrdersData.length} orders`);
    }

    parseRowData(row, index) {
        try {
            // Extract order ID from order number span
            const orderNumberElement = row.querySelector('.order-number span');
            const orderId = orderNumberElement ? parseInt(orderNumberElement.textContent) : index;

            // Parse status from status badge (using our new th:switch structure)
            const statusElement = row.querySelector('.status-badge span:last-child');
            const statusText = statusElement ? statusElement.textContent.trim() : 'Unknown';

            // Map status text to display group (PENDING + URGENT both become 'pending')
            const statusGroup = this.mapStatusToGroup(statusText);

            // Parse date from date cells
            const datePrimaryElement = row.querySelector('.date-primary');
            const dateSecondaryElement = row.querySelector('.date-secondary');
            const dateStr = datePrimaryElement ? datePrimaryElement.textContent.trim() : '';
            const timeStr = dateSecondaryElement ? dateSecondaryElement.textContent.trim() : '';

            // Convert Bulgarian date format (dd.MM.yyyy) to Date object
            const submittedAt = this.parseBulgarianDate(dateStr, timeStr);

            // Parse total amount (remove " лв" and parse as float)
            const amountElement = row.querySelector('.amount-primary');
            const amountText = amountElement ? amountElement.textContent.replace(' лв', '').replace(',', '.') : '0';
            const totalGross = parseFloat(amountText) || 0;

            // Get items count
            const itemsElement = row.querySelector('.order-items-count span');
            const itemsCount = itemsElement ? parseInt(itemsElement.textContent) : 0;

            return {
                id: orderId,
                status: statusText,
                statusGroup: statusGroup, // NEW: For filtering
                submittedAt: submittedAt,
                totalGross: totalGross,
                itemsCount: itemsCount,
                domElement: row,
                originalIndex: index
            };

        } catch (error) {
            console.warn('⚠️ Error parsing row data:', error);
            return {
                id: index,
                status: 'Unknown',
                statusGroup: 'unknown',
                submittedAt: new Date(),
                totalGross: 0,
                itemsCount: 0,
                domElement: row,
                originalIndex: index
            };
        }
    }

    // ==========================================
    // STATUS MAPPING - PENDING/URGENT UNIFICATION
    // ==========================================

    mapStatusToGroup(statusText) {
        // Map display text to filter groups
        // Both "Чака одобрение" (PENDING) and "Спешна" (URGENT) map to 'pending'
        switch(statusText) {
            case 'Чака одобрение':     // PENDING status
                return 'pending';
            case 'Потвърдена':
                return 'confirmed';
            case 'Изпратена':
                return 'shipped';
            case 'Отменена':
                return 'cancelled';
            default:
                return 'unknown';
        }
    }

    // ==========================================
    // FILTERING LOGIC - WORKS WITH SORTING
    // ==========================================

    applyFilter(filterType) {
        console.log(`🔍 Applying filter: ${filterType}`);

        this.currentFilter = filterType;

        // Filter data based on status group
        this.filteredOrdersData = this.originalOrdersData.filter(order =>
            order.statusGroup === filterType
        );

        console.log(`📊 Filtered to ${this.filteredOrdersData.length} orders of type: ${filterType}`);

        // Reapply current sorting to filtered data
        this.applySorting();

        // Update UI elements
        this.updateFilterUI();
    }

    clearFilter() {
        console.log('🔄 Clearing all filters');

        this.currentFilter = null;

        // Reset to show all data
        this.filteredOrdersData = [...this.originalOrdersData];

        // Reapply current sorting
        this.applySorting();

        // Update UI elements
        this.updateFilterUI();

        // Show feedback
        if (window.toastManager && this.isMobileDevice()) {
            window.toastManager.info('Показани са всички поръчки');
        }
    }

    updateFilterUI() {
        // Update filter reset button visibility and content
        if (this.filterResetButton) {
            if (this.currentFilter) {
                this.filterResetButton.style.display = 'flex';
                this.filterResetButton.querySelector('.filter-text').textContent =
                    `Филтрирано: ${this.getCardDisplayName(this.currentFilter)}`;
                this.filterResetButton.querySelector('.filter-count').textContent =
                    `(${this.filteredOrdersData.length} от ${this.originalOrdersData.length})`;
            } else {
                this.filterResetButton.style.display = 'none';
            }
        }

        // Update statistics cards visual state
        this.updateStatisticsCardsVisualState();
    }

    updateStatisticsCardsVisualState(clickedCardType = null) {
        this.statisticsCards.forEach(card => {
            const cardType = this.determineCardType(card);
            if (!cardType) return;

            // Special handling for "all" card clicks
            if (clickedCardType === 'all') {
                if (cardType === 'all') {
                    // Highlight the "all" card briefly to show it was clicked
                    card.style.backgroundColor = 'rgba(52, 152, 219, 0.15)';
                    card.style.borderColor = '#3498db';
                    card.style.transform = 'translateY(-2px) scale(1.02)';
                    card.style.boxShadow = '0 8px 25px rgba(52, 152, 219, 0.3)';

                    // Reset after brief highlight since filter is cleared
                    setTimeout(() => {
                        card.style.backgroundColor = '';
                        card.style.borderColor = '';
                        card.style.transform = '';
                        card.style.boxShadow = '';
                        card.classList.remove('filter-active');
                    }, 800);
                } else {
                    // Reset all other cards since filter is cleared
                    card.style.backgroundColor = '';
                    card.style.borderColor = '';
                    card.style.transform = '';
                    card.style.boxShadow = '';
                    card.classList.remove('filter-active');
                }
                return;
            }

            // Normal filtering logic for specific cards
            const isActive = this.currentFilter === cardType;

            if (isActive) {
                // Active card styling (exclude "all" card from staying active)
                if (cardType !== 'all') {
                    card.style.backgroundColor = 'rgba(243, 156, 18, 0.15)';
                    card.style.borderColor = '#f39c12';
                    card.style.transform = 'translateY(-2px) scale(1.02)';
                    card.style.boxShadow = '0 8px 25px rgba(243, 156, 18, 0.3)';
                    card.classList.add('filter-active');
                }
            } else {
                // Reset to default styling
                card.style.backgroundColor = '';
                card.style.borderColor = '';
                card.style.transform = '';
                card.style.boxShadow = '';
                card.classList.remove('filter-active');
            }
        });
    }

    showFilterFeedback(filterType) {
        // Special handling for "all" card - it shows reset feedback
        if (filterType === 'all') {
            if (window.toastManager) {
                window.toastManager.info('Показани са всички поръчки');
            }

            // Visual feedback on the "all" card itself
            const allCard = Array.from(this.statisticsCards)
                .find(card => this.determineCardType(card) === 'all');

            if (allCard) {
                this.pulseCard(allCard);
            }

            console.log('📈 Filter cleared: showing all orders');
            return;
        }

        // Normal filtering feedback for specific cards
        const count = this.filteredOrdersData.length;
        const displayName = this.getCardDisplayName(filterType);

        // Desktop notification via toast (if available)
        if (window.toastManager) {
            if (this.currentFilter === filterType) {
                window.toastManager.success(`Филтрирано: ${count} ${displayName}`);
            } else {
                window.toastManager.info('Показани са всички поръчки');
            }
        }

        // Visual feedback on the card itself
        const activeCard = Array.from(this.statisticsCards)
            .find(card => this.determineCardType(card) === filterType);

        if (activeCard) {
            this.pulseCard(activeCard);
        }

        console.log(`📈 Filter applied: ${filterType}, showing ${count} orders`);
    }

    pulseCard(card) {
        // Brief pulse animation to show interaction
        card.style.transition = 'transform 0.3s ease';
        card.style.transform = 'scale(1.05)';

        setTimeout(() => {
            card.style.transform = 'translateY(-2px) scale(1.02)'; // Back to active state
        }, 200);
    }

    scrollToTable() {
        const table = document.querySelector('.orders-table-wrapper');
        if (table && this.isMobileDevice()) {
            // Smooth scroll to table on mobile for better UX
            setTimeout(() => {
                table.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }, 300);
        }
    }

    parseBulgarianDate(dateStr, timeStr = '') {
        try {
            // Parse dd.MM.yyyy format
            const dateParts = dateStr.split('.');
            if (dateParts.length !== 3) return new Date();

            const day = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]) - 1; // JavaScript months are 0-based
            const year = parseInt(dateParts[2]);

            // Parse time if provided (HH:mm format)
            let hours = 0, minutes = 0;
            if (timeStr && timeStr.includes(':')) {
                const timeParts = timeStr.split(':');
                hours = parseInt(timeParts[0]) || 0;
                minutes = parseInt(timeParts[1]) || 0;
            }

            return new Date(year, month, day, hours, minutes);

        } catch (error) {
            console.warn('⚠️ Date parsing error:', error);
            return new Date();
        }
    }

    // ==========================================
    // HEADER CLICKABILITY - TOUCH OPTIMIZED
    // ==========================================

    makeHeadersClickable() {
        const headers = this.ordersTable.querySelectorAll('thead th');

        headers.forEach(header => {
            const columnClass = Array.from(header.classList).find(cls => cls.startsWith('col-'));
            if (!columnClass || !this.sortableColumns[columnClass]) return;

            // Add sortable styling and behavior
            header.classList.add('sortable-header');
            header.style.cursor = 'pointer';
            header.style.userSelect = 'none';
            header.style.position = 'relative';

            // Add sort indicator container
            const sortIndicator = document.createElement('span');
            sortIndicator.className = 'sort-indicator';
            sortIndicator.innerHTML = '<i class="bi bi-arrow-down-up"></i>';
            header.appendChild(sortIndicator);

            // Add click event listener with debouncing
            let clickTimeout;
            header.addEventListener('click', (e) => {
                e.preventDefault();

                clearTimeout(clickTimeout);
                clickTimeout = setTimeout(() => {
                    this.handleHeaderClick(columnClass);
                }, 150); // Debounce for mobile
            });

            // Add keyboard accessibility
            header.setAttribute('tabindex', '0');
            header.setAttribute('role', 'button');
            header.setAttribute('aria-label', `Сортирай по ${header.textContent.trim()}`);

            header.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleHeaderClick(columnClass);
                }
            });

            // Add touch feedback
            header.addEventListener('touchstart', () => {
                header.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            });

            header.addEventListener('touchend', () => {
                setTimeout(() => {
                    header.style.backgroundColor = '';
                }, 150);
            });
        });
    }

    // ==========================================
    // SORTING LOGIC - MULTI-TYPE SUPPORT
    // ==========================================

    handleHeaderClick(columnClass) {
        const columnConfig = this.sortableColumns[columnClass];
        const field = columnConfig.field;

        // Toggle sort direction if same field, otherwise set to ascending
        if (this.currentSortField === field) {
            this.currentSortDirection = this.currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSortField = field;
            // Default directions based on data type
            this.currentSortDirection = field === 'submittedAt' ? 'desc' : 'asc';
        }

        console.log(`🔄 Sorting by ${field} (${this.currentSortDirection})`);

        this.applySorting();
        this.updateSortIndicators();

        // Show subtle feedback
        this.showSortFeedback(columnClass);
    }

    applySorting() {
        const columnConfig = this.sortableColumns[Object.keys(this.sortableColumns)
            .find(key => this.sortableColumns[key].field === this.currentSortField)];

        if (!columnConfig) return;

        // Sort the FILTERED data (not original data) - CRITICAL CHANGE
        this.filteredOrdersData.sort((a, b) => {
            let compareResult = this.compareValues(
                a[this.currentSortField],
                b[this.currentSortField],
                columnConfig.type
            );

            return this.currentSortDirection === 'desc' ? -compareResult : compareResult;
        });

        this.renderSortedTable();
        this.updateTableInfo(); // NEW: Show filtering info
    }

    compareValues(a, b, type) {
        // Handle null/undefined values
        if (a == null && b == null) return 0;
        if (a == null) return -1;
        if (b == null) return 1;

        switch (type) {
            case 'number':
                return (parseFloat(a) || 0) - (parseFloat(b) || 0);

            case 'date':
                const dateA = a instanceof Date ? a : new Date(a);
                const dateB = b instanceof Date ? b : new Date(b);
                return dateA.getTime() - dateB.getTime();

            case 'text':
                // Special handling for status priorities
                if (this.currentSortField === 'status') {
                    return this.compareStatusPriority(a, b);
                }
                return a.toString().localeCompare(b.toString(), 'bg');

            default:
                return a.toString().localeCompare(b.toString(), 'bg');
        }
    }

    compareStatusPriority(statusA, statusB) {
        // Define priority order for statuses (lower number = higher priority)
        const statusPriority = {
            'Чака одобрение': 1,    // URGENT
            'Потвърдена': 3, // CONFIRMED
            'Изпратена': 4,  // SHIPPED
            'Отменена': 5    // CANCELLED
        };

        const priorityA = statusPriority[statusA] || 999;
        const priorityB = statusPriority[statusB] || 999;

        return priorityA - priorityB;
    }

    // ==========================================
    // TABLE RENDERING - SMOOTH TRANSITIONS
    // ==========================================

    renderSortedTable() {
        const tableBody = this.ordersTable.querySelector('tbody');
        if (!tableBody) return;

        // Create document fragment for better performance
        const fragment = document.createDocumentFragment();

        this.filteredOrdersData.forEach((orderData, newIndex) => {
            const row = orderData.domElement;

            // Add smooth transition class
            row.style.transition = 'all 0.3s ease';

            // Update row order visually
            row.style.order = newIndex;

            fragment.appendChild(row);
        });

        // Clear and repopulate table body
        tableBody.innerHTML = '';
        tableBody.appendChild(fragment);

        // Add staggered animation effect
        this.addRowAnimations();
        this.updateTableInfo(); // NEW: Update table information
    }

    // ==========================================
    // TABLE INFO DISPLAY - NEW FUNCTIONALITY
    // ==========================================

    updateTableInfo() {
        // Update any table information displays
        const totalCount = this.originalOrdersData.length;
        const displayedCount = this.filteredOrdersData.length;

        // Update total orders count in filter reset button
        const totalCountElement = document.getElementById('total-orders-count');
        if (totalCountElement) {
            if (this.currentFilter) {
                totalCountElement.textContent = `(${displayedCount} от ${totalCount})`;
            } else {
                totalCountElement.textContent = `(${totalCount})`;
            }
        }

        // Log info for debugging
        console.log(`📊 Table info: showing ${displayedCount}/${totalCount} orders, filter: ${this.currentFilter || 'none'}, sort: ${this.currentSortField} ${this.currentSortDirection}`);
    }

    addRowAnimations() {
        const rows = this.ordersTable.querySelectorAll('tbody .order-row');
        rows.forEach((row, index) => {
            row.style.opacity = '0';
            row.style.transform = 'translateY(10px)';

            setTimeout(() => {
                row.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
                row.style.opacity = '1';
                row.style.transform = 'translateY(0)';
            }, index * 50); // Staggered animation
        });
    }

    // ==========================================
    // VISUAL INDICATORS - CLEAR FEEDBACK
    // ==========================================

    updateSortIndicators() {
        // Reset all indicators
        const allIndicators = this.ordersTable.querySelectorAll('.sort-indicator');
        allIndicators.forEach(indicator => {
            indicator.innerHTML = '<i class="bi bi-arrow-down-up"></i>';
            indicator.classList.remove('sort-active');
        });

        // Update active indicator
        const activeHeader = this.ordersTable.querySelector(`th.col-${this.getCurrentSortColumnClass()}`);
        if (activeHeader) {
            const indicator = activeHeader.querySelector('.sort-indicator');
            if (indicator) {
                const icon = this.currentSortDirection === 'asc' ?
                    '<i class="bi bi-arrow-up"></i>' :
                    '<i class="bi bi-arrow-down"></i>';
                indicator.innerHTML = icon;
                indicator.classList.add('sort-active');
            }
        }
    }

    getCurrentSortColumnClass() {
        return Object.keys(this.sortableColumns).find(key =>
            this.sortableColumns[key].field === this.currentSortField
        )?.replace('col-', '') || '';
    }

    showSortFeedback(columnClass) {
        const header = this.ordersTable.querySelector(`th.${columnClass}`);
        if (!header) return;

        // Brief highlight effect
        header.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        header.style.transform = 'scale(1.02)';

        setTimeout(() => {
            header.style.backgroundColor = '';
            header.style.transform = '';
        }, 200);

        // Optional: Show toast notification for mobile users
        if (window.toastManager && this.isMobileDevice()) {
            const fieldName = this.getFieldDisplayName(this.currentSortField);
            const direction = this.currentSortDirection === 'asc' ? 'възходящо' : 'низходящо';
            window.toastManager.info(`Сортирано по ${fieldName} (${direction})`);
        }
    }

    getFieldDisplayName(field) {
        const fieldNames = {
            'id': 'номер на поръчка',
            'status': 'статус',
            'submittedAt': 'дата',
            'totalGross': 'обща сума'
        };
        return fieldNames[field] || field;
    }

    // ==========================================
    // MOBILE OPTIMIZATIONS
    // ==========================================

    setupMobileOptimizations() {
        if (!this.isMobileDevice()) return;

        // Add mobile-specific styles
        const mobileStyles = `
            .sortable-header {
                min-height: 44px !important;
                padding: 12px 8px !important;
            }
            
            .sort-indicator {
                font-size: 1.1rem;
                margin-left: 8px;
            }
            
            .sort-active {
                color: #f39c12 !important;
            }
            
            @media (max-width: 576px) {
                .orders-table thead th {
                    font-size: 0.75rem;
                    padding: 8px 4px;
                }
                
                .sort-indicator {
                    font-size: 1rem;
                    margin-left: 4px;
                }
            }
        `;

        this.addStyles(mobileStyles);
    }

    isMobileDevice() {
        return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    addStyles(cssText) {
        const styleSheet = document.createElement('style');
        styleSheet.textContent = cssText;
        document.head.appendChild(styleSheet);
    }

    // ==========================================
    // EXISTING BADGE MANAGEMENT - PRESERVED
    // ==========================================

    async loadOrdersCount() {
        try {
            const response = await fetch('/api/orders/count', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.updateBadge(data.pendingCount || 0);
            }
        } catch (error) {
            console.log('Could not load orders count:', error.message);
        }
    }

    updateBadge(count) {
        if (!this.badgeElement) return;

        if (count > 0) {
            this.badgeElement.textContent = count > 99 ? '99+' : count.toString();
            this.badgeElement.style.display = 'block';
            this.badgeElement.style.opacity = '0';

            setTimeout(() => {
                this.badgeElement.style.transition = 'opacity 0.3s ease';
                this.badgeElement.style.opacity = '1';
            }, 10);

            this.badgeElement.classList.add('badge-pulse');
            setTimeout(() => {
                this.badgeElement.classList.remove('badge-pulse');
            }, 1000);
        } else {
            this.badgeElement.style.display = 'none';
        }
    }

    setupAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            this.loadOrdersCount();
        }, 120000);
    }

    // ==========================================
    // PUBLIC API METHODS
    // ==========================================

    // ==========================================
    // ENHANCED PUBLIC API METHODS
    // ==========================================

    /**
     * Програматично сортиране на таблицата
     * @param {string} field - Field name to sort by
     * @param {string} direction - 'asc' or 'desc'
     */
    sortBy(field, direction = 'asc') {
        if (!this.sortableColumns) return;

        const columnClass = Object.keys(this.sortableColumns).find(key =>
            this.sortableColumns[key].field === field
        );

        if (columnClass) {
            this.currentSortField = field;
            this.currentSortDirection = direction;
            this.applySorting();
            this.updateSortIndicators();
        }
    }

    /**
     * Програматично филтриране на таблицата
     * @param {string} filterType - Filter type: 'pending', 'confirmed', 'shipped', 'cancelled', or null for all
     */
    filterBy(filterType) {
        if (filterType === null) {
            this.clearFilter();
        } else {
            this.applyFilter(filterType);
        }
    }

    /**
     * Комбинирано сортиране и филтриране
     * @param {string} filterType - Filter type or null
     * @param {string} sortField - Field to sort by
     * @param {string} sortDirection - 'asc' or 'desc'
     */
    filterAndSort(filterType, sortField, sortDirection = 'asc') {
        this.filterBy(filterType);
        this.sortBy(sortField, sortDirection);
    }

    /**
     * Връща текущото състояние на сортирането и филтрирането
     */
    getCurrentState() {
        return {
            filter: this.currentFilter,
            sort: {
                field: this.currentSortField,
                direction: this.currentSortDirection,
                columnClass: this.getCurrentSortColumnClass()
            },
            data: {
                total: this.originalOrdersData.length,
                displayed: this.filteredOrdersData.length,
                filtered: this.currentFilter !== null
            }
        };
    }

    /**
     * Рестартира таблицата до оригиналното състояние
     */
    resetAll() {
        this.clearFilter();
        this.resetSort();
    }

    /**
     * Рестартира таблицата до оригиналното подреждане (запазва филтъра)
     */
    resetSort() {
        this.currentSortField = 'submittedAt';
        this.currentSortDirection = 'desc';
        this.applySorting();
        this.updateSortIndicators();
    }

    /**
     * Получава статистики за текущото състояние
     */
    getStatistics() {
        const stats = {
            total: this.originalOrdersData.length,
            displayed: this.filteredOrdersData.length,
            groups: {
                pending: 0,
                confirmed: 0,
                shipped: 0,
                cancelled: 0
            }
        };

        // Count by status groups
        this.originalOrdersData.forEach(order => {
            if (stats.groups.hasOwnProperty(order.statusGroup)) {
                stats.groups[order.statusGroup]++;
            }
        });

        return stats;
    }

    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        // Clean up event listeners
        this.statisticsCards.forEach(card => {
            card.style.cursor = '';
            card.style.transition = '';
            card.removeAttribute('tabindex');
            card.removeAttribute('role');
            card.removeAttribute('aria-label');
        });
    }
}

// ==========================================
// ENHANCED STYLES - COMPLETE VISUAL PACKAGE
// ==========================================

const enhancedStyles = `
    /* Badge animations - preserved from original */
    @keyframes badge-pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
    }
    
    .badge-pulse {
        animation: badge-pulse 0.6s ease-in-out;
    }
    
    .nav-badge {
        transition: all 0.3s ease;
    }
    
    .nav-badge:hover {
        transform: scale(1.1);
    }
    
    /* Enhanced sortable headers */
    .sortable-header {
        transition: all 0.2s ease;
        position: relative;
    }
    
    .sortable-header:hover {
        background-color: rgba(255, 255, 255, 0.1) !important;
        transform: translateY(-1px);
    }
    
    .sortable-header:active {
        transform: translateY(0);
    }
    
    /* Sort indicators */
    .sort-indicator {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        opacity: 0.6;
        transition: all 0.2s ease;
        font-size: 0.9rem;
    }
    
    .sort-indicator.sort-active {
        opacity: 1;
        color: #ffffff !important;
        transform: translateY(-50%) scale(1.1);
    }
    
    .sortable-header:hover .sort-indicator {
        opacity: 0.9;
    }
    
    /* Focus styles for accessibility */
    .sortable-header:focus {
        outline: 2px solid #f39c12;
        outline-offset: 2px;
        background-color: rgba(255, 255, 255, 0.15) !important;
    }
    
    /* Mobile enhancements */
    @media (max-width: 768px) {
        .sort-indicator {
            right: 4px;
            font-size: 0.8rem;
        }
        
        .sortable-header {
            min-height: 48px;
        }
    }
    
    /* Loading state for sorting */
    .table-sorting {
        opacity: 0.7;
        pointer-events: none;
    }
    
    .table-sorting .order-row {
        transition: opacity 0.3s ease;
    }
`;

// ==========================================
// INITIALIZATION & CLEANUP
// ==========================================

// Apply enhanced styles
const styleSheet = document.createElement('style');
styleSheet.textContent = enhancedStyles;
document.head.appendChild(styleSheet);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.ordersNavManager = new OrdersNavManager();

    // Add debugging info in development
    if (window.location.hostname === 'localhost') {
        console.log('🔧 Development mode: OrdersNavManager debug info available');
        window.debugOrdersManager = () => {
            console.log('Current sort:', window.ordersNavManager.getCurrentSort());
            console.log('Orders data:', window.ordersNavManager.filteredOrdersData);
        };
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.ordersNavManager) {
        window.ordersNavManager.destroy();
    }
});

// Export for external use
window.OrdersNavManager = OrdersNavManager;