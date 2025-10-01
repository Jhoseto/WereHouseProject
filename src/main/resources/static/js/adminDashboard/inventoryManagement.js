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

        if (filters.search?.trim()) {
            params.append('search', filters.search.trim());
        }

        if (filters.category?.trim()) {
            params.append('category', filters.category.trim());
        }

        // ✅ ОПРАВЕНО: Добавяме само ако има валидна стойност
        if (filters.status && filters.status !== '') {
            params.append('active', filters.status);
        }

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

        // TODO: Ще се използва когато се уточнят различни мерни единици бр. Лтр. Кг.
        return this.request('/units');
    }

    // GET all adjustments
    async getAdjustments() {
        return this.request('/adjustments');
    }

    // POST create adjustment
    async createAdjustment(data) {
        return this.request('/adjustments', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
}

// ==========================================
// INVENTORY WEBSOCKET CLASS - ОБНОВЕН С BADGE SUPPORT
// ==========================================
class InventoryWebSocket {
    constructor() {
        this.stompClient = null;
        this.connected = false;
        this.subscriptions = [];
        this.badge = document.getElementById('inventory-ws-badge');
        this.badgeText = this.badge?.querySelector('.connection-text');
        this.tooltipBody = document.getElementById('tooltip-body');
        this.tooltipTitle = document.getElementById('tooltip-title');
    }

    connect() {
        try {
            // Update badge to connecting state
            this.updateBadge('connecting');

            const socket = new SockJS('/ws/dashboard');
            this.stompClient = StompJs.Stomp.over(socket);

            this.stompClient.debug = () => {};

            this.stompClient.reconnectDelay = 5000;
            this.stompClient.heartbeatIncoming = 4000;
            this.stompClient.heartbeatOutgoing = 4000;

            this.stompClient.onConnect = (frame) => {
                console.log('✓ Inventory WebSocket connected');
                this.connected = true;
                this.subscribe();

                // ✅ UPDATE BADGE (вместо toast)
                this.updateBadge('connected');
            };

            this.stompClient.onDisconnect = () => {
                console.log('Inventory WebSocket disconnected');
                this.connected = false;

                // ✅ UPDATE BADGE (вместо toast)
                this.updateBadge('disconnected');
            };

            this.stompClient.onStompError = (frame) => {
                console.error('Inventory WebSocket STOMP error:', frame.headers['message']);
                this.connected = false;

                // ✅ UPDATE BADGE (вместо toast)
                this.updateBadge('disconnected');
            };

            this.stompClient.activate();

        } catch (error) {
            console.error('Failed to connect Inventory WebSocket:', error);
            this.updateBadge('disconnected');
        }
    }

    /**
     * Update connection status badge
     * @param {string} status - 'connecting', 'connected', or 'disconnected'
     */
    updateBadge(status) {
        if (!this.badge) return;

        // Update badge data attribute
        this.badge.dataset.status = status;

        // Status configurations
        const statusConfig = {
            'connecting': {
                text: 'Свързване...',
                tooltipTitle: 'Свързване към сървъра',
                tooltipBody: 'Системата се свързва към сървъра за real-time обновления. Това може да отнеме няколко секунди.'
            },
            'connected': {
                text: 'Online',
                tooltipTitle: 'Активна връзка',
                tooltipBody: 'Свързани сте към сървъра и получавате моментални обновления. Когато друг администратор промени продукт или направи корекция, ще видите промяната веднага без да опреснявате страницата.'
            },
            'disconnected': {
                text: 'Offline',
                tooltipTitle: 'Прекъсната връзка',
                tooltipBody: 'Връзката към сървъра е прекъсната. Промените от други администратори няма да се показват автоматично. Данните ще се обновяват на всеки 30 секунди или при ръчно опресняване. Проверете интернет връзката си или опреснете страницата.'
            }
        };

        const config = statusConfig[status];
        if (config && this.badgeText) {
            this.badgeText.textContent = config.text;
        }

        if (config && this.tooltipTitle) {
            this.tooltipTitle.textContent = config.tooltipTitle;
        }

        if (config && this.tooltipBody) {
            this.tooltipBody.textContent = config.tooltipBody;
        }

        // Log status change
        console.log(`WebSocket status changed: ${status}`);
    }

    subscribe() {
        // Subscribe to product updates
        this.subscriptions.push(
            this.stompClient.subscribe(CONFIG.wsTopics.products, (message) => {
                const data = JSON.parse(message.body);
                this.handleProductUpdate(data);
            })
        );

        // Subscribe to adjustment updates
        this.subscriptions.push(
            this.stompClient.subscribe(CONFIG.wsTopics.adjustments, (message) => {
                const data = JSON.parse(message.body);
                this.handleAdjustmentUpdate(data);
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

        // Show notification САМО за промени от ДРУГИ admins
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

    handleAdjustmentUpdate(data) {
        const { adjustment } = data;

        // Show notification
        if (window.toastManager) {
            window.toastManager.info(
                `Нова корекция за "${adjustment.productName}"`
            );
        }

        // Refresh history if visible
        const historySection = document.getElementById('history-section');
        if (historySection && historySection.style.display !== 'none') {
            window.adjustmentHistory?.loadHistory();
        }

        // Refresh product table (quantities changed)
        window.productTable?.loadProducts();

        // Refresh stats
        window.statsManager?.loadStats();
    }

    disconnect() {
        if (this.stompClient && this.connected) {
            this.subscriptions.forEach(sub => sub.unsubscribe());
            this.stompClient.disconnect();
            this.connected = false;
            this.updateBadge('disconnected');
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
// SUB-TABS SWITCHING
// ==========================================
function setupSubTabs() {
    const subTabButtons = document.querySelectorAll('.sub-tab-btn');
    const productsSection = document.getElementById('products-section');
    const historySection = document.getElementById('history-section');

    subTabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            subTabButtons.forEach(b => b.classList.remove('active'));
            // Add active to clicked
            btn.classList.add('active');

            const tab = btn.dataset.subTab;

            if (tab === 'products') {
                // Show products, hide history
                productsSection.style.display = 'block';
                historySection.style.display = 'none';
            } else if (tab === 'history') {
                // Show history, hide products
                productsSection.style.display = 'none';
                historySection.style.display = 'block';

                // Load history when tab is shown
                if (window.adjustmentHistory) {
                    window.adjustmentHistory.loadHistory();
                }
            }
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

    // New adjustment button
    document.getElementById('btn-new-adjustment')?.addEventListener('click', () => {
        window.adjustmentModal?.open();
    });

    // Refresh history button
    document.getElementById('btn-refresh-history')?.addEventListener('click', () => {
        window.adjustmentHistory?.loadHistory();
        window.toastManager?.info('Историята е обновена');
    });
}

// ==========================================
// ADJUSTMENT HISTORY CLASS
// ==========================================
class AdjustmentHistory {
    constructor() {
        this.tbody = document.getElementById('adjustments-table-body');
        this.loadingEl = document.getElementById('adjustments-loading');
        this.section = document.getElementById('history-section');
        this.adjustments = [];
    }

    async loadHistory() {
        this.showLoading();

        try {
            const response = await window.api.getAdjustments();
            this.adjustments = response.adjustments || [];
            this.render();
        } catch (error) {
            console.error('Failed to load adjustments history:', error);
            window.toastManager?.error('Грешка при зареждане на историята');
        } finally {
            this.hideLoading();
        }
    }

    render() {
        if (!this.adjustments.length) {
            this.tbody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="9">
                        <div class="empty-state-content">
                            <i class="bi bi-inbox"></i>
                            <p>Няма намерени корекции</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        this.tbody.innerHTML = this.adjustments.map(adj => this.renderRow(adj)).join('');
    }

    renderRow(adj) {
        const typeBadge = this.getTypeBadge(adj.adjustmentType);
        const changeBadge = this.getChangeBadge(adj.quantityChange);
        const reasonText = this.getReasonText(adj.reason);

        return `
            <tr>
                <td>
                    <div class="adjustment-date">
                        ${this.formatDate(adj.performedAt)}
                    </div>
                </td>
                <td>
                    <div class="adjustment-product">
                        <strong>${this.escapeHtml(adj.productName)}</strong>
                        <div class="product-sku">${this.escapeHtml(adj.productSku)}</div>
                    </div>
                </td>
                <td>${typeBadge}</td>
                <td>${changeBadge}</td>
                <td><span class="qty-badge">${adj.quantityBefore}</span></td>
                <td><span class="qty-badge">${adj.quantityAfter}</span></td>
                <td><span class="reason-badge">${reasonText}</span></td>
                <td>
                    <div class="adjustment-note">
                        ${adj.note ? this.escapeHtml(adj.note) : '<em class="text-muted">-</em>'}
                    </div>
                </td>
                <td>
                    <div class="user-badge">
                        <i class="bi bi-person-circle"></i>
                        ${this.escapeHtml(adj.performedBy)}
                    </div>
                </td>
            </tr>
        `;
    }

    getTypeBadge(type) {
        const types = {
            'ADD': '<span class="type-badge add"><i class="bi bi-plus-circle"></i> Добавяне</span>',
            'REMOVE': '<span class="type-badge remove"><i class="bi bi-dash-circle"></i> Премахване</span>',
            'SET': '<span class="type-badge set"><i class="bi bi-arrow-clockwise"></i> Задаване</span>'
        };
        return types[type] || type;
    }

    getChangeBadge(change) {
        const isPositive = change > 0;
        const icon = isPositive ? 'arrow-up' : 'arrow-down';
        const className = isPositive ? 'positive' : 'negative';
        const sign = isPositive ? '+' : '';

        return `
            <span class="change-badge ${className}">
                <i class="bi bi-${icon}"></i>
                ${sign}${change}
            </span>
        `;
    }

    getReasonText(reason) {
        const reasons = {
            'RECEIVED': 'Приемане',
            'DAMAGED': 'Повреда',
            'THEFT': 'Кражба/загуба',
            'RETURN': 'Връщане',
            'CORRECTION': 'Корекция',
            'OTHER': 'Друго'
        };
        return reasons[reason] || reason;
    }

    formatDate(datetime) {
        if (!datetime) return '-';
        const date = new Date(datetime);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `
            <div class="date-primary">${day}.${month}.${year}</div>
            <div class="date-time">${hours}:${minutes}</div>
        `;
    }

    showLoading() {
        this.tbody.style.display = 'none';
        this.loadingEl.style.display = 'block';
    }

    hideLoading() {
        this.tbody.style.display = '';
        this.loadingEl.style.display = 'none';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ==========================================
// ADJUSTMENT MODAL CLASS
// ==========================================
class AdjustmentModal {
    constructor() {
        this.modal = document.getElementById('adjustment-modal');
        this.form = document.getElementById('adjustment-form');

        this.productSelect = document.getElementById('adjustment-product');
        this.typeSelect = document.getElementById('adjustment-type');
        this.quantityInput = document.getElementById('adjustment-quantity');
        this.reasonSelect = document.getElementById('adjustment-reason');
        this.noteInput = document.getElementById('adjustment-note');

        this.currentStockDisplay = document.getElementById('current-stock-display');
        this.currentStockValue = document.getElementById('current-stock-value');
        this.typeHelp = document.getElementById('type-help');

        this.setupEvents();
    }

    setupEvents() {
        // Close buttons
        document.getElementById('btn-close-adjustment-modal').addEventListener('click', () => this.close());
        document.getElementById('btn-cancel-adjustment').addEventListener('click', () => this.close());

        // Save button
        document.getElementById('btn-save-adjustment').addEventListener('click', () => this.save());

        // Close on overlay click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        // Product selection change
        this.productSelect.addEventListener('change', (e) => {
            this.updateCurrentStock(e.target.value);
        });

        // Type selection change (update help text)
        this.typeSelect.addEventListener('change', (e) => {
            this.updateTypeHelp(e.target.value);
        });
    }

    async open() {
        this.form.reset();
        this.currentStockDisplay.style.display = 'none';

        // Load products
        await this.loadProducts();

        this.modal.classList.add('active');
        this.productSelect.focus();
    }

    close() {
        this.modal.classList.remove('active');
        this.form.reset();
        this.currentStockDisplay.style.display = 'none';
    }

    async loadProducts() {
        try {
            const response = await window.api.getProducts({});
            const products = response.products || [];

            // Clear and populate product select
            this.productSelect.innerHTML = '<option value="">Избери продукт...</option>';

            products
                .filter(p => p.active)
                .forEach(product => {
                    const option = document.createElement('option');
                    option.value = product.id;
                    option.textContent = `${product.sku} - ${product.name}`;
                    option.dataset.quantity = product.quantityAvailable || 0;
                    option.dataset.unit = product.unit || 'бр';
                    this.productSelect.appendChild(option);
                });

        } catch (error) {
            console.error('Failed to load products:', error);
            window.toastManager?.error('Грешка при зареждане на продукти');
        }
    }

    updateCurrentStock(productId) {
        if (!productId) {
            this.currentStockDisplay.style.display = 'none';
            return;
        }

        const option = this.productSelect.querySelector(`option[value="${productId}"]`);
        if (option) {
            const quantity = option.dataset.quantity || 0;
            const unit = option.dataset.unit || 'бр';

            this.currentStockValue.textContent = `${quantity} ${unit}`;
            this.currentStockDisplay.style.display = 'block';
        }
    }

    updateTypeHelp(type) {
        const helpTexts = {
            'ADD': 'Добавя количество към текущото',
            'REMOVE': 'Премахва количество от текущото',
            'SET': 'Задава ново общо количество (презаписва)'
        };
        this.typeHelp.textContent = helpTexts[type] || '';
    }

    async save() {
        // Validate form
        if (!this.form.checkValidity()) {
            this.form.reportValidity();
            return;
        }

        // Collect data
        const data = {
            productId: parseInt(this.productSelect.value),
            adjustmentType: this.typeSelect.value,
            quantity: parseInt(this.quantityInput.value),
            reason: this.reasonSelect.value,
            note: this.noteInput.value.trim() || null
        };

        try {
            await window.api.createAdjustment(data);
            window.toastManager?.success('Корекцията е записана успешно');

            this.close();

            // Refresh data
            await window.productTable?.loadProducts();
            await window.statsManager?.loadStats();

            // Refresh history if visible
            if (window.adjustmentHistory && this.isHistoryTabVisible()) {
                await window.adjustmentHistory.loadHistory();
            }

        } catch (error) {
            window.toastManager?.error(error.message || 'Грешка при запазване на корекцията');
        }
    }

    isHistoryTabVisible() {
        const historySection = document.getElementById('history-section');
        return historySection && historySection.style.display !== 'none';
    }
}


// ==========================================
// INITIALIZATION
// ==========================================
async function init() {
    console.log('Initializing Inventory Management...');

    // Check for required libraries
    if (typeof SockJS === 'undefined' || typeof StompJs === 'undefined') {
        console.error('SockJS or StompJs library not loaded');
        console.error('Make sure bottomHtmlImports fragment is included');
        return;
    }

    // Initialize managers
    window.api = new InventoryApi();
    window.productTable = new ProductTable();
    window.productModal = new ProductModal();
    window.statsManager = new StatsManager();
    window.filterManager = new FilterManager();
    window.inventoryWs = new InventoryWebSocket();
    window.adjustmentHistory = new AdjustmentHistory();
    window.adjustmentModal = new AdjustmentModal();

    // Setup UI
    setupEventHandlers();
    setupTableSorting();
    setupSubTabs();

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