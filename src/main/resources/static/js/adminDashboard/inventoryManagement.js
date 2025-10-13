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
window.state = state;

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
    // ЗАМЕНЯМЕ getAdjustments() с новия метод:
    async getHistory() {
        const response = await fetch('/admin/inventory/history', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    // POST create adjustment
    async createAdjustment(data) {
        return this.request('/adjustments', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // ADJUSTMENT - Корекция на наличности
    async adjustInventory(data) {
        return this.request('/adjustments', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async getImportEventDetails(importEventId) {
        const response = await fetch(`/admin/inventory/import-events/${importEventId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    async getImportEventsForNavigation() {
        const response = await fetch('/admin/inventory/import-events', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
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
                        <button class="action-btn graph" data-id="${product.id}" title="Графика">
                            <i class="bi bi-graph-up"></i>
                        </button>
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
        // Graph buttons
        this.tbody.querySelectorAll('.action-btn.graph').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                window.GraphModal.open([id]);
            });
        });

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
        this.saveBtn = document.getElementById('btn-save-product');

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
        this.setupValidation();
    }

    setupEvents() {
        document.getElementById('btn-close-modal').addEventListener('click', () => this.close());
        document.getElementById('btn-cancel-modal').addEventListener('click', () => this.close());
        this.saveBtn.addEventListener('click', () => this.save());

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        // SKU auto-uppercase
        this.inputs.sku.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });

        const scanBtn = document.getElementById('btn-scan-barcode');
        if (scanBtn) {
            scanBtn.addEventListener('click', () => {
                console.log('🔵 Barcode scan button clicked'); // За debug
                this.startBarcodeScanner();
            });
        } else {
            console.warn('⚠️ Barcode scan button not found');
        }

        const closeScannerBtn = document.getElementById('btn-close-scanner');
        if (closeScannerBtn) {
            closeScannerBtn.addEventListener('click', () => {
                console.log('🔵 Closing scanner'); // За debug
                BarcodeScannerManager.getInstance().stopCamera();
            });
        }
    }

    setupValidation() {
        // SKU validation - само букви, цифри и тире
        this.inputs.sku.addEventListener('input', (e) => {
            const value = e.target.value;
            const cleaned = value.replace(/[^A-Z0-9\-]/g, '');
            if (value !== cleaned) {
                e.target.value = cleaned;
                window.toastManager?.warn('SKU може да съдържа само букви, цифри и тире');
            }
        });

        // Price validation - блокираме отрицателни числа
        this.inputs.price.addEventListener('keydown', (e) => {
            if (e.key === '-' || e.key === 'e') {
                e.preventDefault();
            }
        });

        // Removal quantity real-time validation
        const removeQtyInput = document.getElementById('remove-qty');
        if (removeQtyInput) {
            removeQtyInput.addEventListener('input', (e) => {
                const value = parseInt(e.target.value) || 0;
                const max = parseInt(e.target.getAttribute('max')) || 0;

                if (value > max) {
                    e.target.value = max;
                    window.toastManager?.warn(`Максимално можете да премахнете ${max} бройки`);
                }
            });
        }
    }

    startBarcodeScanner() {
        console.log('🟢 Starting barcode scanner...');

        const scanner = BarcodeScannerManager.getInstance();

        if (!scanner.isAvailable()) {
            window.toastManager?.error('Библиотеката за сканиране не е заредена');
            console.error('❌ Scanner library not available');
            return;
        }

        scanner.scan({
            onSuccess: (productData) => {
                console.log('✅ Product found:', productData);

                // Попълни формата с данните
                this.inputs.sku.value = productData.sku;
                this.inputs.name.value = productData.name;
                this.inputs.category.value = productData.category || '';
                this.inputs.unit.value = productData.unit || 'бр';
                this.inputs.vat.value = productData.vatRate || 20;
                this.inputs.description.value = productData.description || '';

                window.toastManager?.success(`Продукт намерен: ${productData.name}`);
                this.inputs.price.focus();
            },

            onNotFound: (barcode) => {
                console.log('⚠️ Product not found, barcode:', barcode);

                this.inputs.sku.value = barcode;
                window.toastManager?.info('Продуктът не е намерен. Попълнете данните ръчно.');
                this.inputs.name.focus();
            },

            onError: (error) => {
                console.error('❌ Scanner error:', error);
                window.toastManager?.error('Грешка при сканиране: ' + error.message);
            }
        });
    }

    openCreate() {
        this.title.textContent = 'Нов артикул';
        this.form.reset();
        this.inputs.id.value = '';
        this.inputs.status.value = 'true';
        this.inputs.vat.value = '20';
        this.inputs.quantity.value = '0';
        this.inputs.unit.value = 'бр';
        this.inputs.price.value = '';

        const removalSection = document.getElementById('removal-section');
        if (removalSection) removalSection.style.display = 'none';

        this.inputs.quantity.readOnly = false;
        this.inputs.quantity.style.backgroundColor = '';
        this.inputs.quantity.style.cursor = '';

        this.inputs.sku.readOnly = false;
        this.inputs.sku.style.backgroundColor = '';

        state.editingProduct = null;
        this.modal.classList.add('active');
        this.inputs.sku.focus();
    }

    async openEdit(id) {
        try {
            const response = await window.api.getProduct(id);
            const product = response.product;

            this.title.textContent = 'Редакция на артикул';
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

            const removalSection = document.getElementById('removal-section');

            // Ако продукта е деактивиран - скриваме removal секцията
            if (!product.active) {
                if (removalSection) removalSection.style.display = 'none';
                window.toastManager?.warn('Този продукт е деактивиран. Активирайте го за да правите корекции.');
            } else {
                if (removalSection) {
                    removalSection.style.display = 'block';

                    // Показваме текущите наличности
                    const currentQtyDisplay = document.getElementById('current-qty-display');
                    if (currentQtyDisplay) {
                        currentQtyDisplay.textContent = (product.quantityAvailable || 0) + ' ' + product.unit;
                    }

                    // Настройваме max атрибут на полето за премахване
                    const removeQty = document.getElementById('remove-qty');
                    if (removeQty) {
                        removeQty.value = '';
                        removeQty.setAttribute('max', product.quantityAvailable);
                        removeQty.setAttribute('min', '1');
                    }

                    const removeReason = document.getElementById('remove-reason');
                    const removeNote = document.getElementById('remove-note');
                    if (removeReason) removeReason.value = '';
                    if (removeNote) removeNote.value = '';
                }
            }

            // Quantity е read-only при редакция
            this.inputs.quantity.readOnly = true;
            this.inputs.quantity.style.backgroundColor = '#f5f5f5';
            this.inputs.quantity.style.cursor = 'not-allowed';
            this.inputs.quantity.title = 'Количествата се променят чрез корекции';

            // SKU е read-only при редакция
            this.inputs.sku.readOnly = true;
            this.inputs.sku.style.backgroundColor = '#f5f5f5';

            state.editingProduct = product;
            this.modal.classList.add('active');
            this.inputs.name.focus();

        } catch (error) {
            console.error('Error loading product:', error);
            window.toastManager?.error('Грешка при зареждане на продукта');
        }
    }

    close() {
        this.modal.classList.remove('active');
        this.form.reset();
        state.editingProduct = null;
    }

    async save() {
        // HTML5 validation проверка
        if (!this.form.checkValidity()) {
            this.form.reportValidity();
            return;
        }

        try {
            const productData = {
                sku: this.inputs.sku.value.trim(),
                name: this.inputs.name.value.trim(),
                unit: this.inputs.unit.value.trim(),
                price: parseFloat(this.inputs.price.value),
                vatRate: parseInt(this.inputs.vat.value),
                category: this.inputs.category.value.trim(),
                description: this.inputs.description.value.trim(),
                active: this.inputs.status.value === 'true'
            };

            if (state.editingProduct) {
                // РЕЖИМ РЕДАКЦИЯ
                productData.id = state.editingProduct.id;
                productData.quantityAvailable = state.editingProduct.quantityAvailable;
                productData.quantityReserved = state.editingProduct.quantityReserved;

                const removeQty = parseInt(document.getElementById('remove-qty')?.value) || 0;
                const removeReason = document.getElementById('remove-reason')?.value;
                const removeNote = document.getElementById('remove-note')?.value.trim() || '';

                if (removeQty > 0) {
                    // Валидация преди изпращане
                    if (!removeReason) {
                        window.toastManager?.error('Моля избери причина за премахване');
                        document.getElementById('remove-reason')?.focus();
                        return;
                    }

                    if (removeQty > state.editingProduct.quantityAvailable) {
                        window.toastManager?.error(`Не можеш да премахнеш повече от ${state.editingProduct.quantityAvailable} ${state.editingProduct.unit}`);
                        document.getElementById('remove-qty')?.focus();
                        return;
                    }

                    // Обновяваме продукта
                    await window.api.updateProduct(productData.id, productData);

                    // Правим adjustment
                    const adjustmentData = {
                        productId: productData.id,
                        adjustmentType: 'REMOVE',
                        quantity: removeQty,
                        reason: removeReason,
                        note: removeNote
                    };

                    await window.api.createAdjustment(adjustmentData);

                    window.toastManager?.success(`Артикулът е обновен и ${removeQty} ${state.editingProduct.unit} са премахнати`);

                } else {
                    // Само обновяваме без adjustment
                    await window.api.updateProduct(productData.id, productData);
                    window.toastManager?.success('Артикулът е обновен успешно');
                }

            } else {
                // РЕЖИМ СЪЗДАВАНЕ
                productData.quantityAvailable = parseInt(this.inputs.quantity.value) || 0;
                productData.quantityReserved = 0;

                await window.api.createProduct(productData);
                window.toastManager?.success('Новият артикул е създаден успешно');
            }

            this.close();
            await window.productTable?.loadProducts();
            await window.statsManager?.loadStats();

        } catch (error) {
            console.error('Error saving product:', error);
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

            if (response.success && response.stats) {
                const stats = response.stats;

                // Използваме ТОЧНИТЕ имена от ProductStatsDTO
                this.updateStats({
                    totalProducts: stats.totalProducts || 0,
                    lowStockCount: stats.lowStockCount || 0,
                    totalInventoryValue: stats.totalInventoryValue || 0,
                    categoriesCount: stats.categoriesCount || 0
                });
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }

    // ДОБАВИ ТОЗИ МЕТОД ЗА WebSocket compatibility
    update(stats) {
        // WebSocket извиква този метод директно
        this.updateStats({
            totalProducts: stats.totalProducts || 0,
            lowStockCount: stats.lowStockCount || 0,
            totalInventoryValue: stats.totalInventoryValue || 0,
            categoriesCount: stats.categoriesCount || 0
        });
    }

    updateStats(data) {
        // Актуализираме с правилните данни
        if (this.elements.total) {
            this.elements.total.textContent = data.totalProducts.toString() || 0;
        }

        if (this.elements.lowStock) {
            this.elements.lowStock.textContent = data.lowStockCount.toString() || 0;
        }

        if (this.elements.value) {
            this.elements.value.textContent = this.formatValue(data.totalInventoryValue);
        }

        if (this.elements.categories) {
            this.elements.categories.textContent = data.categoriesCount.toString() || 0;
        }
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
            if (this.categorySelect) {
                this.categorySelect.innerHTML = '<option value="">Всички категории</option>';
                state.categories.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat;
                    option.textContent = cat;
                    this.categorySelect.appendChild(option);
                });
            }

            // Populate datalist for modal (ако съществува)
            const datalist = document.getElementById('categories-datalist');
            if (datalist) {
                datalist.innerHTML = '';
                state.categories.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat;
                    datalist.appendChild(option);
                });
            }
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
    const importSection = document.getElementById('import-section');
    const productsSection = document.getElementById('products-section');
    const historySection = document.getElementById('history-section');

    subTabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            subTabButtons.forEach(b => b.classList.remove('active'));
            // Add active to clicked
            btn.classList.add('active');

            const tab = btn.dataset.subTab;

            if (tab === 'import') {
                // Show import, hide others
                importSection.style.display = 'block';
                productsSection.style.display = 'none';
                historySection.style.display = 'none';
            } else if (tab === 'products') {
                // Show products, hide others
                importSection.style.display = 'none';
                productsSection.style.display = 'block';
                historySection.style.display = 'none';
            } else if (tab === 'history') {
                // Show history, hide others
                importSection.style.display = 'none';
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
    // Graph all button
    const graphAllBtn = document.getElementById('btn-graph-all');
    if (graphAllBtn) {
        graphAllBtn.addEventListener('click', () => {
            window.GraphModal.open(null);
        });
    }

    // Create button - DEFENSIVE CHECK
    const createBtn = document.getElementById('btn-create-product');
    if (createBtn) {
        createBtn.addEventListener('click', () => {
            window.productModal?.openCreate();
        });
    }

    // Refresh button - DEFENSIVE CHECK
    const refreshBtn = document.getElementById('btn-refresh');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            window.productTable?.loadProducts();
            window.statsManager?.loadStats();
            window.toastManager?.info('Данните са обновени');
        });
    }

    // Refresh history button - ВЕЧЕ ИМА DEFENSIVE CHECK
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
        this.importEvents = [];
        this.mixedHistory = [];
    }

    async loadHistory() {
        this.showLoading();

        try {
            const response = await window.api.getHistory(); // ПРОМЕНЕН МЕТОД

            this.adjustments = response.adjustments || [];
            this.importEvents = response.importEvents || []; // НОВО

            // Смесваме двата типа записи и ги сортираме по дата
            this.mixedHistory = this.createMixedHistory();

            this.render();
        } catch (error) {
            console.error('Failed to load history:', error);
            window.toastManager?.error('Грешка при зареждане на историята');
        } finally {
            this.hideLoading();
        }
    }

    // НОВ МЕТОД ЗА СМЕСВАНЕ НА ИСТОРИЯТА:
    createMixedHistory() {
        const mixed = [];

        // Добавяме adjustments с тип 'adjustment'
        this.adjustments.forEach(adj => {
            mixed.push({
                type: 'adjustment',
                data: adj,
                timestamp: new Date(adj.performedAt)
            });
        });

        // Добавяме import events с тип 'import'
        this.importEvents.forEach(imp => {
            mixed.push({
                type: 'import',
                data: imp,
                timestamp: new Date(imp.completedAt || imp.uploadedAt)
            });
        });

        // Сортираме по дата (най-нови първи)
        mixed.sort((a, b) => b.timestamp - a.timestamp);

        return mixed;
    }


    render() {
        if (!this.tbody) return;

        if (this.mixedHistory.length === 0) {
            this.tbody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="9">
                        <div class="empty-state-content">
                            <i class="bi bi-clock-history"></i>
                            <p>Няма записи в историята</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // Рендерираме смесената история
        const rows = this.mixedHistory.map(entry => {
            if (entry.type === 'adjustment') {
                return this.renderAdjustmentRow(entry.data);
            } else if (entry.type === 'import') {
                return this.renderImportEventRow(entry.data);
            }
        }).join('');

        this.tbody.innerHTML = rows;
    }

    renderAdjustmentRow(adj) {
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


    // МЕТОД ЗА РЕНДЕРИРАНЕ НА IMPORT EVENT РЕДОВЕ:
    renderImportEventRow(importEvent) {
        const formattedDate = this.formatDate(importEvent.completedAt || importEvent.uploadedAt);
        const fileName = this.escapeHtml(importEvent.fileName);
        const supplierInfo = importEvent.supplierName ?
            `<div class="supplier-info">Доставчик: ${this.escapeHtml(importEvent.supplierName)}</div>` : '';

        return `
            <tr class="import-event-row" data-import-id="${importEvent.id}">
                <td class="date-cell">${formattedDate}</td>
                <td class="import-file-cell" colspan="2">
                    <div class="import-event-info">
                        <div class="import-header">
                            <i class="bi bi-cloud-upload import-icon"></i>
                            <strong class="import-title">Импорт на стока</strong>
                            <span class="file-name">${fileName}</span>
                        </div>
                        ${supplierInfo}
                        <div class="import-stats">
                            <span class="stat-item">
                                <i class="bi bi-plus-circle"></i>
                                ${importEvent.newItems || 0} нови
                            </span>
                            <span class="stat-item">
                                <i class="bi bi-arrow-up-circle"></i>
                                ${importEvent.updatedItems || 0} обновени
                            </span>
                            <span class="stat-item">
                                <i class="bi bi-box"></i>
                                ${importEvent.totalItems || 0} общо
                            </span>
                        </div>
                    </div>
                </td>
                <td class="import-value-cell" colspan="3">
                    <div class="import-financial-info">
                        <div class="total-value">
                            Стойност: ${this.formatCurrency(importEvent.totalPurchaseValue)}
                        </div>
                        ${importEvent.invoiceNumber ?
            `<div class="invoice-info">Фактура: ${this.escapeHtml(importEvent.invoiceNumber)}</div>` : ''
        }
                    </div>
                </td>
                <td class="import-actions-cell" colspan="2">
                    <button class="btn-view-import" onclick="openImportDetails(${importEvent.id})" 
                            title="Виж детайли на импорта">
                        <i class="bi bi-eye"></i> Детайли
                    </button>
                </td>
            </tr>
        `;
    }

    //HELPER МЕТОДИ:
    formatCurrency(amount) {
        if (!amount) return '0.00 лв';
        return new Intl.NumberFormat('bg-BG', {
            style: 'currency',
            currency: 'BGN',
            minimumFractionDigits: 2
        }).format(amount);
    }

    getAdjustmentTypeText(type) {
        const types = {
            'ADD': 'Добавяне',
            'REMOVE': 'Премахване',
            'INITIAL': 'Начално'
        };
        return types[type] || type;
    }

    getTypeBadge(type) {
        const types = {
            'REMOVE': '<span class="type-badge remove"><i class="bi bi-dash-circle"></i> Премахване</span>',
            'INITIAL': '<span class="type-badge initial"><i class="bi bi-plus-circle-fill"></i> Начално</span>'
        };
        return types[type] || `<span class="type-badge">${type}</span>`;
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
            'MISSING': 'Липса/загуба',
            'DAMAGED': 'Повреда',
            'EXPIRED': 'Изтичане на срок',
            'INITIAL': 'Начално количество'
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

window.openImportDetails = function(importEventId) {
    const url = `/admin/detail-import-stock?id=${importEventId}`;
    window.open(url, '_blank');
};