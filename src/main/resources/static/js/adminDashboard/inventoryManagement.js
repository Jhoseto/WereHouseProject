/**
 * =============================================
 * INVENTORY MANAGEMENT - MAIN CONTROLLER
 * =============================================
 * Модулна архитектура с минимален код
 * Classes: InventoryApi, InventoryWebSocket, ProductTable, ProductModal, StatsManager
 */

// ==========================================
// CONFIGURATION
// ==========================================
const CONFIG = {
    apiBase: '/admin/inventory',
    wsTopics: {
        products: '/topic/inventory/products',
        adjustments: '/topic/inventory/adjustments',
        stats: '/topic/inventory/stats'
    },
    debounceDelay: 300,
    toastDuration: 3000
};

// ==========================================
// STATE MANAGEMENT
// ==========================================
const state = {
    products: [],
    categories: [],
    units: [],
    filters: {
        search: '',
        category: '',
        status: ''
    },
    sortBy: 'name',
    sortOrder: 'asc',
    editingProduct: null
};

// ==========================================
// API CLIENT CLASS
// ==========================================
class InventoryApi {
    constructor() {
        this.baseUrl = CONFIG.apiBase;
        this.csrfToken = document.querySelector('meta[name="_csrf"]')?.content || '';
        this.csrfHeader = document.querySelector('meta[name="_csrf_header"]')?.content || 'X-CSRF-TOKEN';
    }

    // Generic fetch wrapper
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                [this.csrfHeader]: this.csrfToken,
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Грешка при заявката');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // GET all products with filters
    async getProducts(filters = {}) {
        const params = new URLSearchParams();
        if (filters.search) params.append('search', filters.search);
        if (filters.category) params.append('category', filters.category);
        if (filters.status !== '') params.append('active', filters.status);

        const query = params.toString();
        return this.request(`/products${query ? '?' + query : ''}`);
    }

    // GET product by ID
    async getProduct(id) {
        return this.request(`/products/${id}`);
    }

