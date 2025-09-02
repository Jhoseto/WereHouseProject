class CatalogManager {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.currentView = 'grid';
        this.cart = JSON.parse(localStorage.getItem('cart') || '{}');

        // DOM Elements
        this.searchInput = document.getElementById('search-input');
        this.clearSearch = document.getElementById('clear-search');
        this.categoryFilter = document.getElementById('category-filter');
        this.priceMin = document.getElementById('price-min');
        this.priceMax = document.getElementById('price-max');
        this.sortBy = document.getElementById('sort-by');
        this.clearFilters = document.getElementById('clear-filters');

        this.gridViewBtn = document.getElementById('grid-view');
        this.listViewBtn = document.getElementById('list-view');

        this.loadingState = document.getElementById('loading-state');
        this.productsContainer = document.getElementById('products-container');
        this.emptyState = document.getElementById('empty-state');
        this.noResults = document.getElementById('no-results');

        this.productCount = document.getElementById('product-count');
        this.filteredCount = document.getElementById('filtered-count');

        this.cartSidebar = document.getElementById('cart-sidebar');
        this.closeCart = document.getElementById('close-cart');
        this.cartTotal = document.getElementById('cart-total');

        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadProducts();
        this.updateCartDisplay();
    }

    bindEvents() {
        // Search
        this.searchInput.addEventListener('input', this.debounce(() => {
            this.handleSearch();
        }, 300));

        this.clearSearch.addEventListener('click', () => {
            this.searchInput.value = '';
            this.handleSearch();
        });

        // Filters
        this.categoryFilter.addEventListener('change', () => this.applyFilters());
        this.priceMin.addEventListener('input', this.debounce(() => this.applyFilters(), 500));
        this.priceMax.addEventListener('input', this.debounce(() => this.applyFilters(), 500));
        this.sortBy.addEventListener('change', () => this.applyFilters());

        this.clearFilters.addEventListener('click', () => this.clearAllFilters());

        // View toggle
        this.gridViewBtn.addEventListener('click', () => this.setView('grid'));
        this.listViewBtn.addEventListener('click', () => this.setView('list'));

        // Cart
        this.closeCart.addEventListener('click', () => this.toggleCart(false));

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

            const response = await fetch('/api/products');
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

        this.applyFilters(false); // Don't reset search when applying other filters
    }

    applyFilters(resetSearch = true) {
        let products = resetSearch ? [...this.products] : [...this.filteredProducts];

        // Category filter
        const selectedCategory = this.categoryFilter.value;
        if (selectedCategory) {
            products = products.filter(p => p.category === selectedCategory);
        }

        // Price filters
        const minPrice = parseFloat(this.priceMin.value) || 0;
        const maxPrice = parseFloat(this.priceMax.value) || Infinity;

        products = products.filter(p => {
            const price = parseFloat(p.price);
            return price >= minPrice && price <= maxPrice;
        });

        // Sort
        const sortBy = this.sortBy.value;
        products.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name, 'bg');
                case 'name-desc':
                    return b.name.localeCompare(a.name, 'bg');
                case 'price':
                    return parseFloat(a.price) - parseFloat(b.price);
                case 'price-desc':
                    return parseFloat(b.price) - parseFloat(a.price);
                case 'category':
                    return (a.category || '').localeCompare(b.category || '', 'bg');
                default:
                    return 0;
            }
        });

        if (!resetSearch) {
            this.filteredProducts = products;
        } else {
            this.filteredProducts = products;
        }

        this.renderProducts();
        this.updateProductCount();
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

        this.productsContainer.innerHTML = this.filteredProducts.map(product =>
            this.createProductCard(product, isGridView)
        ).join('');

        // Add event listeners to quantity controls and add to cart buttons
        this.bindProductEvents();

        // Add fade in animation
        this.productsContainer.classList.add('fade-in');
    }

    createProductCard(product, isGrid) {
        const priceWithVat = (parseFloat(product.price) * (1 + product.vatRate / 100)).toFixed(2);
        const cardClass = isGrid ? 'product-card' : 'product-card list-item';

        return `
            <div class="${cardClass}" data-product-id="${product.id}">
                ${isGrid ? `
                    <div class="product-header">
                        <div class="product-sku">${product.sku}</div>
                        ${product.category ? `<div class="product-category">${product.category}</div>` : ''}
                    </div>
                ` : ''}
                
                <div class="product-content">
                    <div class="product-info">
                        ${!isGrid ? `
                            <div class="product-header">
                                <div class="product-sku">${product.sku}</div>
                                ${product.category ? `<div class="product-category">${product.category}</div>` : ''}
                            </div>
                        ` : ''}
                        
                        <h3 class="product-name">${this.escapeHtml(product.name)}</h3>
                        
                        ${product.description ? `
                            <p class="product-description">${this.escapeHtml(product.description)}</p>
                        ` : ''}
                    </div>
                    
                    <div class="product-footer">
                        <div class="product-price">
                            <div class="price-without-vat">
                                ${parseFloat(product.price).toFixed(2)} лв
                                <span class="unit-label">/ ${product.unit}</span>
                            </div>
                            <div class="price-with-vat">с ДДС: ${priceWithVat} лв</div>
                        </div>
                        
                        <div class="add-to-cart-section">
                            <div class="quantity-controls">
                                <button type="button" class="qty-btn qty-minus" data-sku="${product.sku}">−</button>
                                <input type="number" class="qty-input" value="1" min="1" max="999" data-sku="${product.sku}">
                                <button type="button" class="qty-btn qty-plus" data-sku="${product.sku}">+</button>
                            </div>
                            <button type="button" class="add-to-cart-btn" data-sku="${product.sku}">
                                🛒 Добави
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindProductEvents() {
        // Quantity controls
        document.querySelectorAll('.qty-minus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const input = e.target.parentNode.querySelector('.qty-input');
                const currentValue = parseInt(input.value);
                if (currentValue > 1) {
                    input.value = currentValue - 1;
                }
            });
        });

        document.querySelectorAll('.qty-plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const input = e.target.parentNode.querySelector('.qty-input');
                const currentValue = parseInt(input.value);
                if (currentValue < 999) {
                    input.value = currentValue + 1;
                }
            });
        });

        // Add to cart buttons
        document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sku = e.target.dataset.sku;
                const qtyInput = e.target.parentNode.querySelector('.qty-input');
                const quantity = parseInt(qtyInput.value);
                this.addToCart(sku, quantity);
            });
        });
    }

    addToCart(sku, quantity) {
        const product = this.products.find(p => p.sku === sku);
        if (!product) return;

        if (this.cart[sku]) {
            this.cart[sku].quantity += quantity;
        } else {
            this.cart[sku] = {
                product: product,
                quantity: quantity
            };
        }

        // Save to localStorage
        localStorage.setItem('cart', JSON.stringify(this.cart));

        // Update display
        this.updateCartDisplay();

        // Show success message
        this.showSuccessMessage(`${product.name} е добавен в кошницата!`);

        // Reset quantity to 1
        document.querySelector(`input[data-sku="${sku}"]`).value = 1;
    }

    updateCartDisplay() {
        const cartItemsCount = Object.values(this.cart).reduce((sum, item) => sum + item.quantity, 0);
        const cartTotal = Object.values(this.cart).reduce((sum, item) =>
            sum + (parseFloat(item.product.price) * item.quantity), 0
        );

        if (this.cartTotal) {
            this.cartTotal.textContent = `${cartTotal.toFixed(2)} лв`;
        }

        // Update cart icon with count (if exists)
        const cartIcon = document.querySelector('.cart-icon-count');
        if (cartIcon) {
            cartIcon.textContent = cartItemsCount;
            cartIcon.style.display = cartItemsCount > 0 ? 'block' : 'none';
        }
    }

    setView(viewType) {
        this.currentView = viewType;

        // Update buttons
        this.gridViewBtn.classList.toggle('active', viewType === 'grid');
        this.listViewBtn.classList.toggle('active', viewType === 'list');

        // Re-render products
        this.renderProducts();

        // Save preference
        localStorage.setItem('catalog-view', viewType);
    }

    clearAllFilters() {
        this.searchInput.value = '';
        this.categoryFilter.value = '';
        this.priceMin.value = '';
        this.priceMax.value = '';
        this.sortBy.value = 'name';

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
            background: var(--color-success);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
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
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    toggleCart(show) {
        this.cartSidebar.classList.toggle('open', show);
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