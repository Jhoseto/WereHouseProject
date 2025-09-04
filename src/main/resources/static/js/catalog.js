/**
 * CATALOG.JS - ОБНОВЕН С CART API
 * ===============================
 */

class CatalogManager {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.currentView = 'grid';

        // DOM елементи
        this.searchInput = document.getElementById('search-input');
        this.clearSearch = document.getElementById('clear-search');
        this.categoryFilter = document.getElementById('category-filter');
        this.priceMin = document.getElementById('price-min');
        this.priceMax = document.getElementById('price-max');
        this.sortBy = document.getElementById('sort-by');
        this.gridViewBtn = document.getElementById('grid-view');
        this.listViewBtn = document.getElementById('list-view');
        this.clearFilters = document.getElementById('clear-filters');

        this.productsContainer = document.getElementById('products-container');
        this.productCount = document.getElementById('product-count');
        this.filteredCount = document.getElementById('filtered-count');

        this.loadingState = document.getElementById('loading-state');
        this.emptyState = document.getElementById('empty-state');
        this.noResults = document.getElementById('no-results');

        this.init();
    }

    async init() {
        try {
            this.setupEventListeners();
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

        // View toggle
        if (this.gridViewBtn && this.listViewBtn) {
            this.gridViewBtn.addEventListener('click', () => this.setView('grid'));
            this.listViewBtn.addEventListener('click', () => this.setView('list'));
        }

        // Reset search
        document.getElementById('reset-search')?.addEventListener('click', () => {
            this.clearAllFilters();
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
        )].sort();

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
        const sortBy = this.sortBy?.value || 'name';

        // Filter products
        this.filteredProducts = this.products.filter(product => {
            // Search filter
            const matchesSearch = !searchQuery ||
                product.name.toLowerCase().includes(searchQuery) ||
                product.sku.toLowerCase().includes(searchQuery) ||
                (product.description && product.description.toLowerCase().includes(searchQuery));

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

    sortProducts(sortBy) {
        this.filteredProducts.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name, 'bg');
                case 'price-asc':
                    return parseFloat(a.price) - parseFloat(b.price);
                case 'price-desc':
                    return parseFloat(b.price) - parseFloat(a.price);
                case 'sku':
                    return a.sku.localeCompare(b.sku);
                default:
                    return 0;
            }
        });
    }

    renderProducts() {
        if (!this.productsContainer) return;

        this.hideAllStates();

        if (this.filteredProducts.length === 0) {
            this.showEmptyState();
            return;
        }

        this.productsContainer.innerHTML = '';
        this.productsContainer.className = `products-container ${this.currentView === 'list' ? 'products-list' : 'products-grid'}`;

        this.filteredProducts.forEach(product => {
            const productHTML = this.createProductCard(product, this.currentView === 'grid');
            this.productsContainer.insertAdjacentHTML('beforeend', productHTML);
        });

        this.bindProductEvents();
        this.productsContainer.classList.remove('hidden');
    }

    createProductCard(product, isGrid) {
        const safeName = this.escapeHtml(product.name || 'Без име');
        const safeSku = this.escapeHtml(product.sku || '');
        const safeDesc = product.description ? this.escapeHtml(product.description) : '';
        const safeCategory = product.category ? this.escapeHtml(product.category) : '';
        const priceWithVat = (parseFloat(product.price) * (1 + product.vatRate / 100)).toFixed(2);
        const cardClass = isGrid ? 'catalog-product-card' : 'catalog-product-card list-item';

        return `
        <div class="${cardClass}" data-product-id="${product.id}">
            ${isGrid ? `
                <div class="catalog-product-header">
                    <div class="catalog-product-sku">${safeSku}</div>
                    ${safeCategory ? `<div class="catalog-product-category">${safeCategory}</div>` : ''}
                </div>
            ` : ''}
            
            <div class="catalog-product-content">
                <div class="catalog-product-info">
                    ${!isGrid ? `
                        <div class="catalog-product-header">
                            <div class="catalog-product-sku">${safeSku}</div>
                            ${safeCategory ? `<div class="catalog-product-category">${safeCategory}</div>` : ''}
                        </div>
                    ` : ''}
                    
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
                            <button type="button" class="catalog-qty-btn qty-decrease" data-product-id="${product.id}">−</button>
                            <input type="number" class="catalog-qty-input" value="1" min="1" max="999" data-product-id="${product.id}">
                            <button type="button" class="catalog-qty-btn qty-increase" data-product-id="${product.id}">+</button>
                        </div>
                        <button type="button" class="catalog-add-to-cart-btn add-to-cart" data-product-id="${product.id}">
                            🛒 Добави
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    }

    bindProductEvents() {
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

        // Add to cart buttons - ИЗПОЛЗВА CART API
        this.productsContainer.querySelectorAll('.add-to-cart').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.target.dataset.productId;
                const qtyInput = this.productsContainer.querySelector(`.catalog-qty-input[data-product-id="${productId}"]`);
                const quantity = parseInt(qtyInput.value) || 1;

                // Използва глобалния cartManager
                window.cartManager.add(productId, quantity);
            });
        });
    }

    // View and state management
    setView(view) {
        this.currentView = view;
        this.renderProducts();

        if (this.gridViewBtn && this.listViewBtn) {
            this.gridViewBtn.classList.toggle('active', view === 'grid');
            this.listViewBtn.classList.toggle('active', view === 'list');
        }
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
        if (this.sortBy) this.sortBy.value = 'name';

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