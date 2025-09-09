/**
 * CATALOG.JS - DUAL MODE (GRID + TABLE) WAREHOUSE MANAGEMENT
 * ==========================================================
 * Enhanced catalog with professional table view for efficient ordering
 */

class CatalogManager {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.currentView = 'grid'; // 'grid' или 'table'

        // DOM елементи
        this.searchInput = document.getElementById('search-input');
        this.clearSearch = document.getElementById('clear-search');
        this.categoryFilter = document.getElementById('category-filter');
        this.priceMin = document.getElementById('price-min');
        this.priceMax = document.getElementById('price-max');
        this.sortBy = document.getElementById('sort-by');
        this.gridViewBtn = document.getElementById('grid-view');
        this.tableViewBtn = document.getElementById('table-view'); // НОВ
        this.clearFilters = document.getElementById('clear-filters');

        this.productsContainer = document.getElementById('products-container');
        this.productCount = document.getElementById('product-count');
        this.filteredCount = document.getElementById('filtered-count');

        this.loadingState = document.getElementById('loading-state');
        this.emptyState = document.getElementById('empty-state');
        this.noResults = document.getElementById('no-results');
        this.currentPage = 1;
        this.perPage = 24;
        this.perPageSelect = document.getElementById('per-page');
        this.paginationContainer = document.getElementById('pagination-container');

        // Table specific properties
        this.selectedRows = new Set(); // За batch operations
        this.isKeyboardMode = false; // За keyboard navigation

