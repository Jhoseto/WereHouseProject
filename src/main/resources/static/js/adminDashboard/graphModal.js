/**
 * GRAPH MODAL JAVASCRIPT - ПЪЛНА ВЕРСИЯ
 * ======================================
 */

// ==========================================
// GLOBAL STATE AND CONFIGURATION
// ==========================================

const GraphModalState = {
    isOpen: false,
    currentData: null,
    currentProductIds: [],
    currentTimeRange: '30d',
    activeTab: 'price-analysis',
    charts: new Map(),
    metadata: null,
    includeCategories: true,
    includeSuppliers: true
};

const CHART_THEME = {
    colors: {
        primary: '#3d4a5c',
        accent: '#7dd3c0',
        success: '#27ae60',
        warning: '#f39c12',
        danger: '#e74c3c',
        info: '#3498db',
        purple: '#9f7aea',
        teal: '#38b2ac'
    },
    gradients: {
        primary: ['#3d4a5c', '#2d3a4c'],
        accent: ['#7dd3c0', '#6bc4b0'],
        success: ['#27ae60', '#1e8449'],
        warning: ['#f39c12', '#d68910']
    },
    fonts: {
        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        size: {
            small: 11,
            normal: 12,
            large: 14
        }
    }
};

// ==========================================
// API COMMUNICATION CLASS
// ==========================================

class GraphModalAPI {
    constructor() {
        this.baseURL = '/admin/graph-modal';
        this.headers = {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        };
    }

    async loadMetadata() {
        try {
            const response = await fetch(`${this.baseURL}/metadata`, {
                method: 'GET',
                headers: this.headers
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Грешка при зареждане на метаданни');
            }

            return data.metadata;
        } catch (error) {
            console.error('API Error - loadMetadata:', error);
            throw error;
        }
    }

    async loadAnalyticsData(productIds, timeRange, includeCategories, includeSuppliers) {
        try {
            const params = new URLSearchParams();
            if (productIds && productIds.length > 0) {
                params.append('productIds', productIds.join(','));
            }
            params.append('timeRange', timeRange);
            params.append('includeCategories', includeCategories);
            params.append('includeSuppliers', includeSuppliers);

            const response = await fetch(`${this.baseURL}/analytics?${params}`, {
                method: 'GET',
                headers: this.headers
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Грешка при зареждане на данни');
            }

            if (!data.data) {
                throw new Error('Липсват данни в отговора');
            }

            return data.data;
        } catch (error) {
            console.error('API Error - loadAnalyticsData:', error);
            throw error;
        }
    }
}

// ==========================================
// MODAL MANAGEMENT CLASS
// ==========================================

class GraphModalManager {
    constructor() {
        this.modal = document.getElementById('graph-modal');
        this.api = new GraphModalAPI();
        this.chartRenderer = new ChartRenderer();
        this.selectedProductIds = new Set();
        this.init();
    }

    init() {
        this.setupEventHandlers();
        this.loadInitialMetadata().catch(err => {
            console.warn('Could not load metadata on init:', err);
            GraphModalState.metadata = {
                products: [],
                categories: [],
                suppliers: []
            };
        });
    }

    async loadInitialMetadata() {
        try {
            GraphModalState.metadata = await this.api.loadMetadata();
            this.populateProductSelector();
        } catch (error) {
            console.warn('Metadata not available:', error);
            GraphModalState.metadata = {
                products: [],
                categories: [],
                suppliers: []
            };
        }
    }

    setupEventHandlers() {
        document.getElementById('graph-modal-close')?.addEventListener('click', () => this.close());
        this.modal?.addEventListener('click', (e) => {
            if (e.target.classList.contains('gm-modal-overlay')) {
                this.close();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && GraphModalState.isOpen) {
                this.close();
            }
        });

        document.querySelectorAll('.gm-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabId = e.currentTarget.dataset.tab;
                this.switchTab(tabId);
            });
        });

