/**
 * CATALOG.JS - ОБНОВЕН ЗА НОВИТЕ CSS КЛАСОВЕ
 * ==========================================
 */

class CatalogManager {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.currentView = 'grid';
        this.cart = {};

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

        this.cartSidebar = document.getElementById('cart-sidebar');
        this.closeCart = document.getElementById('close-cart');

        this.init();
    }

    async init() {
        try {
            this.setupEventListeners();
            await this.loadProducts();
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Грешка при инициализация на каталога');
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

        // Cart
        if (this.closeCart) {
            this.closeCart.addEventListener('click', () => this.toggleCart(false));
        }

        // Reset search
        document.getElementById('reset-search')?.addEventListener('click', () => {
            this.clearAllFilters();
        });

        // Escape key to close cart
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.toggleCart(false);
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
            this.showError('Грешка при зареждане на продуктите. Моля, опресняте страницата.');
            this.showLoading(false);
        }
    }

    populateCategories() {
        const categories = [...new Set(this.products
            .map(p => p.category)
            .filter(c => c && c.trim()))
        ].sort();

        this.categoryFilter.innerHTML = '<option value="">Всички категории</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            this.categoryFilter.appendChild(option);
        });
    }

    handleSearch() {
        const query = this.searchInput.value.trim().toLowerCase();

        if (query) {
            this.clearSearch.classList.remove('hidden');
            this.filteredProducts = this.products.filter(product => {
                return product.name.toLowerCase().includes(query) ||
                    product.sku.toLowerCase().includes(query) ||
                    (product.description && product.description.toLowerCase().includes(query));
            });
        } else {
            this.clearSearch.classList.add('hidden');
            this.filteredProducts = [...this.products];
        }
    }

    applyFilters() {
        let filtered = [...this.products];

        // Search filter
        const query = this.searchInput.value.trim().toLowerCase();
        if (query) {
            filtered = filtered.filter(product => {
                return product.name.toLowerCase().includes(query) ||
                    product.sku.toLowerCase().includes(query) ||
                    (product.description && product.description.toLowerCase().includes(query));
            });
        }

        // Category filter
        const selectedCategory = this.categoryFilter.value;
        if (selectedCategory) {
            filtered = filtered.filter(product => product.category === selectedCategory);
        }

        // Price filter
        const minPrice = parseFloat(this.priceMin.value);
        const maxPrice = parseFloat(this.priceMax.value);

        if (minPrice && !isNaN(minPrice)) {
            filtered = filtered.filter(product => parseFloat(product.price) >= minPrice);
        }

        if (maxPrice && !isNaN(maxPrice)) {
            filtered = filtered.filter(product => parseFloat(product.price) <= maxPrice);
        }

        // Sort
        if (this.sortBy) {
            const sortValue = this.sortBy.value;
            this.sortProducts(filtered, sortValue);
        }

        this.filteredProducts = filtered;
        this.renderProducts();
        this.updateProductCount();
    }

    sortProducts(products, sortBy) {
        switch (sortBy) {
            case 'price-asc':
                products.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
                break;
            case 'price-desc':
                products.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
                break;
            case 'name-asc':
                products.sort((a, b) => a.name.localeCompare(b.name, 'bg'));
                break;
            case 'name-desc':
                products.sort((a, b) => b.name.localeCompare(a.name, 'bg'));
                break;
            default:
                // Default sort by name ascending
                products.sort((a, b) => a.name.localeCompare(b.name, 'bg'));
        }
    }

    renderProducts() {
        if (this.filteredProducts.length === 0) {
            this.showEmptyState();
            return;
        }

        this.hideAllStates();
        this.productsContainer.classList.remove('hidden');

        const isGridView = this.currentView === 'grid';
        this.productsContainer.className = `products-container ${isGridView ? 'products-grid' : 'products-list'}`;

        // Изчистваме контейнера
        this.productsContainer.innerHTML = '';

        // Създаваме fragment за по-бързо рендиране
        const fragment = document.createDocumentFragment();

        this.filteredProducts.forEach(product => {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = this.createProductCard(product, isGridView);
            fragment.appendChild(wrapper.firstElementChild);
        });

        this.productsContainer.appendChild(fragment);

        // Добавяне на събития към бутоните
        this.bindProductEvents();

        // Reset и добавяне на fade-in за анимация
        this.productsContainer.classList.remove('fade-in');
        void this.productsContainer.offsetWidth; // trigger reflow
        this.productsContainer.classList.add('fade-in');
    }

    createProductCard(product, isGrid) {
        const safeName = this.escapeHtml(product.name);
        const safeDesc = product.description ? this.escapeHtml(product.description) : '';
        const safeSku = this.escapeHtml(product.sku);
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
                            <button type="button" class="catalog-qty-btn qty-decrease" data-sku="${safeSku}">−</button>
                            <input type="number" class="catalog-qty-input" value="1" min="1" max="999" data-sku="${safeSku}">
                            <button type="button" class="catalog-qty-btn qty-increase" data-sku="${safeSku}">+</button>
                        </div>
                        <button type="button" class="catalog-add-to-cart-btn add-to-cart" data-sku="${safeSku}">
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
                const sku = e.target.dataset.sku;
                const input = this.productsContainer.querySelector(`.catalog-qty-input[data-sku="${sku}"]`);
                const currentValue = parseInt(input.value) || 1;
                if (currentValue > 1) {
                    input.value = currentValue - 1;
                }
            });
        });

        this.productsContainer.querySelectorAll('.qty-increase').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sku = e.target.dataset.sku;
                const input = this.productsContainer.querySelector(`.catalog-qty-input[data-sku="${sku}"]`);
                const currentValue = parseInt(input.value) || 1;
                if (currentValue < 999) {
                    input.value = currentValue + 1;
                }
            });
        });

        // Add to cart buttons
        this.productsContainer.querySelectorAll('.add-to-cart').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sku = e.target.dataset.sku;
                const qtyInput = this.productsContainer.querySelector(`.catalog-qty-input[data-sku="${sku}"]`);
                const quantity = parseInt(qtyInput.value) || 1;
                this.addToCart(sku, quantity);
            });
        });
    }

    addToCart(sku, quantity) {
        // Simple in-memory cart (no localStorage due to artifacts restriction)
        if (!this.cart[sku]) {
            this.cart[sku] = 0;
        }
        this.cart[sku] += quantity;

        this.updateCartDisplay();
        this.showSuccessMessage(`Добавено в кошницата: ${quantity} бр.`);
    }

    updateCartDisplay() {
        const totalItems = Object.values(this.cart).reduce((sum, qty) => sum + qty, 0);
        const cartBadge = document.querySelector('.cart-badge');
        if (cartBadge) {
            cartBadge.textContent = totalItems;
            cartBadge.style.display = totalItems > 0 ? 'block' : 'none';
        }
    }

    setView(viewType) {
        this.currentView = viewType;

        // Update buttons
        if (this.gridViewBtn && this.listViewBtn) {
            this.gridViewBtn.classList.toggle('active', viewType === 'grid');
            this.listViewBtn.classList.toggle('active', viewType === 'list');
        }

        // Re-render products
        this.renderProducts();
    }

    clearAllFilters() {
        this.searchInput.value = '';
        this.categoryFilter.value = '';
        this.priceMin.value = '';
        this.priceMax.value = '';
        if (this.sortBy) {
            this.sortBy.value = 'name-asc';
        }

        this.clearSearch.classList.add('hidden');
        this.filteredProducts = [...this.products];

        this.applyFilters();
    }

    updateProductCount() {
        const totalCount = this.products.length;
        const filteredCount = this.filteredProducts.length;

        this.productCount.textContent = totalCount;

        if (filteredCount < totalCount) {
            this.filteredCount.textContent = `(показани ${filteredCount})`;
            this.filteredCount.classList.remove('hidden');
        } else {
            this.filteredCount.classList.add('hidden');
        }
    }

    showLoading(show) {
        this.loadingState.classList.toggle('hidden', !show);
        this.productsContainer.classList.toggle('hidden', show);
        this.emptyState.classList.add('hidden');
        this.noResults.classList.add('hidden');
    }

    showEmptyState() {
        this.hideAllStates();

        const hasFilters = this.searchInput.value.trim() ||
            this.categoryFilter.value ||
            this.priceMin.value ||
            this.priceMax.value;

        if (hasFilters) {
            this.noResults.classList.remove('hidden');
        } else {
            this.emptyState.classList.remove('hidden');
        }
    }

    hideAllStates() {
        this.loadingState.classList.add('hidden');
        this.productsContainer.classList.add('hidden');
        this.emptyState.classList.add('hidden');
        this.noResults.classList.add('hidden');
    }

    showError(message) {
        // Simple error display - could be enhanced with a proper modal
        alert(message);
    }

    showSuccessMessage(message) {
        // Create and show success toast
        const toast = document.createElement('div');
        toast.className = 'success-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #e1942b 0%, #ffbe31 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(225, 148, 43, 0.3);
            z-index: 10000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            display: flex;
            align-items: center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-weight: 500;
            font-size: 0.9rem;
        `;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    toggleCart(show) {
        if (this.cartSidebar) {
            this.cartSidebar.classList.toggle('open', show);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.catalogManager = new CatalogManager();
});

// Handle page visibility change to refresh cart state
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.catalogManager) {
        window.catalogManager.updateCartDisplay();
    }
});

// Export for potential use in other scripts
window.CatalogManager = CatalogManager;