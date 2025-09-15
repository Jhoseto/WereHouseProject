/**
 * ORDER REVIEW CATALOG - Extended CatalogManager for Review Officers
 * ==================================================================
 * Extends existing catalog functionality for order review workflow.
 * Preserves all original catalog features while adding review-specific capabilities.
 */

class OrderReviewCatalog extends CatalogManager {
    constructor(orderId) {
        super();

        // Order review specific properties
        this.orderId = orderId;
        this.originalOrderItems = new Map(); // Original quantities and items
        this.modifiedItems = new Map(); // Track changes for correction message
        this.unavailableItems = new Set(); // Items out of stock
        this.clientHistory = null; // Historical ordering patterns
        this.mode = 'review'; // Distinguishes from client catalog mode

        // Review workflow state
        this.reviewStep = 'analysis'; // analysis -> corrections -> approval
        this.requiresApproval = false;
        this.correctionMessage = '';

        console.log(`OrderReviewCatalog initialized for order ${orderId}`);
    }

    /**
     * Initialize review catalog with order-specific data
     * Loads order items instead of full product catalog
     */
    async init() {
        try {
            this.setupEventListeners();
            this.setupReviewControls();
            await this.loadOrderItems();
            await this.loadClientContext();
            this.initializeReviewWorkflow();
        } catch (error) {
            console.error('Review catalog initialization failed:', error);
            this.showError('Грешка при зареждане на поръчката');
        }
    }

    /**
     * Load order items with enhanced information for review
     * Combines order data with current stock levels and business intelligence
     */
    async loadOrderItems() {
        const response = await fetch(`/employer/dashboard/order/${this.orderId}/details`);
        const orderData = await response.json();

        if (!orderData.success) {
            throw new Error(orderData.message);
        }

        // Store original state for comparison
        orderData.items.forEach(item => {
            this.originalOrderItems.set(item.productId, {
                quantity: item.quantity,
                price: item.price,
                available: item.stockLevel >= item.quantity
            });
        });

        // Transform order items to catalog format for consistent handling
        this.products = orderData.items.map(item => ({
            id: item.productId,
            name: item.productName,
            sku: item.productSku,
            price: item.price,
            category: item.category,
            orderedQuantity: item.quantity,
            stockLevel: item.stockLevel,
            available: item.stockLevel >= item.quantity,
            imageUrl: item.imageUrl || '/images/products/default.jpg',
            description: item.description,
            unit: item.unit
        }));

        this.filteredProducts = [...this.products];
        this.updateProductCount();
        this.renderProducts();
    }

    /**
     * Load client historical data for intelligent suggestions
     */
    async loadClientContext() {
        try {
            const response = await fetch(`/employer/dashboard/client/${this.getClientId()}/history`);
            if (response.ok) {
                this.clientHistory = await response.json();
            }
        } catch (error) {
            console.warn('Could not load client history');
        }
    }

    /**
     * Setup review-specific controls and workflow
     */
    setupReviewControls() {
        // Add review-specific filter options
        this.addReviewFilters();

        // Setup approval workflow controls
        this.setupApprovalControls();

        // Initialize correction tracking
        this.setupCorrectionTracking();
    }

    /**
     * Add business-oriented filters for Review Officers
     */
    addReviewFilters() {
        const filterContainer = document.querySelector('.filters-container');

        // Stock status filter
        const stockFilter = this.createFilterGroup(
            'stock-status',
            'Статус наличност',
            [
                { value: '', label: 'Всички' },
                { value: 'available', label: 'Налични' },
                { value: 'low-stock', label: 'Ниски количества' },
                { value: 'out-of-stock', label: 'Липсващи' }
            ]
        );

        // Priority filter based on order patterns
        const priorityFilter = this.createFilterGroup(
            'priority',
            'Приоритет',
            [
                { value: '', label: 'Всички' },
                { value: 'critical', label: 'Критични' },
                { value: 'standard', label: 'Стандартни' },
                { value: 'flexible', label: 'Гъвкави' }
            ]
        );

        filterContainer.appendChild(stockFilter);
        filterContainer.appendChild(priorityFilter);

        // Setup filter event listeners
        document.getElementById('stock-status').addEventListener('change', () => this.applyFilters());
        document.getElementById('priority').addEventListener('change', () => this.applyFilters());
    }

    /**
     * Override applyFilters to include review-specific logic
     */
    applyFilters() {
        let filtered = [...this.products];

        // Apply original filters (search, category, price)
        filtered = this.applyStandardFilters(filtered);

        // Apply review-specific filters
        const stockStatus = document.getElementById('stock-status')?.value;
        if (stockStatus) {
            filtered = filtered.filter(product => {
                switch (stockStatus) {
                    case 'available':
                        return product.available;
                    case 'low-stock':
                        return product.stockLevel > 0 && product.stockLevel < product.orderedQuantity;
                    case 'out-of-stock':
                        return product.stockLevel === 0;
                    default:
                        return true;
                }
            });
        }

        // Priority filtering based on business rules
        const priority = document.getElementById('priority')?.value;
        if (priority) {
            filtered = filtered.filter(product => this.getProductPriority(product) === priority);
        }

        this.filteredProducts = filtered;
        this.updateProductCount();
        this.renderProducts();
    }