        // Configuration controls
        document.getElementById('load-analytics')?.addEventListener('click', () => this.loadAnalytics());
        document.getElementById('export-charts')?.addEventListener('click', () => this.exportCharts());
        document.getElementById('select-all-products')?.addEventListener('click', () => this.selectAllProducts());
        document.getElementById('clear-product-selection')?.addEventListener('click', () => this.clearProductSelection());

        this.setupChartControls();

        document.getElementById('configure-analysis')?.addEventListener('click', () => {
            document.querySelector('.gm-config-panel')?.scrollIntoView({ behavior: 'smooth' });
        });
    }

    setupChartControls() {
        document.getElementById('show-purchase-prices')?.addEventListener('change', (e) => {
            this.toggleChartDataset('price-history-chart', 'Закупни', e.target.checked);
        });
        document.getElementById('show-selling-prices')?.addEventListener('change', (e) => {
            this.toggleChartDataset('price-history-chart', 'Продажни', e.target.checked);
        });
        document.getElementById('show-margin-trend')?.addEventListener('change', (e) => {
            this.toggleChartDataset('price-history-chart', 'Марж', e.target.checked);
        });

        document.getElementById('show-imports')?.addEventListener('change', (e) => {
            this.toggleChartDataset('quantity-movements-chart', 'Импорти', e.target.checked);
        });
        document.getElementById('show-adjustments')?.addEventListener('change', (e) => {
            this.toggleChartDataset('quantity-movements-chart', 'Корекции', e.target.checked);
        });
        document.getElementById('show-sales')?.addEventListener('change', (e) => {
            this.toggleChartDataset('quantity-movements-chart', 'Продажби', e.target.checked);
        });
    }

    async open(productIds = null) {
        console.log('Opening graph modal with products:', productIds);

        if (!GraphModalState.metadata) {
            await this.loadInitialMetadata();
        }

        if (productIds) {
            this.preselectProducts(Array.isArray(productIds) ? productIds : [productIds]);
        }

        GraphModalState.isOpen = true;
        this.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            this.modal.classList.add('active');
        }, 10);

        if (productIds) {
            setTimeout(() => this.loadAnalytics(), 500);
        }
    }

    close() {
        if (!GraphModalState.isOpen) return;

        console.log('Closing graph modal');

        this.modal.classList.remove('active');

        setTimeout(() => {
            GraphModalState.isOpen = false;
            this.modal.style.display = 'none';
            document.body.style.overflow = '';
            this.chartRenderer.destroyAllCharts();
        }, 300);
    }

    switchTab(tabId) {
        if (GraphModalState.activeTab === tabId) return;

        if (tabId === 'category-analysis' && !GraphModalState.currentData?.categoryAnalysis) {
            window.toastManager?.warning('Няма данни за категорийни анализи');
            return;
        }
        if (tabId === 'supplier-analysis' && !GraphModalState.currentData?.supplierAnalysis) {
            window.toastManager?.warning('Няма данни за доставчик анализи');
            return;
        }
        if (tabId === 'performance-analysis' && !GraphModalState.currentData?.salesData) {
            window.toastManager?.warning('Няма данни за производителност');
            return;
        }

        document.querySelectorAll('.gm-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
            tab.setAttribute('aria-selected', tab.dataset.tab === tabId);
        });

        document.querySelectorAll('.gm-tab-panel').forEach(content => {
            content.classList.toggle('active', content.id === `${tabId}-content`);
        });

        GraphModalState.activeTab = tabId;

        if (GraphModalState.currentData) {
            this.chartRenderer.renderTabCharts(tabId, GraphModalState.currentData);
        }
    }

    async loadAnalytics() {
        try {
            this.showLoading();

            const config = this.gatherConfiguration();

            const analyticsData = await this.api.loadAnalyticsData(
                config.productIds,
                config.timeRange,
                config.includeCategories,
                config.includeSuppliers
            );

            if (!analyticsData.products || analyticsData.products.length === 0) {
                throw new Error(analyticsData.message || 'Няма данни за анализ');
            }

            GraphModalState.currentData = analyticsData;
            this.chartRenderer.renderAllCharts(analyticsData);
            this.updateSubtitle(analyticsData);
            this.hideLoading();

            document.getElementById('export-charts').disabled = false;

            window.toastManager?.success('Графичният анализ е зареден успешно');

        } catch (error) {
            console.error('Failed to load analytics:', error);
            this.hideLoading();
            this.showError(error.message);
            window.toastManager?.error('Грешка при зареждане: ' + error.message);
        }
    }

    gatherConfiguration() {
        const timeRangeSelector = document.getElementById('time-range-selector');
        const includeCategories = document.getElementById('include-categories')?.checked || false;
        const includeSuppliers = document.getElementById('include-suppliers')?.checked || false;

        let productIds = Array.from(this.selectedProductIds || []);

        return {
            productIds: productIds.filter(id => !isNaN(id)),
            timeRange: timeRangeSelector ? timeRangeSelector.value : '30d',
            includeCategories,
            includeSuppliers
        };
    }

    populateProductSelector() {
        const searchInput = document.getElementById('product-search');
        const productList = document.getElementById('product-list');
        const dropdown = document.getElementById('product-dropdown');
        const selectedDisplay = document.getElementById('selected-products-display');
        const clearBtn = document.getElementById('clear-search');

        if (!GraphModalState.metadata?.products || !productList) {
            console.warn('No products or product list element');
            return;
        }

        const products = GraphModalState.metadata.products;

        const renderProductList = (filteredProducts) => {
            const displayProducts = filteredProducts.slice();

            productList.innerHTML = displayProducts.map(product => `
                <label class="gm-product-item">
                    <input 
                        type="checkbox" 
                        value="${product.id}" 
                        data-sku="${product.sku || ''}"
                        data-name="${product.name || ''}"
                    >
                    <span class="gm-product-info">
                        <strong>${product.sku || ''}</strong> - ${product.name || ''}
                        <small>${product.category || 'Без категория'}</small>
                    </span>
                </label>
            `).join('');

            if (filteredProducts.length > 100) {
                productList.innerHTML += `<div class="gm-product-item-note">Показани ${displayProducts.length} от ${filteredProducts.length}. Използвай търсенето.</div>`;
            }

            productList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', () => this.updateSelectedDisplay());
                if (this.selectedProductIds.has(parseInt(checkbox.value))) {
                    checkbox.checked = true;
                }
            });
        };

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                if (clearBtn) clearBtn.style.display = query ? 'block' : 'none';

                const filtered = products.filter(p =>
                    (p.sku && p.sku.toLowerCase().includes(query)) ||
                    (p.name && p.name.toLowerCase().includes(query)) ||
                    (p.category && p.category.toLowerCase().includes(query))
                );

                renderProductList(filtered);
            });

            searchInput.addEventListener('focus', () => {
                if (dropdown) dropdown.style.display = 'block';
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                    clearBtn.style.display = 'none';
                    renderProductList(products);
                }
            });
        }

        document.addEventListener('click', (e) => {
            if (dropdown && !e.target.closest('.gm-product-selector-wrapper')) {
                dropdown.style.display = 'none';
            }
        });

        renderProductList(products);
    }

    updateSelectedDisplay() {
        const productList = document.getElementById('product-list');
        const selectedDisplay = document.getElementById('selected-products-display');

        if (!productList || !selectedDisplay) return;

        const checked = productList.querySelectorAll('input[type="checkbox"]:checked');
        this.selectedProductIds = new Set(Array.from(checked).map(cb => parseInt(cb.value)));

        if (this.selectedProductIds.size === 0) {
            selectedDisplay.innerHTML = '<span class="gm-no-selection">Няма избрани продукти (всички)</span>';
        } else if (this.selectedProductIds.size <= 5) {
            selectedDisplay.innerHTML = Array.from(checked).map(cb =>
                `<span class="gm-selected-tag">${cb.dataset.sku} <i class="bi bi-x" data-id="${cb.value}"></i></span>`
            ).join('');

            selectedDisplay.querySelectorAll('.bi-x').forEach(icon => {
                icon.addEventListener('click', () => {
                    const id = parseInt(icon.dataset.id);
                    this.selectedProductIds.delete(id);
                    const checkbox = productList.querySelector(`input[value="${id}"]`);
                    if (checkbox) checkbox.checked = false;
                    this.updateSelectedDisplay();
                });
            });
        } else {
            selectedDisplay.innerHTML = `<span class="gm-selection-count"><i class="bi bi-check-circle"></i> ${this.selectedProductIds.size} избрани продукта</span>`;
        }
    }

    preselectProducts(productIds) {
        const productList = document.getElementById('product-list');
        if (!productList) return;

        productIds.forEach(id => this.selectedProductIds.add(id));

        productList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            if (productIds.includes(parseInt(checkbox.value))) {
                checkbox.checked = true;
            }
        });

        this.updateSelectedDisplay();
    }

    selectAllProducts() {
        const productList = document.getElementById('product-list');
        if (!productList) return;

        productList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = true;
            this.selectedProductIds.add(parseInt(checkbox.value));
        });

        this.updateSelectedDisplay();
    }

    clearProductSelection() {
        const productList = document.getElementById('product-list');
        if (!productList) return;

        productList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });

        this.selectedProductIds.clear();
        this.updateSelectedDisplay();
    }

    toggleChartDataset(chartId, datasetLabel, visible) {
        this.chartRenderer.toggleDataset(chartId, datasetLabel, visible);
    }

    exportCharts() {
        if (!GraphModalState.currentData) {
            window.toastManager?.warning('Няма данни за експорт');
            return;
        }

        try {
            this.chartRenderer.exportAllCharts();
            window.toastManager?.success('Графиките са експортирани успешно');
        } catch (error) {
            console.error('Export failed:', error);
            window.toastManager?.error('Грешка при експорт');
        }
    }

    updateSubtitle(data) {
        const subtitle = document.getElementById('graph-subtitle');
        if (!subtitle || !data.products) return;

        const productCount = data.products.length;
        const dateRange = data.dateRange?.range || GraphModalState.currentTimeRange;

        subtitle.textContent = `Анализ на ${productCount} продукта за ${this.getTimeRangeLabel(dateRange)}`;
    }

    getTimeRangeLabel(range) {
        const labels = {
            '7d': 'последните 7 дни',
            '30d': 'последните 30 дни',
            '90d': 'последните 3 месеца',
            '1y': 'последната година',
            'all': 'целия период'
        };
        return labels[range] || range;
    }

    showLoading() {
        const loading = document.getElementById('graph-loading');
        const content = document.querySelector('.gm-chart-content-container');
        const empty = document.getElementById('graph-empty');

        if (loading) loading.style.display = 'flex';
        if (content) content.style.display = 'none';
        if (empty) empty.style.display = 'none';
    }

    hideLoading() {
        const loading = document.getElementById('graph-loading');
        const content = document.querySelector('.gm-chart-content-container');

        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'block';
    }

    showError(message) {
        const emptyState = document.getElementById('graph-empty');
        const content = document.querySelector('.gm-chart-content-container');
        const loading = document.getElementById('graph-loading');

        if (emptyState) {
            emptyState.style.display = 'flex';
            const h3 = emptyState.querySelector('h3');
            const p = emptyState.querySelector('p');
            if (h3) h3.textContent = 'Грешка при зареждане';
            if (p) p.textContent = message || 'Няма данни за анализ';
        }
        if (content) content.style.display = 'none';
        if (loading) loading.style.display = 'none';
    }
}