    // POST create product
    async createProduct(data) {
        return this.request('/products', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT update product
    async updateProduct(id, data) {
        return this.request(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // DELETE product (soft delete)
    async deleteProduct(id) {
        return this.request(`/products/${id}`, {
            method: 'DELETE'
        });
    }

    // GET stats
    async getStats() {
        return this.request('/stats');
    }

    // GET categories
    async getCategories() {
        return this.request('/categories');
    }

    // GET units
    async getUnits() {
        return this.request('/units');
    }

    // POST adjust inventory
    async adjustInventory(data) {
        return this.request('/adjustments', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
}

// ==========================================
// WEBSOCKET MANAGER CLASS
// ==========================================
class InventoryWebSocket {
    constructor() {
        this.stompClient = null;
        this.connected = false;
        this.subscriptions = [];
    }

    connect() {
        try {
            const socket = new SockJS('/ws/dashboard');
            this.stompClient = Stomp.over(socket);

            // Disable debug logs
            this.stompClient.debug = () => {};

            this.stompClient.connect({}, () => {
                console.log('WebSocket connected');
                this.connected = true;
                this.subscribe();
            }, (error) => {
                console.error('WebSocket error:', error);
                this.connected = false;
            });
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
        }
    }

    subscribe() {
        // Subscribe to product updates
        this.subscriptions.push(
            this.stompClient.subscribe(CONFIG.wsTopics.products, (message) => {
                const data = JSON.parse(message.body);
                this.handleProductUpdate(data);
            })
        );

        // Subscribe to stats updates
        this.subscriptions.push(
            this.stompClient.subscribe(CONFIG.wsTopics.stats, (message) => {
                const data = JSON.parse(message.body);
                window.statsManager?.update(data.stats);
            })
        );
    }

    handleProductUpdate(data) {
        const { eventType, product } = data;

        // Show notification
        const messages = {
            'created': `Продукт "${product.name}" е създаден`,
            'updated': `Продукт "${product.name}" е обновен`,
            'deleted': `Продукт "${product.name}" е деактивиран`,
            'adjusted': `Наличността на "${product.name}" е коригирана`
        };

        if (window.toastManager) {
            window.toastManager.info(messages[eventType] || 'Промяна в продукт');
        }

        // Refresh table
        window.productTable?.loadProducts();
    }

    disconnect() {
        if (this.stompClient && this.connected) {
            this.subscriptions.forEach(sub => sub.unsubscribe());
            this.stompClient.disconnect();
            this.connected = false;
        }
    }
}

// ==========================================
// PRODUCT TABLE CLASS
// ==========================================
class ProductTable {
    constructor() {
        this.tbody = document.getElementById('products-table-body');
        this.loadingEl = document.getElementById('table-loading');
    }

    async loadProducts() {
        this.showLoading();

        try {
            const response = await window.api.getProducts(state.filters);
            state.products = response.products || [];

            this.sortProducts();
            this.render();
        } catch (error) {
            console.error('Failed to load products:', error);
            window.toastManager?.error('Грешка при зареждане на продукти');
        } finally {
            this.hideLoading();
        }
    }

    sortProducts() {
        state.products.sort((a, b) => {
            let aVal = a[state.sortBy];
            let bVal = b[state.sortBy];

            // Handle null/undefined
            if (aVal == null) aVal = '';
            if (bVal == null) bVal = '';

            // String comparison
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            return state.sortOrder === 'asc' ? comparison : -comparison;
        });
    }

    render() {
        if (!state.products.length) {
            this.tbody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="11">
                        <div class="empty-state-content">
                            <i class="bi bi-inbox"></i>
                            <p>Няма намерени продукти</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        this.tbody.innerHTML = state.products.map(p => this.renderRow(p)).join('');
        this.attachRowEvents();
    }

    renderRow(product) {
        const actualAvailable = Math.max(0,
            (product.quantityAvailable || 0) - (product.quantityReserved || 0)
        );

        const stockClass = actualAvailable > 10 ? 'high' :
            actualAvailable > 0 ? 'low' : 'out';

        const statusBadge = product.active
            ? '<span class="status-badge active"><i class="bi bi-check-circle-fill"></i> Активен</span>'
            : '<span class="status-badge inactive"><i class="bi bi-x-circle-fill"></i> Неактивен</span>';

        return `
            <tr data-product-id="${product.id}" class="${product.active ? '' : 'inactive'}">
                <td><strong>${this.escapeHtml(product.sku)}</strong></td>
                <td>${this.escapeHtml(product.name)}</td>
                <td>${this.escapeHtml(product.category || '-')}</td>
                <td>${this.escapeHtml(product.unit)}</td>
                <td>${this.formatPrice(product.price)} лв</td>
                <td>${product.vatRate}%</td>
                <td>${product.quantityAvailable || 0}</td>
                <td>${product.quantityReserved || 0}</td>
                <td><span class="stock-badge ${stockClass}">${actualAvailable}</span></td>
                <td>${statusBadge}</td>
                <td class="actions-column">
                    <div class="action-buttons">
                        <button class="action-btn edit" data-id="${product.id}" title="Редактирай">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="action-btn delete" data-id="${product.id}" title="Деактивирай">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    attachRowEvents() {
        // Edit buttons
        this.tbody.querySelectorAll('.action-btn.edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                window.productModal?.openEdit(id);
            });
        });

        // Delete buttons
        this.tbody.querySelectorAll('.action-btn.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                this.deleteProduct(id);
            });
        });
    }

    async deleteProduct(id) {
        const product = state.products.find(p => p.id === id);
        if (!product) return;

        if (!confirm(`Сигурни ли сте, че искате да деактивирате "${product.name}"?`)) {
            return;
        }

        try {
            await window.api.deleteProduct(id);
            window.toastManager?.success('Продуктът е деактивиран успешно');
            await this.loadProducts();
            await window.statsManager?.loadStats();
        } catch (error) {
            window.toastManager?.error(error.message || 'Грешка при деактивиране');
        }
    }

    showLoading() {
        this.tbody.style.display = 'none';
        this.loadingEl.style.display = 'block';
    }

    hideLoading() {
        this.tbody.style.display = '';
        this.loadingEl.style.display = 'none';
    }

    formatPrice(price) {
        return parseFloat(price.toString() || 0).toFixed(2);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ==========================================
// PRODUCT MODAL CLASS
// ==========================================
class ProductModal {
    constructor() {
        this.modal = document.getElementById('product-modal');
        this.form = document.getElementById('product-form');
        this.title = document.getElementById('modal-title');

        this.inputs = {
            id: document.getElementById('input-product-id'),
            sku: document.getElementById('input-sku'),
            name: document.getElementById('input-name'),
            category: document.getElementById('input-category'),
            unit: document.getElementById('input-unit'),
            description: document.getElementById('input-description'),
            price: document.getElementById('input-price'),
            vat: document.getElementById('input-vat'),
            quantity: document.getElementById('input-quantity'),
            status: document.getElementById('input-status')
        };

        this.setupEvents();
    }

    setupEvents() {
        // Close buttons
        document.getElementById('btn-close-modal').addEventListener('click', () => this.close());
        document.getElementById('btn-cancel-modal').addEventListener('click', () => this.close());

        // Save button
        document.getElementById('btn-save-product').addEventListener('click', () => this.save());

        // Close on overlay click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        // SKU auto-uppercase
        this.inputs.sku.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    }

    openCreate() {
        this.title.textContent = 'Нов продукт';
        this.form.reset();
        this.inputs.id.value = '';
        this.inputs.status.value = 'true';
        this.inputs.vat.value = '20';
        this.inputs.quantity.value = '0';
        this.inputs.unit.value = 'бр';

        state.editingProduct = null;
        this.modal.classList.add('active');
        this.inputs.sku.focus();
    }

    async openEdit(id) {
        try {
            const response = await window.api.getProduct(id);
            const product = response.product;

            this.title.textContent = 'Редакция на продукт';
            this.inputs.id.value = product.id;
            this.inputs.sku.value = product.sku;
            this.inputs.name.value = product.name;
            this.inputs.category.value = product.category || '';
            this.inputs.unit.value = product.unit;
            this.inputs.description.value = product.description || '';
            this.inputs.price.value = product.price;
            this.inputs.vat.value = product.vatRate;
            this.inputs.quantity.value = product.quantityAvailable;
            this.inputs.status.value = product.active ? 'true' : 'false';

            state.editingProduct = product;
            this.modal.classList.add('active');
            this.inputs.name.focus();
        } catch (error) {
            window.toastManager?.error('Грешка при зареждане на продукт');
        }
    }

    close() {
        this.modal.classList.remove('active');
        this.form.reset();
        state.editingProduct = null;
    }

    async save() {
        // Validate form
        if (!this.form.checkValidity()) {
            this.form.reportValidity();
            return;
        }

        // Collect data
        const data = {
            sku: this.inputs.sku.value.trim().toUpperCase(),
            name: this.inputs.name.value.trim(),
            category: this.inputs.category.value.trim() || null,
            unit: this.inputs.unit.value.trim(),
            description: this.inputs.description.value.trim() || null,
            price: parseFloat(this.inputs.price.value),
            vatRate: parseInt(this.inputs.vat.value),
            quantityAvailable: parseInt(this.inputs.quantity.value),
            quantityReserved: state.editingProduct?.quantityReserved || 0,
            active: this.inputs.status.value === 'true'
        };

        try {
            const isEdit = !!this.inputs.id.value;

            if (isEdit) {
                data.id = parseInt(this.inputs.id.value);
                await window.api.updateProduct(data.id, data);
                window.toastManager?.success('Продуктът е обновен успешно');
            } else {
                await window.api.createProduct(data);
                window.toastManager?.success('Продуктът е създаден успешно');
            }

            this.close();
            await window.productTable?.loadProducts();
            await window.statsManager?.loadStats();
        } catch (error) {
            window.toastManager?.error(error.message || 'Грешка при запазване');
        }
    }
}

// ==========================================
// STATS MANAGER CLASS
// ==========================================
class StatsManager {
    constructor() {
        this.elements = {
            total: document.getElementById('stat-total-products'),
            lowStock: document.getElementById('stat-low-stock'),
            value: document.getElementById('stat-inventory-value'),
            categories: document.getElementById('stat-categories')
        };
    }

    async loadStats() {
        try {
            const response = await window.api.getStats();
            this.update(response.stats);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }

    update(stats) {
        if (!stats) return;

        this.elements.total.textContent = stats.activeProducts || 0;
        this.elements.lowStock.textContent = stats.lowStockCount || 0;
        this.elements.value.textContent = this.formatValue(stats.totalInventoryValue);
        this.elements.categories.textContent = stats.categoriesCount || 0;
    }

    formatValue(value) {
        if (!value) return '0.00 лв';
        return parseFloat(value).toFixed(2) + ' лв';
    }
}

// ==========================================
// FILTERS & SEARCH
// ==========================================
class FilterManager {
    constructor() {
        this.searchInput = document.getElementById('search-input');
        this.categorySelect = document.getElementById('filter-category');
        this.statusSelect = document.getElementById('filter-status');
        this.clearBtn = document.getElementById('btn-clear-search');

        this.setupEvents();
    }

    setupEvents() {
        // Search with debounce
        let searchTimeout;
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                state.filters.search = e.target.value.trim();
                window.productTable?.loadProducts();
            }, CONFIG.debounceDelay);

            // Show/hide clear button
            this.searchInput.parentElement.classList.toggle('has-value', e.target.value.length > 0);
        });

        // Clear search
        this.clearBtn.addEventListener('click', () => {
            this.searchInput.value = '';
            state.filters.search = '';
            this.searchInput.parentElement.classList.remove('has-value');
            window.productTable?.loadProducts();
        });

        // Category filter
        this.categorySelect.addEventListener('change', (e) => {
            state.filters.category = e.target.value;
            window.productTable?.loadProducts();
        });

        // Status filter
        this.statusSelect.addEventListener('change', (e) => {
            state.filters.status = e.target.value;
            window.productTable?.loadProducts();
        });
    }

    async loadCategories() {
        try {
            const response = await window.api.getCategories();
            state.categories = response.categories || [];

            // Populate category select
            this.categorySelect.innerHTML = '<option value="">Всички категории</option>';
            state.categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                this.categorySelect.appendChild(option);
            });

            // Populate datalist for modal
            const datalist = document.getElementById('categories-datalist');
            datalist.innerHTML = '';
            state.categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                datalist.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    }
}

// ==========================================
// TABLE SORTING
// ==========================================
function setupTableSorting() {
    const headers = document.querySelectorAll('.inventory-table thead th[data-sort]');

    headers.forEach(header => {
        header.addEventListener('click', () => {
            const sortBy = header.dataset.sort;

            // Toggle order if same column, else default to asc
            if (state.sortBy === sortBy) {
                state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                state.sortBy = sortBy;
                state.sortOrder = 'asc';
            }

            // Update UI
            headers.forEach(h => h.classList.remove('sorted'));
            header.classList.add('sorted');

            const icon = header.querySelector('i');
            if (icon) {
                icon.className = state.sortOrder === 'asc'
                    ? 'bi bi-chevron-up'
                    : 'bi bi-chevron-down';
            }

            // Re-render table
            window.productTable?.sortProducts();
            window.productTable?.render();
        });
    });
}

// ==========================================
// EVENT HANDLERS
// ==========================================
function setupEventHandlers() {
    // Create button
    document.getElementById('btn-create-product').addEventListener('click', () => {
        window.productModal?.openCreate();
    });

    // Refresh button
    document.getElementById('btn-refresh').addEventListener('click', () => {
        window.productTable?.loadProducts();
        window.statsManager?.loadStats();
        window.toastManager?.info('Данните са обновени');
    });
}

// ==========================================
// INITIALIZATION
// ==========================================
async function init() {
    console.log('Initializing Inventory Management...');

    // Check for required libraries
    if (typeof SockJS === 'undefined' || typeof Stomp === 'undefined') {
        console.error('SockJS or Stomp library not loaded');
        return;
    }

    // Initialize managers
    window.api = new InventoryApi();
    window.productTable = new ProductTable();
    window.productModal = new ProductModal();
    window.statsManager = new StatsManager();
    window.filterManager = new FilterManager();
    window.inventoryWs = new InventoryWebSocket();

    // Setup UI
    setupEventHandlers();
    setupTableSorting();

    // Load initial data
    try {
        await Promise.all([
            window.productTable.loadProducts(),
            window.statsManager.loadStats(),
            window.filterManager.loadCategories()
        ]);

        // Connect WebSocket
        window.inventoryWs.connect();

        console.log('Inventory Management initialized successfully');
    } catch (error) {
        console.error('Failed to initialize:', error);
        window.toastManager?.error('Грешка при инициализация на системата');
    }
}

// ==========================================
// AUTO-INIT WHEN TAB BECOMES ACTIVE
// ==========================================
function checkAndInit() {
    const inventoryTab = document.getElementById('inventory-tab');

    if (inventoryTab && inventoryTab.classList.contains('active')) {
        // Tab is active, initialize if not already done
        if (!window.inventoryInitialized) {
            init();
            window.inventoryInitialized = true;
        }
    }
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndInit);
} else {
    checkAndInit();
}

// Also check when tab button is clicked
document.addEventListener('click', (e) => {
    if (e.target.closest('[data-tab="inventory"]')) {
        setTimeout(checkAndInit, 100);
    }
});