    /**
     * Render products with review-specific enhancements
     */
    renderProducts() {
        if (this.currentView === 'table') {
            this.renderReviewTable();
        } else {
            this.renderReviewGrid();
        }
    }

    /**
     * Render products in professional table format optimized for review
     */
    renderReviewTable() {
        const container = this.productsContainer;

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
                    ${this.filteredProducts.map(product => this.renderReviewTableRow(product)).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = '';
        container.appendChild(table);

        // Setup interactive controls for each row
        this.setupTableRowControls();
    }

    /**
     * Render single table row with review controls
     */
    renderReviewTableRow(product) {
        const status = this.getProductStatus(product);
        const correctedQty = this.modifiedItems.get(product.id)?.quantity || product.orderedQuantity;

        return `
            <tr class="review-row ${status.className}" data-product-id="${product.id}">
                <td class="product-info">
                    <div class="product-image">
                        <img src="${product.imageUrl}" alt="${product.name}" loading="lazy">
                    </div>
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
                    <span class="stock-value">${product.stockLevel}</span>
                    <small class="stock-indicator">${status.stockText}</small>
                </td>
                <td class="correction-controls">
                    <div class="quantity-adjuster">
                        <button type="button" class="qty-btn minus" data-action="decrease">−</button>
                        <input type="number" class="correction-input" value="${correctedQty}" 
                               min="0" max="${product.stockLevel}" data-product-id="${product.id}">
                        <button type="button" class="qty-btn plus" data-action="increase">+</button>
                    </div>
                </td>
                <td class="status-indicator">
                    <span class="status-badge ${status.className}">${status.text}</span>
                </td>
                <td class="row-actions">
                    <button type="button" class="action-btn approve-item" title="Одобри позиция">✓</button>
                    <button type="button" class="action-btn remove-item" title="Премахни от поръчката">✗</button>
                </td>
            </tr>
        `;
    }

    /**
     * Setup interactive controls for table rows
     */
    setupTableRowControls() {
        // Quantity adjustment controls
        document.querySelectorAll('.qty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const row = e.target.closest('.review-row');
                const productId = row.dataset.productId;
                const input = row.querySelector('.correction-input');

                let newValue = parseInt(input.value);
                if (action === 'increase') {
                    newValue = Math.min(newValue + 1, parseInt(input.max));
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
                const productId = e.target.dataset.productId;
                const newQuantity = parseInt(e.target.value) || 0;
                this.updateProductQuantity(productId, newQuantity);
            });
        });

        // Row actions
        document.querySelectorAll('.approve-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.target.closest('.review-row').dataset.productId;
                this.approveItem(productId);
            });
        });

        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.target.closest('.review-row').dataset.productId;
                this.removeItem(productId);
            });
        });
    }

    /**
     * Track quantity changes for correction message generation
     */
    updateProductQuantity(productId, newQuantity) {
        const original = this.originalOrderItems.get(productId);

        if (newQuantity !== original.quantity) {
            this.modifiedItems.set(productId, {
                originalQuantity: original.quantity,
                newQuantity: newQuantity,
                changeType: newQuantity === 0 ? 'removed' : 'modified'
            });
        } else {
            this.modifiedItems.delete(productId);
        }

        this.updateCorrectionPreview();
        this.highlightChangedRows();
    }

    /**
     * Generate preview of correction message (renamed to avoid conflict)
     */
    updateReviewPreview() {
        const changes = Array.from(this.reviewChanges.entries());

        if (changes.length === 0) {
            this.correctionPreview = '';
            return;
        }

        let message = 'Корекции в поръчката:\n';
        changes.forEach(([productId, change]) => {
            const product = this.products.find(p => p.id === productId);
            if (change.changeType === 'removed') {
                message += `• ${product.name} - премахнат от поръчката\n`;
            } else {
                message += `• ${product.name} - количество променено от ${change.originalQuantity} на ${change.newQuantity} ${product.unit}\n`;
            }
        });

        this.correctionPreview = message;
        this.displayReviewPreview();
    }

    /**
     * Get client ID from order data
     */
    getClientId() {
        return document.querySelector('[data-client-id]')?.dataset.clientId;
    }

    /**
     * Determine product priority based on business rules
     */
    getProductPriority(product) {
        if (!product.available && this.clientHistory?.frequentItems?.includes(product.id)) {
            return 'critical';
        }
        if (product.stockLevel < product.orderedQuantity) {
            return 'standard';
        }
        return 'flexible';
    }

    /**
     * Get product status with visual indicators
     */
    getProductStatus(product) {
        if (product.stockLevel === 0) {
            return {
                className: 'out-of-stock',
                text: 'Липсва',
                stockText: 'Не е наличен'
            };
        }

        if (product.stockLevel < product.orderedQuantity) {
            return {
                className: 'partial-stock',
                text: 'Частично',
                stockText: `Налични ${product.stockLevel}`
            };
        }

        return {
            className: 'in-stock',
            text: 'Наличен',
            stockText: 'В наличност'
        };
    }

    /**
     * Show error message to user
     */
    showError(message) {
        if (window.toastManager) {
            window.toastManager.error(message);
        } else {
            alert(message);
        }
    }
}