        this.init();
    }

    async init() {
        try {
            this.setupEventListeners();
            this.setupKeyboardHandlers(); // НОВ
            await this.loadProducts();
        } catch (error) {
            console.error('Initialization error:', error);
            window.toastManager.error('Грешка при инициализация на каталога');
        }
    }

    setupEventListeners() {
        // Search functionality
        this.searchInput.addEventListener('input', this.debounce(() => {
            this.handleSearch();
            this.applyFilters();
        }, 300));

        this.clearSearch.addEventListener('click', () => {
            this.searchInput.value = '';
            this.clearSearch.classList.add('hidden');
            this.applyFilters();
        });

        // Filters
        this.categoryFilter.addEventListener('change', () => this.applyFilters());
        this.priceMin.addEventListener('input', this.debounce(() => this.applyFilters(), 500));
        this.priceMax.addEventListener('input', this.debounce(() => this.applyFilters(), 500));

        if (this.sortBy) {
            this.sortBy.addEventListener('change', () => this.applyFilters());
        }

        if (this.clearFilters) {
            this.clearFilters.addEventListener('click', () => this.clearAllFilters());
        }

        // View toggle - ENHANCED
        if (this.gridViewBtn && this.tableViewBtn) {
            this.gridViewBtn.addEventListener('click', () => this.setView('grid'));
            this.tableViewBtn.addEventListener('click', () => this.setView('table'));
        }

        // НОВ: Table view button
        if (this.tableViewBtn) {
            this.tableViewBtn.addEventListener('click', () => this.setView('table'));
        }

        if (this.perPageSelect) {
            this.perPageSelect.addEventListener('change', () => {
                this.perPage = parseInt(this.perPageSelect.value);

                this.currentPage = 1;
                this.renderProducts();
            });
        }
    }

    /**
     * НОВ: Keyboard handlers за professional workflow
     */
    setupKeyboardHandlers() {
        document.addEventListener('keydown', (e) => {
            // Само в table mode и ако не сме в input field
            if (this.currentView !== 'table' || this.isInputFocused()) return;

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.navigateTable(-1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.navigateTable(1);
                    break;
                case 'Enter':
                    e.preventDefault();
                    this.addSelectedToCart();
                    break;
                case 'Escape':
                    this.clearSelection();
                    break;
                case ' ': // Space за select/deselect
                    e.preventDefault();
                    this.toggleRowSelection();
                    break;
            }
        });
    }

    async loadProducts() {
        try {
            this.showLoading(true);

            const response = await fetch('/api/products', {
                method: 'GET',
                credentials: 'include',
                cache: 'no-store',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this.products = await response.json();
            this.filteredProducts = [...this.products];

            this.populateCategories();
            this.applyFilters();
            this.updateProductCount();
            this.showLoading(false);

        } catch (error) {
            console.error('Error loading products:', error);
            window.toastManager.error('Грешка при зареждане на продуктите. Моля, опресняте страницата.');
            this.showError();
        }
    }

    populateCategories() {
        if (!this.categoryFilter) return;

        const categories = [...new Set(this.products
            .filter(p => p.category && p.category.trim())
            .map(p => p.category.trim())
        )].sort((a, b) => {
            // ПОПРАВЕНО: Правилно български locale sorting
            try {
                return a.localeCompare(b, 'bg-BG', {
                    numeric: true,
                    ignorePunctuation: false,
                    sensitivity: 'base'
                });
            } catch (e) {
                return a.toLowerCase().localeCompare(b.toLowerCase());
            }
        });

        // Clear existing options except "Всички"
        const firstOption = this.categoryFilter.firstElementChild;
        this.categoryFilter.innerHTML = '';
        if (firstOption) {
            this.categoryFilter.appendChild(firstOption);
        }

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            this.categoryFilter.appendChild(option);
        });
    }

    handleSearch() {
        const query = this.searchInput.value.trim();
        this.clearSearch.classList.toggle('hidden', !query);
    }

    applyFilters() {
        const searchQuery = this.searchInput.value.trim().toLowerCase();
        const selectedCategory = this.categoryFilter?.value || '';
        const minPrice = parseFloat(this.priceMin?.value) || 0;
        const maxPrice = parseFloat(this.priceMax?.value) || Infinity;
        const sortBy = this.sortBy?.value || 'name-asc'; // ПОПРАВЕНО default value

        // Filter products
        this.filteredProducts = this.products.filter(product => {
            // Search filter - ENHANCED с ID търсене
            const matchesSearch = !searchQuery || (
                product.name.toLowerCase().includes(searchQuery) ||
                product.sku.toLowerCase().includes(searchQuery) ||
                product.id.toString().includes(searchQuery) ||
                (product.description && product.description.toLowerCase().includes(searchQuery))
            );

            // Category filter
            const matchesCategory = !selectedCategory || product.category === selectedCategory;

            // Price filter
            const price = parseFloat(product.price) || 0;
            const matchesPrice = price >= minPrice && price <= maxPrice;

            return matchesSearch && matchesCategory && matchesPrice;
        });

        // Sort products
        this.sortProducts(sortBy);
        this.updateProductCount();
        this.renderProducts();
        this.updateFiltersState();
    }

    /**
     * ПОПРАВЕНА sortProducts функция с robust locale handling
     */
    sortProducts(sortBy) {
        if (!this.filteredProducts || this.filteredProducts.length === 0) return;

        // Helper функция за безопасно localeCompare
        const safeLocaleCompare = (a, b, locale = 'bg-BG') => {
            const strA = (a || '').toString().trim();
            const strB = (b || '').toString().trim();

            try {
                return strA.localeCompare(strB, locale, {
                    numeric: true,
                    ignorePunctuation: false,
                    sensitivity: 'base'
                });
            } catch (e) {
                try {
                    return strA.localeCompare(strB, 'bg');
                } catch (e2) {
                    return strA.toLowerCase().localeCompare(strB.toLowerCase());
                }
            }
        };

        const safeNumber = (value, defaultValue = 0) => {
            const num = parseFloat(value);
            return isNaN(num) ? defaultValue : num;
        };

        this.filteredProducts.sort((a, b) => {
            switch (sortBy) {
                case 'name-asc': // ПОПРАВЕНО: съответства на HTML
                    return safeLocaleCompare(a.name, b.name);

                case 'name-desc':
                    return safeLocaleCompare(b.name, a.name);

                case 'price-asc':
                    return safeNumber(a.price) - safeNumber(b.price);

                case 'price-desc':
                    return safeNumber(b.price) - safeNumber(a.price);

                case 'sku-asc':
                    return safeLocaleCompare(a.sku, b.sku);

                case 'sku-desc':
                    return safeLocaleCompare(b.sku, a.sku);

                case 'stock-desc':
                    return safeNumber(b.actualAvailable) - safeNumber(a.actualAvailable);

                case 'stock-asc':
                    return safeNumber(a.actualAvailable) - safeNumber(b.actualAvailable);

                default:
                    return safeLocaleCompare(a.name, b.name);
            }
        });

        console.log(`✓ Products sorted by: ${sortBy} (${this.filteredProducts.length} items)`);
    }

    renderProducts() {
        if (!this.productsContainer) return;

        this.hideAllStates();

        if (this.filteredProducts.length === 0) {
            this.showEmptyState();
            return;
        }

        // Изчисляване на продукти за текущата страница
        const start = (this.currentPage - 1) * this.perPage;
        const end = start + this.perPage;
        const productsToShow = this.filteredProducts.slice(start, end);

        this.productsContainer.innerHTML = '';

        // ENHANCED: Different rendering based on view mode
        if (this.currentView === 'table') {
            this.renderTableView(productsToShow);
        } else {
            this.renderGridView(productsToShow);
        }

        this.productsContainer.classList.remove('hidden');
        this.renderPagination();
    }

    /**
     * НОВ: Render table view за професионални потребители
     */
    renderTableView(products) {
        this.productsContainer.className = 'products-container table-view';

        const tableHTML = `
            <div class="table-controls">
                <div class="bulk-actions">
                    <button type="button" class="btn-secondary" onclick="catalogManager.selectAllVisible()">
                        <i class="bi bi-check-square"></i> Избери всички
                    </button>
                    <button type="button" class="btn-secondary" onclick="catalogManager.clearSelection()">
                        <i class="bi bi-square"></i> Изчисти избора
                    </button>
                    <button type="button" class="btn-primary" onclick="catalogManager.addSelectedToCart()" disabled id="bulk-add-btn">
                        <i class="bi bi-cart-plus"></i> Добави избраните (<span id="selected-count">0</span>)
                    </button>
                </div>
                <div class="table-info">
                    Показани <strong>${products.length}</strong> от <strong>${this.filteredProducts.length}</strong> продукта
                </div>
            </div>
            
            <div class="professional-table-wrapper">
                <table class="professional-table">
                    <thead>
                        <tr>
                            <th class="select-col">
                                <input type="checkbox" id="select-all-header" onchange="catalogManager.toggleSelectAll(this)">
                            </th>
                            <th class="id-col">ID</th>
                            <th class="sku-col">SKU</th>
                            <th class="name-col">Продукт</th>
                            <th class="category-col">Категория</th>
                            <th class="stock-col">Наличност</th>
                            <th class="price-col">Цена</th>
                            <th class="quantity-col">Количество</th>
                            <th class="actions-col">Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${products.map(product => this.createTableRow(product)).join('')}
                    </tbody>
                </table>
            </div>
        `;

        this.productsContainer.innerHTML = tableHTML;
        this.bindTableEvents();
    }

    /**
     * НОВ: Създаване на table row за продукт
     */
    createTableRow(product) {
        const safeName = this.escapeHtml(product.name || 'Без име');
        const safeSku = this.escapeHtml(product.sku || '');
        const safeCategory = this.escapeHtml(product.category || '');
        const inventory = this.getInventoryData(product);
        const actualAvailable = inventory.actualAvailable;
        const priceWithVat = (parseFloat(product.price) * (1 + product.vatRate / 100)).toFixed(2);

        const stockClass = actualAvailable > 10 ? 'stock-good' :
            actualAvailable > 0 ? 'stock-low' : 'stock-none';

        const stockText = actualAvailable > 0 ? `${actualAvailable} бр.` : 'Няма';

        return `
            <tr class="product-row" data-product-id="${product.id}" tabindex="0">
                <td class="select-col">
                    <input type="checkbox" class="row-selector" value="${product.id}" 
                           onchange="catalogManager.updateSelectionCount()">
                </td>
                <td class="id-col">
                    <span class="product-id">${product.id}</span>
                </td>
                <td class="sku-col">
                    <code class="product-sku">${safeSku}</code>
                </td>
                <td class="name-col">
                    <div class="product-name">${safeName}</div>
                    ${product.description ? `<div class="product-description">${this.escapeHtml(product.description)}</div>` : ''}
                </td>
                <td class="category-col">
                    <span class="product-category">${safeCategory}</span>
                </td>
                <td class="stock-col">
                    <span class="stock-indicator ${stockClass}">${stockText}</span>
                </td>
                <td class="price-col">
                    <div class="price-display">
                        <div class="price-without-vat">${parseFloat(product.price).toFixed(2)} лв</div>
                        <div class="price-with-vat">с ДДС: ${priceWithVat} лв</div>
                    </div>
                </td>
                <td class="quantity-col">
                    <div class="quantity-input-group">
                        <input type="number" class="quantity-input" 
                               value="1" min="1" max="${actualAvailable}" 
                               data-product-id="${product.id}"
                               ${actualAvailable === 0 ? 'disabled' : ''}
                               onkeypress="catalogManager.handleQuantityKeypress(event, ${product.id})">
                    </div>
                </td>
                <td class="actions-col">
                    <button type="button" class="btn-quick-add" 
                            data-product-id="${product.id}"
                            ${actualAvailable === 0 ? 'disabled' : ''}
                            onclick="catalogManager.quickAddToCart(${product.id})">
                        ${actualAvailable === 0 ?
            '<i class="bi bi-x-circle"></i>' :
            '<i class="bi bi-cart-plus"></i>'
        }
                    </button>
                </td>
            </tr>
        `;
    }

    /**
     * СЪЩЕСТВУВАЩ: Render grid view (запазваме оригинала)
     */
    renderGridView(products) {
        this.productsContainer.className = 'products-container products-grid';

        products.forEach(product => {
            const productHTML = this.createProductCard(product);
            this.productsContainer.insertAdjacentHTML('beforeend', productHTML);
        });

        this.bindProductEvents();
    }

    /**
     * НОВ: Table specific event handlers
     */
    bindTableEvents() {
        // Row selection
        this.productsContainer.querySelectorAll('.row-selector').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateSelectionCount();
                this.updateBulkActions();
            });
        });

        // Row focus для keyboard navigation
        this.productsContainer.querySelectorAll('.product-row').forEach(row => {
            row.addEventListener('focus', () => {
                this.isKeyboardMode = true;
                row.classList.add('focused');
            });

            row.addEventListener('blur', () => {
                row.classList.remove('focused');
            });

            row.addEventListener('click', (e) => {
                // Ако click-ът не е върху checkbox или input, focus row-а
                if (!e.target.matches('input, button')) {
                    row.focus();
                }
            });
        });

        // Quantity input handlers
        this.productsContainer.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const productId = parseInt(input.dataset.productId);
                    this.quickAddToCart(productId);
                }
            });
        });
    }

    // СЪЩЕСТВУВАЩИ методи остават непроменени...
    createProductCard(product, isGrid) {
        // [Запазваме оригинала...]
        const safeName = this.escapeHtml(product.name || 'Без име');
        const safeSku = this.escapeHtml(product.sku || '');
        const safeDesc = product.description ? this.escapeHtml(product.description) : '';
        const safeCategory = product.category ? this.escapeHtml(product.category) : '';
        const priceWithVat = (parseFloat(product.price) * (1 + product.vatRate / 100)).toFixed(2);
        const cardClass = isGrid ? 'catalog-product-card' : 'catalog-product-card list-item';

        const inventory = this.getInventoryData(product);
        const available = inventory.available;
        const reserved = inventory.reserved;
        const actualAvailable = inventory.actualAvailable;

        const availableClass = actualAvailable > 10 ? 'catalog-inventory-available' :
            actualAvailable > 0 ? 'catalog-inventory-low' : 'catalog-inventory-none';
        const reservedClass = 'catalog-inventory-reserved';

        return `
        <div class="${cardClass}" data-product-id="${product.id}">
            <div class="catalog-product-header">
                <div class="catalog-product-header-left">
                    <div class="catalog-product-id">ID: ${product.id}</div>
                    <div class="catalog-product-sku">${safeSku}</div>
                </div>
                <div class="catalog-product-header-right">
                    ${safeCategory ? `<div class="catalog-product-category">${safeCategory}</div>` : ''}
                </div>
            </div>

            ${isGrid ? `
                <div class="catalog-inventory-info">
                    <div class="catalog-inventory-item">
                        <span class="catalog-inventory-label">Налични:</span>
                        <span class="catalog-inventory-value ${availableClass}">${actualAvailable} бр.</span>
                    </div>
                    ${reserved > 0 ? `
                        <div class="catalog-inventory-item">
                            <span class="catalog-inventory-label">Запазени:</span>
                            <span class="catalog-inventory-value ${reservedClass}">${reserved} бр.</span>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            
            <div class="catalog-product-content">
                <div class="catalog-product-info">
                    <h3 class="catalog-product-name">${safeName}</h3>
                    ${safeDesc ? `<p class="catalog-product-description">${safeDesc}</p>` : ''}
                </div>
                
                <div class="catalog-product-footer">
                    <div class="catalog-product-price">
                        <div class="catalog-price-without-vat">${parseFloat(product.price).toFixed(2)} лв</div>
                        <div class="catalog-price-with-vat">с ДДС: ${priceWithVat} лв</div>
                    </div>
                    
                    <div class="catalog-add-to-cart-section">
                        <div class="catalog-quantity-controls">
                            <button type="button" class="catalog-qty-btn qty-decrease" data-product-id="${product.id}" ${actualAvailable === 0 ? 'disabled' : ''}>−</button>
                            <input type="number" class="catalog-qty-input" value="1" min="1" max="${actualAvailable}" data-product-id="${product.id}" ${actualAvailable === 0 ? 'disabled' : ''}>
                            <button type="button" class="catalog-qty-btn qty-increase" data-product-id="${product.id}" ${actualAvailable === 0 ? 'disabled' : ''}>+</button>
                        </div>
                        <button type="button" class="catalog-add-to-cart-btn add-to-cart" data-product-id="${product.id}" ${actualAvailable === 0 ? 'disabled' : ''}>
                             ${actualAvailable === 0 ? '<i class="bi bi-exclamation-triangle"></i> Няма налични' : '<i class="bi bi-cart3 me-1"></i>Добави'}
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    }

    bindProductEvents() {
        // [Запазваме оригинала...]
        // Quantity controls
        this.productsContainer.querySelectorAll('.qty-decrease').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.target.dataset.productId;
                const input = this.productsContainer.querySelector(`.catalog-qty-input[data-product-id="${productId}"]`);
                const currentValue = parseInt(input.value) || 1;
                if (currentValue > 1) {
                    input.value = currentValue - 1;
                }
            });
        });

        this.productsContainer.querySelectorAll('.qty-increase').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.target.dataset.productId;
                const input = this.productsContainer.querySelector(`.catalog-qty-input[data-product-id="${productId}"]`);
                const currentValue = parseInt(input.value) || 1;
                if (currentValue < 999) {
                    input.value = currentValue + 1;
                }
            });
        });

        // Add to cart buttons
        this.productsContainer.querySelectorAll('.add-to-cart').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const productId = e.target.dataset.productId;
                const qtyInput = this.productsContainer.querySelector(`.catalog-qty-input[data-product-id="${productId}"]`);
                const quantity = parseInt(qtyInput.value) || 1;

                e.target.classList.add('btn-loading');

                try {
                    await window.cartManager.add(productId, quantity);
                } finally {
                    e.target.classList.remove('btn-loading');
                }
            });
        });
    }

    // НОВИ table specific методи
    setView(view) {
        if (view !== 'grid' && view !== 'table') {
            view = 'grid';
        }

        this.currentView = view;



        this.renderProducts();

        if (this.gridViewBtn) this.gridViewBtn.classList.toggle('active', view === 'grid');
        if (this.tableViewBtn) this.tableViewBtn.classList.toggle('active', view === 'table');
    }

    quickAddToCart(productId) {
        const quantityInput = this.productsContainer.querySelector(`.quantity-input[data-product-id="${productId}"]`);
        const quantity = parseInt(quantityInput?.value) || 1;

        // Visual feedback
        const button = this.productsContainer.querySelector(`.btn-quick-add[data-product-id="${productId}"]`);
        button.classList.add('btn-loading');

        window.cartManager.add(productId, quantity).finally(() => {
            button.classList.remove('btn-loading');
            // Reset quantity
            if (quantityInput) quantityInput.value = 1;
        });
    }

    handleQuantityKeypress(event, productId) {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.quickAddToCart(productId);
        }
    }

    selectAllVisible() {
        const checkboxes = this.productsContainer.querySelectorAll('.row-selector');
        checkboxes.forEach(cb => {
            cb.checked = true;
        });
        this.updateSelectionCount();
        this.updateBulkActions();
    }

    clearSelection() {
        const checkboxes = this.productsContainer.querySelectorAll('.row-selector');
        checkboxes.forEach(cb => {
            cb.checked = false;
        });
        this.selectedRows.clear();
        this.updateSelectionCount();
        this.updateBulkActions();
    }

    toggleSelectAll(headerCheckbox) {
        const checkboxes = this.productsContainer.querySelectorAll('.row-selector');
        checkboxes.forEach(cb => {
            cb.checked = headerCheckbox.checked;
        });
        this.updateSelectionCount();
        this.updateBulkActions();
    }

    updateSelectionCount() {
        const selectedCheckboxes = this.productsContainer.querySelectorAll('.row-selector:checked');
        const count = selectedCheckboxes.length;

        const countElement = document.getElementById('selected-count');
        if (countElement) countElement.textContent = count;

        const bulkBtn = document.getElementById('bulk-add-btn');
        if (bulkBtn) bulkBtn.disabled = count === 0;
    }

    updateBulkActions() {
        // Additional logic за bulk operations ако е нужно
    }

    addSelectedToCart() {
        const selectedCheckboxes = this.productsContainer.querySelectorAll('.row-selector:checked');

        if (selectedCheckboxes.length === 0) {
            window.toastManager.warning('Няма избрани продукти');
            return;
        }

        // Bulk add logic
        const promises = Array.from(selectedCheckboxes).map(checkbox => {
            const productId = checkbox.value;
            const quantityInput = this.productsContainer.querySelector(`.quantity-input[data-product-id="${productId}"]`);
            const quantity = parseInt(quantityInput?.value) || 1;

            return window.cartManager.add(productId, quantity);
        });

        Promise.all(promises).then(() => {
            window.toastManager.success(`Добавени ${selectedCheckboxes.length} продукта в количката`);
            this.clearSelection();
        }).catch(error => {
            window.toastManager.error('Грешка при добавяне на продукти');
            console.error('Bulk add error:', error);
        });
    }

    navigateTable(direction) {
        // Keyboard navigation logic за table rows
        const rows = this.productsContainer.querySelectorAll('.product-row');
        const currentIndex = Array.from(rows).findIndex(row => row.matches(':focus'));

        let newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= rows.length) newIndex = rows.length - 1;

        if (rows[newIndex]) {
            rows[newIndex].focus();
        }
    }

    toggleRowSelection() {
        const focusedRow = this.productsContainer.querySelector('.product-row:focus');
        if (focusedRow) {
            const checkbox = focusedRow.querySelector('.row-selector');
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                this.updateSelectionCount();
                this.updateBulkActions();
            }
        }
    }

    isInputFocused() {
        const activeElement = document.activeElement;
        return activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.tagName === 'SELECT'
        );
    }

    // СЪЩЕСТВУВАЩИ методи остават същите...
    renderPagination() {
        if (!this.paginationContainer) return;

        const totalPages = Math.ceil(this.filteredProducts.length / this.perPage);
        if (totalPages <= 1) {
            this.paginationContainer.innerHTML = '';
            return;
        }

        let html = `
    <div class="pagination-wrapper">
        <div class="pagination-info">
            Страница ${this.currentPage} от ${totalPages}
        </div>
        <div class="pagination">
    `;

        html += `
        <button class="pagination-btn pagination-prev ${this.currentPage === 1 ? 'disabled' : ''}" data-page="${this.currentPage - 1}">
            <i class="bi bi-chevron-left"></i>
        </button>
    `;

        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        if (startPage > 1) {
            html += `<button class="pagination-btn" data-page="1">1</button>`;
            if (startPage > 2) {
                html += `<span class="pagination-ellipsis">…</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `
            <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>
        `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += `<span class="pagination-ellipsis">…</span>`;
            }
            html += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
        }

        html += `
        <button class="pagination-btn pagination-next ${this.currentPage === totalPages ? 'disabled' : ''}" data-page="${this.currentPage + 1}">
            <i class="bi bi-chevron-right"></i>
        </button>
    `;

        html += `</div></div>`;
        this.paginationContainer.innerHTML = html;

        this.paginationContainer.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(btn.dataset.page);
                if (page > 0 && page <= totalPages && !btn.classList.contains('disabled')) {
                    this.currentPage = page;
                    this.renderProducts();
                    this.renderPagination();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    }

    updateProductCount() {
        if (this.productCount) {
            this.productCount.textContent = this.products.length;
        }

        if (this.filteredCount) {
            const isFiltered = this.filteredProducts.length !== this.products.length;
            this.filteredCount.textContent = isFiltered ?
                `(показани ${this.filteredProducts.length})` : '';
            this.filteredCount.classList.toggle('hidden', !isFiltered);
        }
    }

    updateFiltersState() {
        const hasFilters = this.searchInput.value.trim() ||
            this.categoryFilter?.value ||
            this.priceMin?.value ||
            this.priceMax?.value;

        if (this.clearFilters) {
            this.clearFilters.style.display = hasFilters ? 'flex' : 'none';
        }
    }

    clearAllFilters() {
        this.searchInput.value = '';
        if (this.categoryFilter) this.categoryFilter.value = '';
        if (this.priceMin) this.priceMin.value = '';
        if (this.priceMax) this.priceMax.value = '';
        if (this.sortBy) this.sortBy.value = 'name-asc'; // ПОПРАВЕНО

        this.clearSearch.classList.add('hidden');
        this.applyFilters();
    }

    showLoading(show) {
        if (show) {
            this.hideAllStates();
            this.loadingState.classList.remove('hidden');
        } else {
            this.loadingState.classList.add('hidden');
        }
    }

    showEmptyState() {
        this.hideAllStates();

        const hasFilters = this.searchInput.value.trim() ||
            this.categoryFilter?.value ||
            this.priceMin?.value ||
            this.priceMax?.value;

        if (hasFilters) {
            this.noResults.classList.remove('hidden');
        } else {
            this.emptyState.classList.remove('hidden');
        }
    }

    showError() {
        this.hideAllStates();
        this.emptyState.classList.remove('hidden');
    }

    hideAllStates() {
        this.loadingState.classList.add('hidden');
        this.productsContainer.classList.add('hidden');
        this.emptyState.classList.add('hidden');
        this.noResults.classList.add('hidden');
    }

    getInventoryData(product) {
        return {
            available: product.quantityAvailable || 0,
            reserved: product.quantityReserved || 0,
            actualAvailable: product.actualAvailable || 0
        };
    }

    // Utility methods
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.catalogManager = new CatalogManager();
});