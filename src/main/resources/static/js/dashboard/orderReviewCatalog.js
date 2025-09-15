/**
 * ORDER REVIEW CATALOG - STANDALONE IMPLEMENTATION
 * ===============================================
 * Complete order review interface without CatalogManager dependencies
 * Designed specifically for professional order review workflow
 */

class OrderReviewCatalog {
    constructor(orderId) {
        this.orderId = orderId;
        this.originalOrderItems = new Map();
        this.modifiedItems = new Map();
        this.unavailableItems = new Set();
        this.products = [];
        this.filteredProducts = [];
        this.currentView = 'table';
        this.currentSort = 'priority';
        this.searchTerm = '';
        this.activeFilters = {};

        // Callbacks for parent orchestrator
        this.onQuantityChange = null;
        this.onItemRemove = null;
        this.onItemApprove = null;

        // DOM references
        this.productsContainer = null;
        this.searchInput = null;
        this.filterElements = {};
    }

    async init() {
        try {
            this.initializeDOMReferences();
            this.setupEventListeners();
            await this.loadOrderItems();
            this.populateFilters();
            this.renderProducts();
            this.updateProductCount();
        } catch (error) {
            this.showError('Грешка при зареждане на поръчката: ' + error.message);
        }
    }

    initializeDOMReferences() {
        this.productsContainer = document.getElementById('order-items-container');
        this.searchInput = document.getElementById('product-search');

        // Filter elements
        this.filterElements = {
            availability: document.getElementById('availability-filter'),
            priority: document.getElementById('priority-filter'),
            category: document.getElementById('category-filter'),
            sort: document.getElementById('sort-filter')
        };

        if (!this.productsContainer) {
            throw new Error('Products container not found');
        }
    }