// ==========================================
// CHART RENDERING CLASS
// ==========================================

class ChartRenderer {
    constructor() {
        this.charts = new Map();
        this.setupChartDefaults();
    }

    setupChartDefaults() {
        if (typeof Chart !== 'undefined') {
            Chart.defaults.font.family = CHART_THEME.fonts.family;
            Chart.defaults.font.size = CHART_THEME.fonts.size.normal;
            Chart.defaults.color = '#4a5568';
            Chart.defaults.backgroundColor = 'rgba(255, 255, 255, 0.8)';
            Chart.defaults.borderColor = '#e2e8f0';
        }
    }

    renderAllCharts(data) {
        console.log('Rendering all charts with data:', data);

        if (!data || !data.products) {
            console.warn('No valid data for rendering charts');
            return;
        }

        this.destroyAllCharts();
        this.renderTabCharts(GraphModalState.activeTab, data);
    }

    renderTabCharts(tabId, data) {
        switch (tabId) {
            case 'price-analysis':
                this.renderPriceCharts(data);
                break;
            case 'quantity-analysis':
                this.renderQuantityCharts(data);
                break;
            case 'performance-analysis':
                this.renderPerformanceCharts(data);
                break;
            case 'category-analysis':
                this.renderCategoryCharts(data);
                break;
            case 'supplier-analysis':
                this.renderSupplierCharts(data);
                break;
        }
    }

