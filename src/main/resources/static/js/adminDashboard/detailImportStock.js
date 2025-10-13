/**
 * DETAIL IMPORT STOCK JAVASCRIPT
 * ==============================
 * Управление на детайлната страница за импорт на стока с богати филтри,
 * търсене, сортиране, статистики и навигация между импорти.
 *
 * Принципи: Минимален код за максимални резултати
 * Зарежда всички данни веднъж и прави цялата интерактивност в frontend
 */

// ==========================================
// GLOBAL STATE MANAGEMENT
// ==========================================
const STATE = {
    currentImportEvent: null,
    allItems: [],
    filteredItems: [],
    visibleItems: [],
    allImportEvents: [],
    currentPage: 1,
    itemsPerPage: 50,
    sortBy: 'productName',
    sortOrder: 'asc',
    filters: {
        search: '',
        actionType: '',
        category: '',
        minPrice: null,
        maxPrice: null
    },
    filteredStats: {},
    filteredTotals: {}
};

// ==========================================
// API COMMUNICATION CLASS
// ==========================================
class DetailImportAPI {
    constructor() {
        this.baseURL = '/admin/inventory';
    }

    async getImportEventDetails(importEventId) {
        try {
            const response = await fetch(`${this.baseURL}/import-events/${importEventId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Грешка при зареждане на данни');
            }

            return data.importEvent;
        } catch (error) {
            console.error('API Error - getImportEventDetails:', error);
            throw error;
        }
    }

    async getImportEventsForNavigation() {
        try {
            const response = await fetch(`${this.baseURL}/import-events`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Грешка при зареждане на импорти');
            }

            return data.importEvents;
        } catch (error) {
            console.error('API Error - getImportEventsForNavigation:', error);
            throw error;
        }
    }
}

// ==========================================
// DATA LOADING AND INITIALIZATION
// ==========================================
class DataLoader {
    constructor(api) {
        this.api = api;
    }

    async loadImportEventDetails(importEventId) {
        try {
            showLoading('Зареждане на детайли за импорт...');

            const importEvent = await this.api.getImportEventDetails(importEventId);

            STATE.currentImportEvent = importEvent;
            STATE.allItems = importEvent.items || [];

            console.log(`Loaded import event: ${importEvent.fileName} with ${STATE.allItems.length} items`);

            // Извлича уникални категории за филтъра
            this.extractCategories();

            // Първоначално филтриране (без филтри = всички артикули)
            this.applyFilters();

            hideLoading();
            return importEvent;

        } catch (error) {
            hideLoading();
            console.error('Error loading import event details:', error);
            window.toastManager?.error('Грешка при зареждане на импорт данни: ' + error.message);
            throw error;
        }
    }

    async loadNavigationData() {
        try {
            const importEvents = await this.api.getImportEventsForNavigation();
            STATE.allImportEvents = importEvents;

            console.log(`Loaded ${importEvents.length} import events for navigation`);
            return importEvents;

        } catch (error) {
            console.error('Error loading navigation data:', error);
            window.toastManager?.warning('Грешка при зареждане на навигационни данни');
            return [];
        }
    }

    extractCategories() {
        const categories = new Set();
        STATE.allItems.forEach(item => {
            if (item.productCategory) {
                categories.add(item.productCategory);
            }
        });

        // Попълва category filter dropdown
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.innerHTML = '<option value="">Всички категории</option>';

            Array.from(categories).sort().forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categoryFilter.appendChild(option);
            });
        }
    }

    applyFilters() {
        let filtered = [...STATE.allItems];

        // Search filter
        if (STATE.filters.search) {
            const searchLower = STATE.filters.search.toLowerCase();
            filtered = filtered.filter(item =>
                (item.productSku && item.productSku.toLowerCase().includes(searchLower)) ||
                (item.productName && item.productName.toLowerCase().includes(searchLower)) ||
                (item.productCategory && item.productCategory.toLowerCase().includes(searchLower)) ||
                (item.productDescription && item.productDescription.toLowerCase().includes(searchLower))
            );
        }

        // Action type filter
        if (STATE.filters.actionType) {
            filtered = filtered.filter(item => item.actionType === STATE.filters.actionType);
        }

        // Category filter
        if (STATE.filters.category) {
            filtered = filtered.filter(item => item.productCategory === STATE.filters.category);
        }

        // Price range filters
        if (STATE.filters.minPrice !== null && STATE.filters.minPrice !== '') {
            filtered = filtered.filter(item =>
                item.newPurchasePrice && item.newPurchasePrice >= STATE.filters.minPrice
            );
        }

        if (STATE.filters.maxPrice !== null && STATE.filters.maxPrice !== '') {
            filtered = filtered.filter(item =>
                item.newPurchasePrice && item.newPurchasePrice <= STATE.filters.maxPrice
            );
        }

        STATE.filteredItems = filtered;

        // Compute filtered stats
        STATE.filteredStats = {
            totalItems: STATE.filteredItems.length,
            newItems: STATE.filteredItems.filter(item => item.actionType === 'CREATED').length,
            updatedItems: STATE.filteredItems.filter(item => item.actionType === 'UPDATED').length,
        };

        // Compute filtered totals based on import changes * new prices
        const getQuantityChange = (item) => Math.abs((item.newQuantity || 0) - (item.oldQuantity || 0));
        STATE.filteredTotals = {
            totalPurchaseValue: STATE.filteredItems.reduce((sum, item) => sum + getQuantityChange(item) * (item.newPurchasePrice || 0), 0),
            totalSellingValue: STATE.filteredItems.reduce((sum, item) => sum + getQuantityChange(item) * (item.newSellingPrice || 0), 0),
            averageMarkup: STATE.filteredItems.length > 0 ?
                STATE.filteredItems.reduce((sum, item) => sum + (item.markupPercent || 0), 0) / STATE.filteredItems.length :
                0,
        };

        this.applySorting();
        this.updateFilterStatus();
    }

    applySorting() {
        STATE.filteredItems.sort((a, b) => {
            let aVal = a[STATE.sortBy];
            let bVal = b[STATE.sortBy];

            // Handle null/undefined values
            if (aVal == null) aVal = '';
            if (bVal == null) bVal = '';

            // Convert to comparable types
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            let comparison = 0;
            if (aVal < bVal) comparison = -1;
            if (aVal > bVal) comparison = 1;

            return STATE.sortOrder === 'desc' ? -comparison : comparison;
        });

        this.updatePagination();
    }

    updatePagination() {
        const totalItems = STATE.filteredItems.length;
        const totalPages = STATE.itemsPerPage === 'all' ? 1 : Math.ceil(totalItems / STATE.itemsPerPage);

        // Ensure current page is valid
        if (STATE.currentPage > totalPages) {
            STATE.currentPage = Math.max(1, totalPages);
        }

        // Calculate visible items for current page
        if (STATE.itemsPerPage === 'all') {
            STATE.visibleItems = STATE.filteredItems;
        } else {
            const startIndex = (STATE.currentPage - 1) * STATE.itemsPerPage;
            const endIndex = startIndex + STATE.itemsPerPage;
            STATE.visibleItems = STATE.filteredItems.slice(startIndex, endIndex);
        }
    }

    updateFilterStatus() {
        const statusElement = document.getElementById('filter-status');
        const visibleCountElement = document.getElementById('visible-count');
        const totalCountElement = document.getElementById('total-count');
        const activeFiltersElement = document.getElementById('active-filters');

        if (!statusElement) return;

        const hasActiveFilters = this.hasActiveFilters();

        if (hasActiveFilters || STATE.filteredItems.length !== STATE.allItems.length) {
            statusElement.style.display = 'flex';

            if (visibleCountElement) visibleCountElement.textContent = STATE.filteredItems.length;
            if (totalCountElement) totalCountElement.textContent = STATE.allItems.length;

            // Show active filters
            if (activeFiltersElement) {
                activeFiltersElement.innerHTML = this.generateActiveFiltersHTML();
            }
        } else {
            statusElement.style.display = 'none';
        }
    }

    hasActiveFilters() {
        return STATE.filters.search !== '' ||
            STATE.filters.actionType !== '' ||
            STATE.filters.category !== '' ||
            STATE.filters.minPrice !== null ||
            STATE.filters.maxPrice !== null;
    }

    generateActiveFiltersHTML() {
        const filters = [];

        if (STATE.filters.search) {
            filters.push(`Търсене: "${STATE.filters.search}"`);
        }
        if (STATE.filters.actionType) {
            filters.push(`Операция: ${this.getActionTypeText(STATE.filters.actionType)}`);
        }
        if (STATE.filters.category) {
            filters.push(`Категория: ${STATE.filters.category}`);
        }
        if (STATE.filters.minPrice !== null) {
            filters.push(`Мин. цена: ${STATE.filters.minPrice} лв`);
        }
        if (STATE.filters.maxPrice !== null) {
            filters.push(`Макс. цена: ${STATE.filters.maxPrice} лв`);
        }

        return filters.map(filter =>
            `<span class="filter-tag">${filter}</span>`
        ).join('');
    }

    getActionTypeText(actionType) {
        const types = {
            'CREATED': 'Нови продукти',
            'UPDATED': 'Обновявания'
        };
        return types[actionType] || actionType;
    }
}

// ==========================================
// UI RENDERING AND UPDATES
// ==========================================
class UIRenderer {
    updateSummaryCards(importEvent) {
        // Main info card
        this.setElementText('info-filename', importEvent.fileName);
        this.setElementText('info-date', this.formatDateTime(importEvent.uploadedAt));
        this.setElementText('info-user', importEvent.uploadedBy);
        this.setElementText('info-supplier', importEvent.supplierName || 'Не е посочен');
        this.setElementText('info-invoice', importEvent.invoiceNumber || 'Не е посочена');

        // Statistics card - use filtered stats
        const stats = STATE.filteredStats || {
            totalItems: STATE.allItems.length,
            newItems: 0,
            updatedItems: 0
        };
        this.setElementText('stat-total-items', stats.totalItems);
        this.setElementText('stat-new-items', stats.newItems);
        this.setElementText('stat-updated-items', stats.updatedItems);
        this.setElementText('info-notes', importEvent.notes || '-');


        // Financial card - use filtered totals
        const totals = STATE.filteredTotals || {
            totalPurchaseValue: 0,
            totalSellingValue: 0,
            averageMarkup: 0
        };
        this.setElementText('financial-purchase-value', this.formatCurrency(totals.totalPurchaseValue));
        this.setElementText('financial-selling-value', this.formatCurrency(totals.totalSellingValue));
        this.setElementText('financial-average-markup', this.formatPercent(totals.averageMarkup));

        // Update page title
        const pageTitle = document.getElementById('import-title');
        if (pageTitle) {
            pageTitle.textContent = `Импорт: ${importEvent.fileName}`;
        }

        // Update browser title
        document.title = `Импорт: ${importEvent.fileName} | Warehouse Portal`;
    }

    updateNavigationDropdown(importEvents, currentImportId) {
        const selector = document.getElementById('import-selector');
        if (!selector) return;

        selector.innerHTML = '';

        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Избери друг импорт...';
        selector.appendChild(defaultOption);

        // Add import events
        importEvents.forEach(importEvent => {
            const option = document.createElement('option');
            option.value = importEvent.id;
            option.textContent = this.formatImportOptionText(importEvent);

            if (importEvent.id == currentImportId) {
                option.selected = true;
            }

            selector.appendChild(option);
        });
    }

    formatImportOptionText(importEvent) {
        const date = this.formatDate(importEvent.uploadedAt);
        const items = importEvent.totalItems || 0;
        return `${date} - ${importEvent.fileName} (${items} арт.)`;
    }

    renderItemsTable() {
        const tbody = document.getElementById('items-table-body');
        if (!tbody) return;

        if (STATE.visibleItems.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="9">
                        <div class="empty-state-content">
                            <i class="bi bi-inbox"></i>
                            <p>Няма артикули за показване</p>
                        </div>
                    </td>
                </tr>
            `;
            this.hidePagination();
            return;
        }

        const rows = STATE.visibleItems.map(item => this.renderItemRow(item)).join('');
        tbody.innerHTML = rows;

        this.updatePaginationControls();
    }

    renderItemRow(item) {
        const actionTypeBadge = this.getActionTypeBadge(item.actionType);
        const quantityChange = this.formatQuantityChange(item);
        const markup = this.formatPercent(item.markupPercent);

        // Изчисляваме обща стойност само за добавените количества от импорта * нова доставна цена
        const qtyChange = Math.abs((item.newQuantity || 0) - (item.oldQuantity || 0));
        const itemTotalValue = qtyChange * (item.newPurchasePrice || 0);

        return `
            <tr class="item-row" data-item-id="${item.id}">
                <td class="sku-cell">
                    <code class="sku-code">${this.escapeHtml(item.productSku || '')}</code>
                </td>
                <td class="name-cell">
                    <div class="product-name">${this.escapeHtml(item.productName || '')}</div>
                    ${item.productDescription ?
            `<div class="product-description">${this.escapeHtml(item.productDescription)}</div>` : ''
        }
                </td>
                <td class="category-cell">
                    <span class="category-badge">${this.escapeHtml(item.productCategory || '-')}</span>
                </td>
                <td class="action-cell">
                    ${actionTypeBadge}
                </td>
                <td class="quantity-cell">
                    ${quantityChange}
                </td>
                <td class="price-cell">
                    ${this.formatPriceChange(item.oldPurchasePrice, item.newPurchasePrice)}
                </td>
                <td class="price-cell">
                    ${this.formatPriceChange(item.oldSellingPrice, item.newSellingPrice)}
                </td>
                <td class="markup-cell">
                    <span class="markup-value ${this.getMarkupClass(item.markupPercent)}">${markup}</span>
                </td>
                <td class="value-cell">
                    <strong>${this.formatCurrency(itemTotalValue)}</strong>
                </td>
            </tr>
        `;
    }

    getActionTypeBadge(actionType) {
        const badges = {
            'CREATED': '<span class="action-badge created"><i class="bi bi-plus-circle"></i> Нов</span>',
            'UPDATED': '<span class="action-badge updated"><i class="bi bi-arrow-up-circle"></i> Обновен</span>'
        };
        return badges[actionType] || `<span class="action-badge">${actionType}</span>`;
    }

    formatQuantityChange(item) {
        if (item.actionType === 'CREATED') {
            return `<span class="quantity-new">+${item.newQuantity || 0}</span>`;
        } else {
            const change = (item.newQuantity || 0) - (item.oldQuantity || 0);
            const changeClass = change >= 0 ? 'quantity-increase' : 'quantity-decrease';
            const changeSign = change >= 0 ? '+' : '';
            return `
            <div class="quantity-change">
                <div class="change-row">
                    <span class="quantity-old">${item.oldQuantity || 0}</span>
                    <span class="quantity-arrow">→</span>
                    <span class="quantity-new">${item.newQuantity || 0}</span>
                </div>
                <div class="change-diff ${changeClass}">(${changeSign}${change})</div>
            </div>
        `;
        }
    }

    formatPriceChange(oldPrice, newPrice) {
        if (!newPrice) return '-';

        if (!oldPrice || oldPrice === 0) {
            return `<span class="price-new">${this.formatCurrency(newPrice)}</span>`;
        }

        const change = newPrice - oldPrice;
        const changeClass = change >= 0 ? 'price-increase' : 'price-decrease';
        const changeSign = change >= 0 ? '+' : '';

        return `
        <div class="price-change">
            <div class="change-row">
                <span class="price-old">${this.formatCurrency(oldPrice)}</span>
                <span class="price-arrow">→</span>
                <span class="price-new">${this.formatCurrency(newPrice)}</span>
            </div>
            <div class="change-diff ${changeClass}">(${changeSign}${this.formatCurrency(Math.abs(change))})</div>
        </div>
    `;
    }

    getMarkupClass(markupPercent) {
        if (!markupPercent) return '';
        if (markupPercent < 10) return 'low-markup';
        if (markupPercent > 50) return 'high-markup';
        return 'normal-markup';
    }

    updatePaginationControls() {
        const totalItems = STATE.filteredItems.length;

        if (STATE.itemsPerPage === 'all' || totalItems <= STATE.itemsPerPage) {
            this.hidePagination();
            return;
        }

        const totalPages = Math.ceil(totalItems / STATE.itemsPerPage);
        const startItem = (STATE.currentPage - 1) * STATE.itemsPerPage + 1;
        const endItem = Math.min(STATE.currentPage * STATE.itemsPerPage, totalItems);

        // Update pagination info
        this.setElementText('pagination-start', startItem);
        this.setElementText('pagination-end', endItem);
        this.setElementText('pagination-total', totalItems);

        // Update pagination controls
        const prevBtn = document.getElementById('pagination-prev');
        const nextBtn = document.getElementById('pagination-next');

        if (prevBtn) prevBtn.disabled = STATE.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = STATE.currentPage >= totalPages;

        // Update page numbers
        this.updatePageNumbers(totalPages);

        // Show pagination
        const pagination = document.getElementById('table-pagination');
        if (pagination) pagination.style.display = 'flex';
    }

    updatePageNumbers(totalPages) {
        const pagesContainer = document.getElementById('pagination-pages');
        if (!pagesContainer) return;

        const pages = [];
        const current = STATE.currentPage;

        // Always show first page
        if (current > 3) {
            pages.push(1);
            if (current > 4) pages.push('...');
        }

        // Show pages around current
        for (let i = Math.max(1, current - 2); i <= Math.min(totalPages, current + 2); i++) {
            pages.push(i);
        }

        // Always show last page
        if (current < totalPages - 2) {
            if (current < totalPages - 3) pages.push('...');
            pages.push(totalPages);
        }

        pagesContainer.innerHTML = pages.map(page => {
            if (page === '...') {
                return '<span class="pagination-dots">...</span>';
            }

            const isActive = page === current;
            return `<button class="pagination-page ${isActive ? 'active' : ''}" 
                            data-page="${page}">${page}</button>`;
        }).join('');
    }

    hidePagination() {
        const pagination = document.getElementById('table-pagination');
        if (pagination) pagination.style.display = 'none';
    }

    updateSortingHeaders() {
        const headers = document.querySelectorAll('.items-table th[data-sort]');
        headers.forEach(header => {
            const sortBy = header.dataset.sort;
            const icon = header.querySelector('i');

            header.classList.remove('sorted-asc', 'sorted-desc');

            if (sortBy === STATE.sortBy) {
                header.classList.add(`sorted-${STATE.sortOrder}`);
                if (icon) {
                    icon.className = STATE.sortOrder === 'asc' ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
                }
            } else {
                if (icon) {
                    icon.className = 'bi bi-chevron-expand';
                }
            }
        });
    }

    // Helper methods
    setElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) element.textContent = text;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatCurrency(amount) {
        if (!amount && amount !== 0) return '0.00 лв';
        return new Intl.NumberFormat('bg-BG', {
            style: 'currency',
            currency: 'BGN',
            minimumFractionDigits: 2
        }).format(amount);
    }