    setupEventListeners() {
        // Search functionality
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.applyFilters();
            });

            // Clear search button
            const clearBtn = document.getElementById('clear-search');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    this.searchInput.value = '';
                    this.searchTerm = '';
                    clearBtn.classList.add('hidden');
                    this.applyFilters();
                });
            }
        }

        // View switching
        const gridViewBtn = document.getElementById('grid-view');
        const tableViewBtn = document.getElementById('table-view');

        if (gridViewBtn) {
            gridViewBtn.addEventListener('click', () => {
                this.switchView('grid');
                gridViewBtn.classList.add('active');
                tableViewBtn?.classList.remove('active');
            });
        }

        if (tableViewBtn) {
            tableViewBtn.addEventListener('click', () => {
                this.switchView('table');
                tableViewBtn.classList.add('active');
                gridViewBtn?.classList.remove('active');
            });
        }

        // Filter listeners
        Object.entries(this.filterElements).forEach(([key, element]) => {
            if (element) {
                element.addEventListener('change', () => this.applyFilters());
            }
        });

        // Clear filters button
        const clearFiltersBtn = document.getElementById('clear-filters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearAllFilters());
        }
    }

    async loadOrderItems() {
        const response = await fetch(`/employer/dashboard/order/${this.orderId}/orderDetailData`);
        const orderData = await response.json();

        if (!orderData.success) {
            throw new Error(orderData.message || 'Failed to load order data');
        }

        // Store original state for comparison
        orderData.data.items.forEach(item => {
            this.originalOrderItems.set(item.productId, {
                quantity: item.quantity,
                price: item.price,
                available: (item.availableStock || 0) >= item.quantity
            });
        });

        // Transform order items to internal format
        this.products = orderData.data.items.map(item => ({
            id: item.productId,
            name: item.productName || 'Неизвестен продукт',
            sku: item.productSku || 'N/A',
            price: item.price || 0,
            category: item.category || 'Некатегоризиран',
            orderedQuantity: item.quantity || 0,
            availableStock: item.availableStock || 0,
            unit: item.unit || 'бр',
            available: (item.availableStock || 0) >= item.quantity,
            imageUrl: '/images/products/default.jpg',
            hasStockIssue: item.hasStockIssue || false
        }));

        this.filteredProducts = [...this.products];
    }

    populateFilters() {
        // Populate category filter
        const categoryFilter = this.filterElements.category;
        if (categoryFilter) {
            const categories = [...new Set(this.products.map(p => p.category))].sort();
            categoryFilter.innerHTML = '<option value="">Всички категории</option>';
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categoryFilter.appendChild(option);
            });
        }
    }

    applyFilters() {
        let filtered = [...this.products];

        // Search filter
        if (this.searchTerm) {
            filtered = filtered.filter(product =>
                product.name.toLowerCase().includes(this.searchTerm) ||
                product.sku.toLowerCase().includes(this.searchTerm) ||
                product.category.toLowerCase().includes(this.searchTerm)
            );

            // Show/hide clear search button
            const clearBtn = document.getElementById('clear-search');
            if (clearBtn) {
                clearBtn.classList.toggle('hidden', !this.searchTerm);
            }
        }

        // Availability filter
        const availabilityFilter = this.filterElements.availability?.value;
        if (availabilityFilter) {
            filtered = filtered.filter(product => {
                switch (availabilityFilter) {
                    case 'available':
                        return product.available;
                    case 'partial':
                        return product.availableStock > 0 && product.availableStock < product.orderedQuantity;
                    case 'unavailable':
                        return product.availableStock === 0;
                    default:
                        return true;
                }
            });
        }

        // Priority filter
        const priorityFilter = this.filterElements.priority?.value;
        if (priorityFilter) {
            filtered = filtered.filter(product => this.getProductPriority(product) === priorityFilter);
        }

        // Category filter
        const categoryFilter = this.filterElements.category?.value;
        if (categoryFilter) {
            filtered = filtered.filter(product => product.category === categoryFilter);
        }

        // Apply sorting
        const sortBy = this.filterElements.sort?.value || 'priority';
        filtered = this.sortProducts(filtered, sortBy);

        this.filteredProducts = filtered;
        this.renderProducts();
        this.updateProductCount();
    }

    sortProducts(products, sortBy) {
        return products.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name, 'bg');
                case 'quantity':
                    return b.orderedQuantity - a.orderedQuantity;
                case 'category':
                    return a.category.localeCompare(b.category, 'bg');
                case 'availability':
                    if (a.available !== b.available) {
                        return a.available ? -1 : 1;
                    }
                    return b.availableStock - a.availableStock;
                case 'priority':
                default:
                    const priorityOrder = { 'critical': 0, 'high': 1, 'normal': 2 };
                    const aPriority = priorityOrder[this.getProductPriority(a)] || 99;
                    const bPriority = priorityOrder[this.getProductPriority(b)] || 99;
                    return aPriority - bPriority;
            }
        });
    }

    switchView(viewType) {
        this.currentView = viewType;
        this.renderProducts();
    }

    renderProducts() {
        if (!this.productsContainer) return;

        if (this.filteredProducts.length === 0) {
            this.showEmptyState();
            return;
        }

        if (this.currentView === 'table') {
            this.renderTableView();
        } else {
            this.renderGridView();
        }
    }

    renderTableView() {
        const table = document.createElement('div');
        table.className = 'review-table-wrapper';
        table.innerHTML = `
            <table class="review-table">
                <thead>
                    <tr>
                        <th>Продукт</th>
                        <th>Поръчано</th>
                        <th>Наличност</th>
                        <th>Корекция</th>
                        <th>Статус</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.filteredProducts.map(product => this.renderTableRow(product)).join('')}
                </tbody>
            </table>
        `;

        this.productsContainer.innerHTML = '';
        this.productsContainer.appendChild(table);
        this.setupTableRowControls();
    }

    renderTableRow(product) {
        const status = this.getProductStatus(product);
        const correctedQty = this.modifiedItems.get(product.id)?.newQuantity || product.orderedQuantity;
        const isModified = this.modifiedItems.has(product.id);

        return `
            <tr class="review-row ${status.className} ${isModified ? 'modified' : ''}" data-product-id="${product.id}">
                <td class="product-info">
                    <div class="product-details">
                        <strong>${product.name}</strong>
                        <small>SKU: ${product.sku}</small>
                    </div>
                </td>
                <td class="ordered-quantity">
                    <span class="quantity-value">${product.orderedQuantity}</span>
                    <small class="quantity-unit">${product.unit}</small>
                </td>
                <td class="stock-level ${product.available ? 'available' : 'unavailable'}">
                    <span class="stock-value">${product.availableStock}</span>
                    <small class="stock-indicator">${status.stockText}</small>
                </td>
                <td class="correction-controls">
                    <div class="quantity-adjuster">
                        <button type="button" class="qty-btn minus" data-action="decrease">−</button>
                        <input type="number" class="correction-input" value="${correctedQty}" 
                               min="0" max="${product.availableStock}" data-product-id="${product.id}">
                        <button type="button" class="qty-btn plus" data-action="increase">+</button>
                    </div>
                </td>
                <td class="status-indicator">
                    <span class="status-badge ${status.className}">${status.text}</span>
                </td>
                <td class="row-actions">
                    <button type="button" class="action-btn approve-item" title="Одобри позиция" data-product-id="${product.id}">✓</button>
                    <button type="button" class="action-btn remove-item" title="Премахни от поръчката" data-product-id="${product.id}">✗</button>
                </td>
            </tr>
        `;
    }

    renderGridView() {
        const grid = document.createElement('div');
        grid.className = 'review-grid';
        grid.innerHTML = this.filteredProducts.map(product => this.renderGridCard(product)).join('');

        this.productsContainer.innerHTML = '';
        this.productsContainer.appendChild(grid);
        this.setupGridCardControls();
    }

    renderGridCard(product) {
        const status = this.getProductStatus(product);
        const correctedQty = this.modifiedItems.get(product.id)?.newQuantity || product.orderedQuantity;
        const isModified = this.modifiedItems.has(product.id);

        return `
            <div class="product-card ${status.className} ${isModified ? 'modified' : ''}" data-product-id="${product.id}">
                <div class="card-header">
                    <h3 class="product-name">${product.name}</h3>
                    <span class="product-sku">SKU: ${product.sku}</span>
                </div>
                
                <div class="card-body">
                    <div class="quantity-info">
                        <div class="ordered">
                            <label>Поръчано:</label>
                            <span>${product.orderedQuantity} ${product.unit}</span>
                        </div>
                        <div class="available">
                            <label>Наличност:</label>
                            <span class="${product.available ? 'in-stock' : 'out-of-stock'}">${product.availableStock} ${product.unit}</span>
                        </div>
                    </div>
                    
                    <div class="correction-section">
                        <label>Корекция:</label>
                        <div class="quantity-adjuster">
                            <button type="button" class="qty-btn minus" data-action="decrease">−</button>
                            <input type="number" class="correction-input" value="${correctedQty}" 
                                   min="0" max="${product.availableStock}" data-product-id="${product.id}">
                            <button type="button" class="qty-btn plus" data-action="increase">+</button>
                        </div>
                    </div>
                </div>
                
                <div class="card-footer">
                    <div class="status-indicator">
                        <span class="status-badge ${status.className}">${status.text}</span>
                    </div>
                    <div class="card-actions">
                        <button type="button" class="action-btn approve-item" title="Одобри позиция" data-product-id="${product.id}">✓</button>
                        <button type="button" class="action-btn remove-item" title="Премахни от поръчката" data-product-id="${product.id}">✗</button>
                    </div>
                </div>
            </div>
        `;
    }

    setupTableRowControls() {
        this.setupQuantityControls();
        this.setupRowActionButtons();
    }

    setupGridCardControls() {
        this.setupQuantityControls();
        this.setupRowActionButtons();
    }

    setupQuantityControls() {
        // Quantity adjustment buttons
        document.querySelectorAll('.qty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const container = e.target.closest('[data-product-id]');
                const productId = parseInt(container.dataset.productId);
                const input = container.querySelector('.correction-input');

                let newValue = parseInt(input.value) || 0;
                const maxValue = parseInt(input.max) || 0;

                if (action === 'increase') {
                    newValue = Math.min(newValue + 1, maxValue);
                } else {
                    newValue = Math.max(newValue - 1, 0);
                }

                input.value = newValue;
                this.updateProductQuantity(productId, newValue);
            });
        });

        // Direct input changes
        document.querySelectorAll('.correction-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const productId = parseInt(e.target.dataset.productId);
                const newQuantity = parseInt(e.target.value) || 0;
                const maxQuantity = parseInt(e.target.max) || 0;

                // Ensure quantity is within bounds
                const validQuantity = Math.max(0, Math.min(newQuantity, maxQuantity));
                if (validQuantity !== newQuantity) {
                    e.target.value = validQuantity;
                }

                this.updateProductQuantity(productId, validQuantity);
            });
        });
    }

    setupRowActionButtons() {
        // Approve item buttons
        document.querySelectorAll('.approve-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = parseInt(e.target.dataset.productId);
                this.approveItem(productId);
            });
        });

        // Remove item buttons
        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = parseInt(e.target.dataset.productId);
                this.removeItem(productId);
            });
        });
    }

    updateProductQuantity(productId, newQuantity) {
        const original = this.originalOrderItems.get(productId);
        if (!original) return;

        const oldQuantity = this.modifiedItems.get(productId)?.newQuantity || original.quantity;

        if (newQuantity !== original.quantity) {
            this.modifiedItems.set(productId, {
                originalQuantity: original.quantity,
                newQuantity: newQuantity,
                changeType: newQuantity === 0 ? 'removed' : 'modified'
            });
        } else {
            this.modifiedItems.delete(productId);
        }

        // Update visual indicators
        this.highlightChangedRow(productId);

        // Notify parent orchestrator
        if (this.onQuantityChange) {
            this.onQuantityChange(productId, oldQuantity, newQuantity);
        }
    }

    approveItem(productId) {
        const container = document.querySelector(`[data-product-id="${productId}"]`);
        if (container) {
            container.classList.add('approved');

            if (window.toastManager) {
                const product = this.products.find(p => p.id === productId);
                window.toastManager.success(`${product?.name || 'Продукт'} одобрен`);
            }
        }

        if (this.onItemApprove) {
            this.onItemApprove(productId);
        }
    }

    removeItem(productId) {
        // Set quantity to 0
        this.updateProductQuantity(productId, 0);

        // Update UI
        const input = document.querySelector(`[data-product-id="${productId}"] .correction-input`);
        if (input) {
            input.value = 0;
        }

        if (window.toastManager) {
            const product = this.products.find(p => p.id === productId);
            window.toastManager.warning(`${product?.name || 'Продукт'} премахнат от поръчката`);
        }

        if (this.onItemRemove) {
            this.onItemRemove(productId);
        }
    }

    highlightChangedRow(productId) {
        const container = document.querySelector(`[data-product-id="${productId}"]`);
        if (container) {
            const isModified = this.modifiedItems.has(productId);
            container.classList.toggle('modified', isModified);
        }
    }

    getProductPriority(product) {
        if (!product.available) {
            return 'critical';
        }
        if (product.availableStock < product.orderedQuantity) {
            return 'high';
        }
        return 'normal';
    }

    getProductStatus(product) {
        if (product.availableStock === 0) {
            return {
                className: 'out-of-stock',
                text: 'Липсва',
                stockText: 'Не е наличен'
            };
        }

        if (product.availableStock < product.orderedQuantity) {
            return {
                className: 'partial-stock',
                text: 'Частично',
                stockText: `Налични ${product.availableStock}`
            };
        }

        return {
            className: 'in-stock',
            text: 'Наличен',
            stockText: 'В наличност'
        };
    }

    updateProductCount() {
        // Update statistics in header
        let available = 0, partial = 0, unavailable = 0;

        this.filteredProducts.forEach(product => {
            if (product.availableStock >= product.orderedQuantity) {
                available++;
            } else if (product.availableStock > 0) {
                partial++;
            } else {
                unavailable++;
            }
        });

        const availableEl = document.getElementById('available-items');
        const partialEl = document.getElementById('partial-items');
        const unavailableEl = document.getElementById('unavailable-items');

        if (availableEl) availableEl.textContent = available;
        if (partialEl) partialEl.textContent = partial;
        if (unavailableEl) unavailableEl.textContent = unavailable;
    }

    clearAllFilters() {
        // Clear search
        if (this.searchInput) {
            this.searchInput.value = '';
            this.searchTerm = '';
        }

        // Clear filter selects
        Object.values(this.filterElements).forEach(element => {
            if (element && element.tagName === 'SELECT') {
                element.selectedIndex = 0;
            }
        });

        // Hide clear search button
        const clearBtn = document.getElementById('clear-search');
        if (clearBtn) {
            clearBtn.classList.add('hidden');
        }

        this.applyFilters();
    }

    showEmptyState() {
        this.productsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="bi bi-search"></i>
                </div>
                <h3>Няма намерени артикули</h3>
                <p>Опитайте да промените филтрите или търсенето.</p>
                <button type="button" class="btn-secondary" onclick="window.orderReviewOrchestrator?.orderReviewCatalog?.clearAllFilters()">
                    Изчисти филтрите
                </button>
            </div>
        `;
    }

    showError(message) {
        if (window.toastManager) {
            window.toastManager.error(message);
        }

        if (this.productsContainer) {
            this.productsContainer.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">
                        <i class="bi bi-exclamation-triangle"></i>
                    </div>
                    <h3>Грешка при зареждане</h3>
                    <p>${message}</p>
                    <button type="button" class="btn-primary" onclick="window.location.reload()">
                        Опитай отново
                    </button>
                </div>
            `;
        }
    }

    getModifiedItems() {
        return this.modifiedItems;
    }

    getOriginalItems() {
        return this.originalOrderItems;
    }

    destroy() {
        // Clean up event listeners if needed
        this.onQuantityChange = null;
        this.onItemRemove = null;
        this.onItemApprove = null;
    }
}