    renderPriceCharts(data) {
        this.renderPriceHistoryChart(data.priceHistory);
        this.renderPriceChangesChart(data.priceHistory);
    }

    renderPriceHistoryChart(priceHistory) {
        const ctx = document.getElementById('price-history-chart');
        if (!ctx || !priceHistory) return;

        const datasets = [];
        const colors = Object.values(CHART_THEME.colors);
        let colorIndex = 0;

        Object.entries(priceHistory).forEach(([productId, productData]) => {
            const product = this.findProductById(productId);
            const productName = product ? `${product.sku} - ${product.name}` : `Product ${productId}`;
            const color = colors[colorIndex % colors.length];

            if (productData.purchasePrices && productData.purchasePrices.length > 0) {
                datasets.push({
                    label: `${productName} (Закупни)`,
                    data: productData.purchasePrices.map(point => ({
                        x: point.date,
                        y: point.price
                    })),
                    borderColor: color,
                    backgroundColor: this.addAlpha(color, 0.1),
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                });
            }

            if (productData.sellingPrices && productData.sellingPrices.length > 0) {
                datasets.push({
                    label: `${productName} (Продажни)`,
                    data: productData.sellingPrices.map(point => ({
                        x: point.date,
                        y: point.newPrice
                    })),
                    borderColor: this.darkenColor(color, 0.3),
                    backgroundColor: this.addAlpha(color, 0.1),
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                });
            }

            if (productData.marginHistory && productData.marginHistory.length > 0) {
                datasets.push({
                    label: `${productName} (Марж)`,
                    data: productData.marginHistory.map(point => ({
                        x: point.date,
                        y: point.margin
                    })),
                    borderColor: CHART_THEME.colors.purple,
                    backgroundColor: this.addAlpha(CHART_THEME.colors.purple, 0.1),
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                });
            }

            colorIndex++;
        });

        const chart = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Динамика на цените',
                        font: { size: CHART_THEME.fonts.size.large }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        cornerRadius: 8,
                        displayColors: true
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day'
                        },
                        title: {
                            display: true,
                            text: 'Дата'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Цена (лв.)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(2) + ' лв.';
                            }
                        }
                    }
                }
            }
        });

        this.charts.set('price-history-chart', chart);
    }

    renderPriceChangesChart(priceHistory) {
        const ctx = document.getElementById('price-changes-chart');
        if (!ctx || !priceHistory) return;

        const changes = [];
        Object.entries(priceHistory).forEach(([productId, productData]) => {
            if (productData.sellingPrices) {
                productData.sellingPrices.forEach(change => {
                    if (change.changePercent) {
                        const product = this.findProductById(productId);
                        changes.push({
                            product: product ? product.name : `Product ${productId}`,
                            date: change.date,
                            changePercent: parseFloat(change.changePercent)
                        });
                    }
                });
            }
        });

        changes.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: changes.slice(0, 10).map(c => c.product),
                datasets: [{
                    label: 'Ценова промяна (%)',
                    data: changes.slice(0, 10).map(c => c.changePercent),
                    backgroundColor: changes.slice(0, 10).map(c =>
                        c.changePercent > 0 ? CHART_THEME.colors.success : CHART_THEME.colors.danger
                    ),
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Най-големи ценови промени',
                        font: { size: CHART_THEME.fonts.size.large }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Промяна (%)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(1) + '%';
                            }
                        }
                    }
                }
            }
        });

        this.charts.set('price-changes-chart', chart);
    }

    renderQuantityCharts(data) {
        this.renderQuantityMovementsChart(data.quantityMovements);
        this.renderCurrentStockChart(data.products);
    }

    renderQuantityMovementsChart(movementsData) {
        const ctx = document.getElementById('quantity-movements-chart');
        if (!ctx || !movementsData) return;

        const allMovements = [];
        Object.entries(movementsData).forEach(([productId, movements]) => {
            const product = this.findProductById(productId);
            movements.forEach(movement => {
                allMovements.push({
                    ...movement,
                    productId,
                    productName: product ? product.name : `Product ${productId}`
                });
            });
        });

        const groupedData = this.groupMovementsByDateAndType(allMovements);

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(groupedData).sort(),
                datasets: [
                    {
                        label: 'Импорти',
                        data: Object.keys(groupedData).sort().map(date => groupedData[date].import || 0),
                        backgroundColor: CHART_THEME.colors.success,
                        borderRadius: 4
                    },
                    {
                        label: 'Корекции',
                        data: Object.keys(groupedData).sort().map(date => groupedData[date].adjustment || 0),
                        backgroundColor: CHART_THEME.colors.warning,
                        borderRadius: 4
                    },
                    {
                        label: 'Продажби',
                        data: Object.keys(groupedData).sort().map(date => groupedData[date].sales || 0),
                        backgroundColor: CHART_THEME.colors.danger,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Движения в наличностите',
                        font: { size: CHART_THEME.fonts.size.large }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Дата' }
                    },
                    y: {
                        title: { display: true, text: 'Количество' },
                        ticks: {
                            callback: function(value) {
                                return value + ' бр.';
                            }
                        }
                    }
                }
            }
        });

        this.charts.set('quantity-movements-chart', chart);
    }

    renderCurrentStockChart(products) {
        const ctx = document.getElementById('current-stock-chart');
        if (!ctx || !products) return;

        const sortedProducts = [...products].sort((a, b) => b.quantityAvailable - a.quantityAvailable);
        const topProducts = sortedProducts.slice(0, 15);

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: topProducts.map(p => p.name),
                datasets: [{
                    data: topProducts.map(p => p.quantityAvailable),
                    backgroundColor: this.generateColorPalette(topProducts.length),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Разпределение на текущите наличности',
                        font: { size: CHART_THEME.fonts.size.large }
                    },
                    legend: {
                        position: 'right'
                    }
                }
            }
        });

        this.charts.set('current-stock-chart', chart);
    }

    renderPerformanceCharts(data) {
        if (!data.salesData) return;

        this.renderSalesTrendsChart(data.salesData);
        this.renderTopPerformersChart(data.salesData, data.products);
    }

    renderSalesTrendsChart(salesData) {
        const ctx = document.getElementById('sales-trends-chart');
        if (!ctx) return;

        const allSales = [];
        Object.entries(salesData).forEach(([productId, sales]) => {
            sales.forEach(sale => allSales.push({ ...sale, productId }));
        });

        const grouped = {};
        allSales.forEach(sale => {
            if (!grouped[sale.date]) {
                grouped[sale.date] = 0;
            }
            grouped[sale.date] += sale.quantity;
        });

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Object.keys(grouped).sort(),
                datasets: [{
                    label: 'Продажби (бр.)',
                    data: Object.keys(grouped).sort().map(date => grouped[date]),
                    borderColor: CHART_THEME.colors.success,
                    backgroundColor: this.addAlpha(CHART_THEME.colors.success, 0.1),
                    fill: false,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Трендове в продажбите',
                        font: { size: CHART_THEME.fonts.size.large }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Дата' }
                    },
                    y: {
                        title: { display: true, text: 'Количество' }
                    }
                }
            }
        });

        this.charts.set('sales-trends-chart', chart);
    }

    renderTopPerformersChart(salesData, products) {
        const ctx = document.getElementById('top-performers-chart');
        if (!ctx) return;

        const productSales = {};
        Object.entries(salesData).forEach(([productId, sales]) => {
            const total = sales.reduce((sum, sale) => sum + (sale.quantity * (sale.price || 0)), 0);
            productSales[productId] = total;
        });

        const sorted = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 10);

        const labels = sorted.map(([id]) => {
            const product = products.find(p => p.id == id);
            return product ? product.name : `Product ${id}`;
        });

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Печалба (лв.)',
                    data: sorted.map(([, total]) => total),
                    backgroundColor: CHART_THEME.colors.primary,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Топ продукти по печалба',
                        font: { size: CHART_THEME.fonts.size.large }
                    }
                },
                scales: {
                    y: {
                        title: { display: true, text: 'Печалба (лв.)' }
                    }
                }
            }
        });

        this.charts.set('top-performers-chart', chart);
    }

    renderCategoryCharts(data) {
        if (data.categoryAnalysis) {
            this.renderCategoryDistribution(data.categoryAnalysis);
            this.renderCategoryPerformance(data.categoryAnalysis);
        }
    }

    renderCategoryDistribution(categoryData) {
        const ctx = document.getElementById('category-distribution-chart');
        if (!ctx || !categoryData) return;

        const categories = Object.keys(categoryData);
        const values = categories.map(cat => categoryData[cat].totalValue);

        const chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: categories,
                datasets: [{
                    data: values,
                    backgroundColor: this.generateColorPalette(categories.length),
                    borderWidth: 3,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Стойностно разпределение по категории',
                        font: { size: CHART_THEME.fonts.size.large }
                    }
                }
            }
        });

        this.charts.set('category-distribution-chart', chart);
    }

    renderCategoryPerformance(categoryData) {
        const ctx = document.getElementById('category-performance-chart');
        if (!ctx || !categoryData) return;

        const categories = Object.keys(categoryData);

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: categories,
                datasets: [
                    {
                        label: 'Брой продукти',
                        data: categories.map(cat => categoryData[cat].productCount),
                        backgroundColor: CHART_THEME.colors.primary,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Средна цена (лв.)',
                        data: categories.map(cat => categoryData[cat].averagePrice),
                        backgroundColor: CHART_THEME.colors.secondary,
                        type: 'line',
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Категорийна производителност',
                        font: { size: CHART_THEME.fonts.size.large }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Брой продукти' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { display: true, text: 'Средна цена (лв.)' },
                        grid: { drawOnChartArea: false }
                    }
                }
            }
        });

        this.charts.set('category-performance-chart', chart);
    }

    renderSupplierCharts(data) {
        if (data.supplierAnalysis) {
            this.renderSupplierVolume(data.supplierAnalysis);
            this.renderSupplierStability(data.supplierAnalysis);
        }
    }

    renderSupplierVolume(supplierData) {
        const ctx = document.getElementById('supplier-volume-chart');
        if (!ctx || !supplierData) return;

        const suppliers = Object.keys(supplierData);
        const volumes = suppliers.map(supplier => supplierData[supplier].totalPurchases);

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: suppliers,
                datasets: [{
                    label: 'Общо покупки',
                    data: volumes,
                    backgroundColor: CHART_THEME.colors.accent,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Обем покупки по доставчици',
                        font: { size: CHART_THEME.fonts.size.large }
                    }
                }
            }
        });

        this.charts.set('supplier-volume-chart', chart);
    }

    renderSupplierStability(supplierData) {
        const ctx = document.getElementById('supplier-stability-chart');
        if (!ctx || !supplierData) return;

        const suppliers = Object.keys(supplierData);
        const stability = suppliers.map(supplier => supplierData[supplier].priceStability * 100);

        const chart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: suppliers,
                datasets: [{
                    label: 'Ценова стабилност (%)',
                    data: stability,
                    backgroundColor: this.addAlpha(CHART_THEME.colors.info, 0.2),
                    borderColor: CHART_THEME.colors.info,
                    pointBackgroundColor: CHART_THEME.colors.info,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Ценова стабилност по доставчици',
                        font: { size: CHART_THEME.fonts.size.large }
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });

        this.charts.set('supplier-stability-chart', chart);
    }

    findProductById(productId) {
        return GraphModalState.currentData?.products?.find(p => p.id == productId);
    }

    groupMovementsByDateAndType(movements) {
        const grouped = {};

        movements.forEach(movement => {
            const date = movement.date;
            if (!grouped[date]) {
                grouped[date] = {};
            }

            const type = movement.type;
            if (!grouped[date][type]) {
                grouped[date][type] = 0;
            }

            grouped[date][type] += Math.abs(movement.change);
        });

        return grouped;
    }

    generateColorPalette(count) {
        const baseColors = Object.values(CHART_THEME.colors);
        const colors = [];

        for (let i = 0; i < count; i++) {
            const baseColor = baseColors[i % baseColors.length];
            const variation = Math.floor(i / baseColors.length) * 0.2;
            colors.push(this.adjustColorBrightness(baseColor, variation));
        }

        return colors;
    }

    addAlpha(color, alpha) {
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        return color;
    }

    darkenColor(color, amount) {
        if (color.startsWith('#')) {
            const r = Math.max(0, parseInt(color.slice(1, 3), 16) - Math.floor(255 * amount));
            const g = Math.max(0, parseInt(color.slice(3, 5), 16) - Math.floor(255 * amount));
            const b = Math.max(0, parseInt(color.slice(5, 7), 16) - Math.floor(255 * amount));
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        }
        return color;
    }

    adjustColorBrightness(color, variation) {
        return this.darkenColor(color, variation);
    }

    toggleDataset(chartId, datasetLabel, visible) {
        const chart = this.charts.get(chartId);
        if (!chart) return;

        const datasets = chart.data.datasets;
        const dataset = datasets.find(ds => ds.label.toLowerCase().includes(datasetLabel.toLowerCase()));

        if (dataset) {
            const metaDataset = chart.getDatasetMeta(datasets.indexOf(dataset));
            metaDataset.hidden = !visible;
            chart.update();
        }
    }

    exportAllCharts() {
        const exportData = [];

        this.charts.forEach((chart, chartId) => {
            try {
                const imageData = chart.toBase64Image();
                exportData.push({
                    name: chartId,
                    image: imageData
                });
            } catch (error) {
                console.warn(`Failed to export chart ${chartId}:`, error);
            }
        });

        this.downloadChartsAsZip(exportData);
    }

    async downloadChartsAsZip(exportData) {
        if (typeof JSZip === 'undefined') {
            console.warn('JSZip library is not loaded, falling back to single PNG export');
            if (exportData.length > 0) {
                const link = document.createElement('a');
                link.download = 'graph-analysis.png';
                link.href = exportData[0].image;
                link.click();
            }
            return;
        }

        const zip = new JSZip();
        exportData.forEach((chart) => {
            const data = chart.image.replace(/^data:image\/png;base64,/, '');
            zip.file(`chart-${chart.name}.png`, data, { base64: true });
        });

        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = 'graph-analysis.zip';
        link.click();
        URL.revokeObjectURL(link.href);
    }

    destroyAllCharts() {
        this.charts.forEach((chart) => {
            try {
                chart.destroy();
            } catch (error) {
                console.warn('Failed to destroy chart:', error);
            }
        });
        this.charts.clear();
    }
}

// ==========================================
// GLOBAL INITIALIZATION
// ==========================================

let graphModalInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js library is not loaded!');
        return;
    }

    graphModalInstance = new GraphModalManager();
    console.log('Graph Modal initialized successfully');
});

window.GraphModal = {
    open: function(productIds = null) {
        if (graphModalInstance) {
            graphModalInstance.open(productIds);
        } else {
            console.error('Graph Modal not initialized');
        }
    },

    close: function() {
        if (graphModalInstance) {
            graphModalInstance.close();
        }
    },

    isOpen: function() {
        return GraphModalState.isOpen;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.GraphModal;
}