    formatPercent(percent) {
        if (!percent && percent !== 0) return '0.00%';
        return new Intl.NumberFormat('bg-BG', {
            style: 'percent',
            minimumFractionDigits: 2
        }).format(percent / 100);
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('bg-BG');
    }

    formatDateTime(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('bg-BG');
    }
}

// ==========================================
// EVENT HANDLERS SETUP
// ==========================================
class EventHandlers {
    constructor(dataLoader, renderer) {
        this.dataLoader = dataLoader;
        this.renderer = renderer;
    }

    setupAllEventHandlers() {
        this.setupSearchAndFilters();
        this.setupSorting();
        this.setupPagination();
        this.setupNavigation();
        this.setupActions();
    }

    setupSearchAndFilters() {
        // Search input
        const searchInput = document.getElementById('search-input');
        const clearSearch = document.getElementById('clear-search');

        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    STATE.filters.search = e.target.value.trim();
                    STATE.currentPage = 1;
                    this.dataLoader.applyFilters();
                    this.renderer.updateSummaryCards(STATE.currentImportEvent);
                    this.renderer.renderItemsTable();

                    // Show/hide clear button
                    if (clearSearch) {
                        clearSearch.style.display = e.target.value ? 'block' : 'none';
                    }
                }, 300);
            });
        }

        if (clearSearch) {
            clearSearch.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                    STATE.filters.search = '';
                    STATE.currentPage = 1;
                    this.dataLoader.applyFilters();
                    this.renderer.updateSummaryCards(STATE.currentImportEvent);
                    this.renderer.renderItemsTable();
                    clearSearch.style.display = 'none';
                }
            });
        }

        // Filter dropdowns
        const actionTypeFilter = document.getElementById('action-type-filter');
        if (actionTypeFilter) {
            actionTypeFilter.addEventListener('change', (e) => {
                STATE.filters.actionType = e.target.value;
                STATE.currentPage = 1;
                this.dataLoader.applyFilters();
                this.renderer.updateSummaryCards(STATE.currentImportEvent);
                this.renderer.renderItemsTable();
            });
        }

        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                STATE.filters.category = e.target.value;
                STATE.currentPage = 1;
                this.dataLoader.applyFilters();
                this.renderer.updateSummaryCards(STATE.currentImportEvent);
                this.renderer.renderItemsTable();
            });
        }

        // Price filters
        const minPriceFilter = document.getElementById('min-price-filter');
        const maxPriceFilter = document.getElementById('max-price-filter');

        [minPriceFilter, maxPriceFilter].forEach(filter => {
            if (filter) {
                filter.addEventListener('change', (e) => {
                    const value = e.target.value;
                    const filterName = e.target.id.includes('min') ? 'minPrice' : 'maxPrice';

                    STATE.filters[filterName] = value !== '' ? parseFloat(value) : null;
                    STATE.currentPage = 1;
                    this.dataLoader.applyFilters();
                    this.renderer.updateSummaryCards(STATE.currentImportEvent);
                    this.renderer.renderItemsTable();
                });
            }
        });

        // Reset filters
        const resetFilters = document.getElementById('reset-filters');
        if (resetFilters) {
            resetFilters.addEventListener('click', () => {
                this.resetAllFilters();
            });
        }
    }

    setupSorting() {
        const headers = document.querySelectorAll('.items-table th[data-sort]');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const sortBy = header.dataset.sort;

                if (STATE.sortBy === sortBy) {
                    STATE.sortOrder = STATE.sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    STATE.sortBy = sortBy;
                    STATE.sortOrder = 'asc';
                }

                this.dataLoader.applySorting();
                this.renderer.renderItemsTable();
                this.renderer.updateSortingHeaders();
            });
        });
    }

    setupPagination() {
        // Previous/Next buttons
        const prevBtn = document.getElementById('pagination-prev');
        const nextBtn = document.getElementById('pagination-next');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (STATE.currentPage > 1) {
                    STATE.currentPage--;
                    this.dataLoader.updatePagination();
                    this.renderer.renderItemsTable();
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const totalPages = Math.ceil(STATE.filteredItems.length / STATE.itemsPerPage);
                if (STATE.currentPage < totalPages) {
                    STATE.currentPage++;
                    this.dataLoader.updatePagination();
                    this.renderer.renderItemsTable();
                }
            });
        }

        // Page size selector
        const pageSizeSelect = document.getElementById('pagination-size-select');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                STATE.itemsPerPage = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
                STATE.currentPage = 1;
                this.dataLoader.updatePagination();
                this.renderer.renderItemsTable();
            });
        }

        // Page number clicks (delegated event)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('pagination-page')) {
                const page = parseInt(e.target.dataset.page);
                if (page && page !== STATE.currentPage) {
                    STATE.currentPage = page;
                    this.dataLoader.updatePagination();
                    this.renderer.renderItemsTable();
                }
            }
        });
    }

    setupNavigation() {
        // Import selector dropdown
        const importSelector = document.getElementById('import-selector');
        if (importSelector) {
            importSelector.addEventListener('change', (e) => {
                const importEventId = e.target.value;
                if (importEventId && importEventId != STATE.currentImportEvent?.id) {
                    this.navigateToImport(importEventId);
                }
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('btn-refresh-import');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshCurrentImport();
            });
        }
    }

    setupActions() {
        // Export button
        const exportBtn = document.getElementById('export-data');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportData();
            });
        }
    }

    resetAllFilters() {
        // Reset filter state
        STATE.filters = {
            search: '',
            actionType: '',
            category: '',
            minPrice: null,
            maxPrice: null
        };
        STATE.currentPage = 1;

        // Reset UI controls
        const searchInput = document.getElementById('search-input');
        const clearSearch = document.getElementById('clear-search');
        const actionTypeFilter = document.getElementById('action-type-filter');
        const categoryFilter = document.getElementById('category-filter');
        const minPriceFilter = document.getElementById('min-price-filter');
        const maxPriceFilter = document.getElementById('max-price-filter');

        if (searchInput) searchInput.value = '';
        if (clearSearch) clearSearch.style.display = 'none';
        if (actionTypeFilter) actionTypeFilter.value = '';
        if (categoryFilter) categoryFilter.value = '';
        if (minPriceFilter) minPriceFilter.value = '';
        if (maxPriceFilter) maxPriceFilter.value = '';

        // Apply changes
        this.dataLoader.applyFilters();
        this.renderer.updateSummaryCards(STATE.currentImportEvent);
        this.renderer.renderItemsTable();

        window.toastManager?.info('Филтрите са изчистени');
    }

    navigateToImport(importEventId) {
        const url = new URL(window.location);
        url.searchParams.set('id', importEventId);
        window.location.href = url.toString();
    }

    async refreshCurrentImport() {
        if (!STATE.currentImportEvent) return;

        try {
            window.toastManager?.info('Обновяване на данните...');
            await window.app.dataLoader.loadImportEventDetails(STATE.currentImportEvent.id);
            window.app.renderer.updateSummaryCards(STATE.currentImportEvent);
            window.app.renderer.renderItemsTable();
            window.toastManager?.success('Данните са обновени');
        } catch (error) {
            window.toastManager?.error('Грешка при обновяване на данните');
        }
    }

    exportData() {
        if (!STATE.currentImportEvent || !STATE.filteredItems.length) {
            window.toastManager?.warning('Няма данни за експорт');
            return;
        }

        try {
            const csvData = this.generateCSV();
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');

            link.href = URL.createObjectURL(blob);
            link.download = `import_${STATE.currentImportEvent.fileName}_${this.formatDateForFilename()}.csv`;
            link.click();

            window.toastManager?.success('Файлът е изтеглен успешно');
        } catch (error) {
            console.error('Export error:', error);
            window.toastManager?.error('Грешка при експорт на данните');
        }
    }

    generateCSV() {
        const headers = [
            'SKU', 'Наименование', 'Категория', 'Операция',
            'Старо количество', 'Ново количество', 'Промяна',
            'Стара закупна цена', 'Нова закупна цена',
            'Стара продажна цена', 'Нова продажна цена',
            'Марж %', 'Обща стойност'
        ];

        const rows = STATE.filteredItems.map(item => [
            item.productSku || '',
            item.productName || '',
            item.productCategory || '',
            item.actionType === 'CREATED' ? 'Нов' : 'Обновен',
            item.oldQuantity || '',
            item.newQuantity || '',
            item.quantityChange || '',
            item.oldPurchasePrice || '',
            item.newPurchasePrice || '',
            item.oldSellingPrice || '',
            item.newSellingPrice || '',
            item.markupPercent ? `${item.markupPercent.toFixed(2)}%` : '',
            (Math.abs((item.newQuantity || 0) - (item.oldQuantity || 0)) * (item.newPurchasePrice || 0)) || ''
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        return '\ufeff' + csvContent; // Add BOM for proper UTF-8 in Excel
    }

    formatDateForFilename() {
        return new Date().toISOString().slice(0, 19).replace(/[T:]/g, '_');
    }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function showLoading(message = 'Зареждане...') {
    const loadingEl = document.getElementById('loading-state');
    if (loadingEl) {
        const messageEl = loadingEl.querySelector('p');
        if (messageEl) messageEl.textContent = message;
        loadingEl.style.display = 'flex';
    }
}

function hideLoading() {
    const loadingEl = document.getElementById('loading-state');
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }
}

function getURLParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// ==========================================
// APPLICATION INITIALIZATION
// ==========================================
class DetailImportStockApp {
    constructor() {
        this.api = new DetailImportAPI();
        this.dataLoader = new DataLoader(this.api);
        this.renderer = new UIRenderer();
        this.eventHandlers = new EventHandlers(this.dataLoader, this.renderer);
    }

    async initialize() {
        console.log('Initializing Detail Import Stock application...');

        try {
            // Get import event ID from URL
            const importEventId = getURLParameter('id');
            if (!importEventId) {
                throw new Error('Липсва ID на импорт събитие в URL');
            }

            // Setup event handlers
            this.eventHandlers.setupAllEventHandlers();

            // Load data
            await this.dataLoader.loadImportEventDetails(importEventId);
            const navigationData = await this.dataLoader.loadNavigationData();

            // Update UI
            this.renderer.updateSummaryCards(STATE.currentImportEvent);
            this.renderer.updateNavigationDropdown(navigationData, importEventId);
            this.renderer.renderItemsTable();
            this.renderer.updateSortingHeaders();

            console.log('Detail Import Stock application initialized successfully');

        } catch (error) {
            console.error('Failed to initialize application:', error);
            window.toastManager?.error('Грешка при инициализация: ' + error.message);

            // Show error state
            hideLoading();
            document.body.innerHTML = `
                <div class="error-state">
                    <h2>Грешка при зареждане</h2>
                    <p>${error.message}</p>
                    <button onclick="window.history.back()">Назад</button>
                </div>
            `;
        }
    }
}

// ==========================================
// APPLICATION STARTUP
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    // Global app instance
    window.app = new DetailImportStockApp();

    // Initialize application
    await window.app.initialize();
});