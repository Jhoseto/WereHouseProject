/**
 * PRODUCTION FILTER MANAGER - INSTANT REAL-TIME FILTERING
 * ========================================================
 * Production-ready филтър мениджър с мгновени резултати:
 * - Едновременно филтриране по всички критерии
 * - Мгновено търсене, сортиране и period филтриране
 * - Оптимизирана DOM манипулация за максимална производителност
 * - Automatic data extraction с минимална нагрузка
 */
class ProductionFilterManager {
    constructor() {
        // Данни
        this.allOrders = [];
        this.filteredOrders = [];
        this.currentTab = 'urgent';
        this.uniqueLocations = new Set();

        // Състояние на всички филтри
        this.filters = {
            search: '',
            location: '',
            sort: 'newest',
            amountMin: null,
            amountMax: null,
            period: ''
        };

        // DOM елементи
        this.elements = {};

        // Performance tracking
        this.lastFilterTime = 0;
        this.filterCount = 0;

        console.log('ProductionFilterManager created - optimized for instant results');
    }

    // ==========================================
    // INTELLIGENT SEARCH FUNCTION
    // ==========================================

    smartSearch(order, searchQuery) {
        // Създаваме пълен search text от всички релевантни полета
        const searchableText = [
            order.clientName || '',
            order.clientCompany || '',
            order.clientPhone || '',
            order.clientLocation || '',
            order.id || ''
        ].join(' ').toLowerCase().trim();

        // Нормализираме search query-то
        const normalizedQuery = searchQuery.toLowerCase().trim();

        // Ако няма текст за търсене, връщаме false
        if (!normalizedQuery || !searchableText) {
            return false;
        }

        // 1. EXACT MATCH - ако цялата фраза се намира някъде
        if (searchableText.includes(normalizedQuery)) {
            return true;
        }

        // 2. WORD-BASED SEARCH - разделяме query-то на думи
        const searchWords = normalizedQuery.split(/\s+/).filter(word => word.length > 0);

        // Ако има само една дума, проверяваме дали се намира като част от дума
        if (searchWords.length === 1) {
            const singleWord = searchWords[0];
            // Проверяваме дали думата започва някоя дума в текста
            const textWords = searchableText.split(/\s+/);
            return textWords.some(textWord => textWord.includes(singleWord));
        }

        // 3. MULTI-WORD SEARCH - всички думи трябва да се намират в текста
        // но не задължително една до друга
        return searchWords.every(searchWord => {
            // Всяка дума от query-то трябва да се намира някъде в текста
            return searchableText.includes(searchWord);
        });
    }

    // ==========================================
    // ИНИЦИАЛИЗАЦИЯ И НАСТРОЙКА
    // ==========================================

    initialize() {
        this.setupElements();
        this.setupInstantEventListeners();
        this.startOptimizedDataWatcher();

        // Initial data extraction
        this.extractDataFromDOM();

        console.log('✓ ProductionFilterManager initialized with instant filtering');
    }

    setupElements() {
        this.elements = {
            searchInput: document.getElementById('search-input'),
            locationSelect: document.getElementById('location-filter'),
            sortSelect: document.getElementById('sort-select'),
            amountMin: document.getElementById('amount-min'),
            amountMax: document.getElementById('amount-max'),
            periodSelect: document.getElementById('period-filter'),
            filteredCount: document.getElementById('filtered-count'),
            totalCount: document.getElementById('total-count'),
            totalAmountFiltered: document.getElementById('total-amount-filtered'),
            resetBtn: document.getElementById('reset-filters'),
            tabName: document.getElementById('active-tab-name')
        };

        const foundElements = Object.keys(this.elements).filter(key => this.elements[key]);
        console.log('Production elements found:', foundElements);
    }

    // ==========================================
    // МГНОВЕНИ EVENT LISTENERS
    // ==========================================

    setupInstantEventListeners() {
        // Search input - дебавниран но мгновен
        if (this.elements.searchInput) {
            let searchTimeout;
            this.elements.searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.filters.search = e.target.value.trim().toLowerCase();
                    this.applyAllFiltersInstantly();
                }, 100); // Оптимизирано за по-бърза реакция
            });
        }

        // Location dropdown - мгновено
        if (this.elements.locationSelect) {
            this.elements.locationSelect.addEventListener('change', (e) => {
                this.filters.location = e.target.value;
                this.applyAllFiltersInstantly();
            });
        }

        // Sort dropdown - мгновено
        if (this.elements.sortSelect) {
            this.elements.sortSelect.addEventListener('change', (e) => {
                this.filters.sort = e.target.value;
                this.applyAllFiltersInstantly();
            });
        }

        // Amount range inputs - оптимизирано дебавниране
        if (this.elements.amountMin) {
            let timeout;
            this.elements.amountMin.addEventListener('input', (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    const value = parseFloat(e.target.value);
                    this.filters.amountMin = isNaN(value) ? null : value;
                    this.applyAllFiltersInstantly();
                }, 200);
            });
        }

        if (this.elements.amountMax) {
            let timeout;
            this.elements.amountMax.addEventListener('input', (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    const value = parseFloat(e.target.value);
                    this.filters.amountMax = isNaN(value) ? null : value;
                    this.applyAllFiltersInstantly();
                }, 200);
            });
        }

        // Period dropdown - КРИТИЧНО МГНОВЕНО
        if (this.elements.periodSelect) {
            this.elements.periodSelect.addEventListener('change', (e) => {
                this.filters.period = e.target.value;
                this.applyAllFiltersInstantly();
            });
        }

        // Reset button
        if (this.elements.resetBtn) {
            this.elements.resetBtn.addEventListener('click', () => {
                this.resetAllFilters();
            });
        }

        console.log('✓ Instant event listeners configured');
    }

    // ==========================================
    // ОПТИМИЗИРАН DATA WATCHER
    // ==========================================

    startOptimizedDataWatcher() {
        // Намален interval за по-бърза реакция
        setInterval(() => {
            this.extractDataFromDOM();
        }, 500); // Намалено от 1000ms на 500ms

        console.log('✓ Optimized data watcher started (500ms interval)');
    }

    // ==========================================
    // ИЗВЛИЧАНЕ И ОБРАБОТКА НА ДАННИ
    // ==========================================

    extractDataFromDOM() {
        const activeTabBtn = document.querySelector('.tab-btn.active');
        const currentActiveTab = activeTabBtn?.dataset.tab || 'pending';

        if (currentActiveTab !== this.currentTab) {
            this.currentTab = currentActiveTab;
            this.updateTabIndicator();
        }

        // Събираме данни от всички табове
        let allExtractedOrders = [];
        let tabsWithData = [];

        ['urgent', 'pending', 'confirmed', 'cancelled'].forEach(tabName => {
            const container = document.querySelector(`#${tabName}-orders-list`);
            if (!container) return;

            const orderCards = container.querySelectorAll('.order-card');
            if (orderCards.length > 0) {
                tabsWithData.push(`${tabName}:${orderCards.length}`);

                orderCards.forEach(card => {
                    const orderData = this.extractOrderDataFromCard(card);
                    if (orderData) {
                        orderData.sourceTab = tabName;
                        allExtractedOrders.push(orderData);
                    }
                });
            }
        });

        // Проверяваме дали има промяна в данните
        if (allExtractedOrders.length !== this.allOrders.length) {
            this.allOrders = allExtractedOrders;
            this.updateLocationOptions();
            this.applyAllFiltersInstantly();

            console.log(`✓ Data updated: ${allExtractedOrders.length} orders from tabs: ${tabsWithData.join(', ')}`);
        }
    }

    extractOrderDataFromCard(card) {
        try {
            const orderIdEl = card.querySelector('.order-id');
            const companyEl = card.querySelector('.client-company');
            const detailsEl = card.querySelector('.client-details');
            const itemsEl = card.querySelector('.order-items');
            const totalEl = card.querySelector('.order-total');
            const netPriceEl = card.querySelector('.order-net-price');
            const dateEl = card.querySelector('.order-date');
            const timeEl = card.querySelector('.order-time');

            if (!orderIdEl) return null;

            // Извличане на ID
            const orderId = orderIdEl.textContent.replace(/[^0-9]/g, '');
            if (!orderId) return null;

            // Фирма
            const company = companyEl ? companyEl.textContent.trim() : '';

            // Клиентски детайли
            const detailsText = detailsEl ? detailsEl.textContent.trim() : '';
            const detailsParts = detailsText.split(' • ');
            const clientName = detailsParts[0] || '';
            const clientPhone = detailsParts[1] || '';
            const clientLocation = detailsParts[2] || '';

            // Брой артикули
            const itemsText = itemsEl ? itemsEl.textContent.trim() : '';
            const itemsMatch = itemsText.match(/(\d+)/);
            const itemsCount = itemsMatch ? parseInt(itemsMatch[1]) : 0;

            // Обща сума
            const totalText = totalEl ? totalEl.textContent.trim() : '';
            const totalMatch = totalText.match(/(\d+(?:\.\d{2})?)/);
            const totalGross = totalMatch ? parseFloat(totalMatch[1]) : 0;

            // Нето цена
            const netText = netPriceEl ? netPriceEl.textContent.trim() : '';
            const netMatch = netText.match(/(\d+(?:\.\d{2})?)\s*лв/);
            const totalNet = netMatch ? parseFloat(netMatch[1]) : 0;

            // Date parsing за формат "16.09.2025 г."
            const orderDate = dateEl ? dateEl.textContent.trim() : '';
            const orderTime = timeEl ? timeEl.textContent.trim() : '';

            let submittedDateTime = null;
            if (orderDate && orderTime) {
                const cleanDate = orderDate.replace(/\s*г\.?$/, '');
                const dateMatch = cleanDate.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
                const timeMatch = orderTime.match(/(\d{1,2}):(\d{1,2})/);

                if (dateMatch && timeMatch) {
                    const day = parseInt(dateMatch[1]);
                    const month = parseInt(dateMatch[2]) - 1;
                    const year = parseInt(dateMatch[3]);
                    const hour = parseInt(timeMatch[1]);
                    const minute = parseInt(timeMatch[2]);

                    submittedDateTime = new Date(year, month, day, hour, minute);
                }
            }

            return {
                id: orderId,
                clientName,
                clientCompany: company,
                clientPhone,
                clientLocation,
                totalGross,
                totalNet,
                itemsCount,
                submittedAt: orderDate,
                submittedTime: orderTime,
                submittedDateTime: submittedDateTime,
                domElement: card
            };

        } catch (error) {
            console.warn('Error extracting order data:', error);
            return null;
        }
    }

    // ==========================================
    // МГНОВЕНО ФИЛТРИРАНЕ - ГЛАВНА ФУНКЦИЯ
    // ==========================================

    applyAllFiltersInstantly() {
        const startTime = performance.now();

        if (!this.allOrders.length) {
            this.filteredOrders = [];
            this.updateDisplay();
            this.updateVisualOrderFast();
            return;
        }

        // Започваме с всички поръчки
        let results = [...this.allOrders];

        // 1. Intelligent Search филтър - partial word matching
        if (this.filters.search) {
            results = results.filter(order => {
                return this.smartSearch(order, this.filters.search);
            });
        }

        // 2. Location филтър
        if (this.filters.location) {
            results = results.filter(order => {
                return (order.clientLocation || '').trim() === this.filters.location;
            });
        }

        // 3. Amount range филтри
        if (this.filters.amountMin !== null && this.filters.amountMin > 0) {
            results = results.filter(order => {
                return parseFloat(order.totalGross || 0) >= this.filters.amountMin;
            });
        }

        if (this.filters.amountMax !== null && this.filters.amountMax > 0) {
            results = results.filter(order => {
                return parseFloat(order.totalGross || 0) <= this.filters.amountMax;
            });
        }

        // 4. Period филтър ПРЕДИ сортиране
        if (this.filters.period && this.filters.period !== '') {
            results = this.applyPeriodFilter(results, this.filters.period);
        }

        // 5. Сортиране накрая
        results = this.applySorting(results);

        // Записваме резултатите
        this.filteredOrders = results;

        // Обновяваме UI мгновено
        this.updateDisplay();
        this.updateVisualOrderFast();

        // Performance tracking
        const endTime = performance.now();
        this.lastFilterTime = endTime - startTime;
        this.filterCount++;

        console.log(`Instant filter #${this.filterCount}: ${results.length}/${this.allOrders.length} orders (${this.lastFilterTime.toFixed(2)}ms)`);
    }

    // ==========================================
    // СПЕЦИАЛИЗИРАНИ ФИЛТРИ
    // ==========================================

    applyPeriodFilter(orders, period) {
        if (!period || period === '') return orders;

        const now = new Date();

        const getStartOfDay = (date) => {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            return start;
        };

        const getEndOfDay = (date) => {
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            return end;
        };

        let startDate, endDate;

        switch (period) {
            case 'today':
                startDate = getStartOfDay(now);
                endDate = getEndOfDay(now);
                break;

            case 'yesterday':
                const yesterday = new Date(now);
                yesterday.setDate(now.getDate() - 1);
                startDate = getStartOfDay(yesterday);
                endDate = getEndOfDay(yesterday);
                break;

            case 'last-3-days':
                const threeDaysAgo = new Date(now);
                threeDaysAgo.setDate(now.getDate() - 3);
                startDate = getStartOfDay(threeDaysAgo);
                endDate = getEndOfDay(now);
                break;

            case 'this-week':
                const dayOfWeek = now.getDay();
                const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                const thisMonday = new Date(now);
                thisMonday.setDate(now.getDate() - daysFromMonday);
                startDate = getStartOfDay(thisMonday);
                endDate = getEndOfDay(now);
                break;

            case 'last-week':
                const lastWeekStart = new Date(now);
                const currentDayOfWeek = now.getDay();
                const daysToLastMonday = currentDayOfWeek === 0 ? 13 : currentDayOfWeek + 6;
                lastWeekStart.setDate(now.getDate() - daysToLastMonday);
                const lastWeekEnd = new Date(lastWeekStart);
                lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
                startDate = getStartOfDay(lastWeekStart);
                endDate = getEndOfDay(lastWeekEnd);
                break;

            case 'this-month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = getEndOfDay(now);
                break;

            default:
                return orders;
        }

        return orders.filter(order => {
            if (!order.submittedDateTime) return false;

            const orderTime = order.submittedDateTime.getTime();
            const startTime = startDate.getTime();
            const endTime = endDate.getTime();

            return orderTime >= startTime && orderTime <= endTime;
        });
    }

    applySorting(orders) {
        const sorted = [...orders];

        switch (this.filters.sort) {
            case 'newest':
                return sorted.sort((a, b) => {
                    if (a.submittedDateTime && b.submittedDateTime) {
                        return b.submittedDateTime - a.submittedDateTime;
                    }
                    return parseInt(b.id) - parseInt(a.id);
                });

            case 'oldest':
                return sorted.sort((a, b) => {
                    if (a.submittedDateTime && b.submittedDateTime) {
                        return a.submittedDateTime - b.submittedDateTime;
                    }
                    return parseInt(a.id) - parseInt(b.id);
                });

            case 'amount-high':
                return sorted.sort((a, b) => (b.totalGross || 0) - (a.totalGross || 0));

            case 'amount-low':
                return sorted.sort((a, b) => (a.totalGross || 0) - (b.totalGross || 0));

            case 'items-most':
                return sorted.sort((a, b) => (b.itemsCount || 0) - (a.itemsCount || 0));

            case 'items-least':
                return sorted.sort((a, b) => (a.itemsCount || 0) - (b.itemsCount || 0));

            case 'company-az':
                return sorted.sort((a, b) => (a.clientCompany || '').localeCompare(b.clientCompany || '', 'bg'));

            case 'company-za':
                return sorted.sort((a, b) => (b.clientCompany || '').localeCompare(a.clientCompany || '', 'bg'));

            case 'client-az':
                return sorted.sort((a, b) => (a.clientName || '').localeCompare(b.clientName || '', 'bg'));

            case 'client-za':
                return sorted.sort((a, b) => (b.clientName || '').localeCompare(a.clientName || '', 'bg'));

            default:
                return sorted;
        }
    }

    // ==========================================
    // ULTRA-FAST DOM MANIPULATION
    // ==========================================

    updateVisualOrderFast() {
        // Създаваме Set за бърз lookup на видими order IDs
        const visibleOrderIds = new Set(this.filteredOrders.map(order => order.id));

        // Намираме всички order cards в DOM-а
        const allOrderCards = document.querySelectorAll('.order-card');

        // Скриваме/показваме карти с minimum DOM manipulation
        allOrderCards.forEach(card => {
            const orderIdEl = card.querySelector('.order-id');
            if (orderIdEl) {
                const cardOrderId = orderIdEl.textContent.replace(/[^0-9]/g, '');

                if (visibleOrderIds.has(cardOrderId)) {
                    if (card.style.display === 'none') {
                        card.style.display = 'block';
                    }
                } else {
                    if (card.style.display !== 'none') {
                        card.style.display = 'none';
                    }
                }
            }
        });

        console.log(`Fast visual update: ${visibleOrderIds.size} cards visible`);
    }

    // ==========================================
    // UI UPDATES И СТАТИСТИКИ
    // ==========================================

    updateDisplay() {
        const filteredCount = this.filteredOrders.length;
        const totalCount = this.allOrders.length;

        if (this.elements.filteredCount) {
            this.elements.filteredCount.textContent = filteredCount;
        }

        if (this.elements.totalCount) {
            this.elements.totalCount.textContent = totalCount;
        }

        // Обща сума на филтрираните поръчки
        const totalAmount = this.filteredOrders.reduce((sum, order) => sum + (order.totalGross || 0), 0);

        if (this.elements.totalAmountFiltered) {
            this.elements.totalAmountFiltered.textContent = `${totalAmount.toFixed(2)} лв`;
        }
    }

    updateTabIndicator() {
        const tabNames = {
            'urgent': 'Спешни поръчки',
            'pending': 'Изчакващи поръчки',
            'confirmed': 'Обработени поръчки',
            'cancelled': 'Отказани поръчки'
        };

        if (this.elements.tabName) {
            this.elements.tabName.textContent = tabNames[this.currentTab] || 'Поръчки';
        }
    }

    updateLocationOptions() {
        this.uniqueLocations.clear();

        // Събиране на уникални локации
        this.allOrders.forEach(order => {
            if (order.clientLocation && order.clientLocation.trim()) {
                this.uniqueLocations.add(order.clientLocation.trim());
            }
        });

        // Обновяване на dropdown
        if (this.elements.locationSelect) {
            const currentValue = this.elements.locationSelect.value;
            const locations = Array.from(this.uniqueLocations).sort();

            this.elements.locationSelect.innerHTML = '<option value="">Всички локации</option>';

            locations.forEach(location => {
                const option = document.createElement('option');
                option.value = location;
                option.textContent = location;
                if (location === currentValue) {
                    option.selected = true;
                }
                this.elements.locationSelect.appendChild(option);
            });
        }
    }

    // ==========================================
    // RESET FUNCTION
    // ==========================================

    resetAllFilters() {
        console.log('Production reset: clearing all filters...');

        // Изчистване на филтрите
        this.filters = {
            search: '',
            location: '',
            sort: 'newest',
            amountMin: null,
            amountMax: null,
            period: ''
        };

        // Изчистване на UI елементи
        if (this.elements.searchInput) this.elements.searchInput.value = '';
        if (this.elements.locationSelect) this.elements.locationSelect.value = '';
        if (this.elements.sortSelect) this.elements.sortSelect.value = 'newest';
        if (this.elements.amountMin) this.elements.amountMin.value = '';
        if (this.elements.amountMax) this.elements.amountMax.value = '';
        if (this.elements.periodSelect) this.elements.periodSelect.value = '';

        // Мгновено прилагане на reset
        this.applyAllFiltersInstantly();

        // Визуален feedback
        if (this.elements.resetBtn) {
            const originalText = this.elements.resetBtn.innerHTML;
            this.elements.resetBtn.innerHTML = '<i class="bi bi-check"></i> Изчистено';
            this.elements.resetBtn.style.background = '#28a745';

            setTimeout(() => {
                this.elements.resetBtn.innerHTML = originalText;
                this.elements.resetBtn.style.background = '';
            }, 1000);
        }

        console.log(`✓ Production reset complete: ${this.filteredOrders.length}/${this.allOrders.length} orders visible`);
    }

    // ==========================================
    // DEBUGGING И MONITORING
    // ==========================================

    getPerformanceStats() {
        return {
            filterCount: this.filterCount,
            lastFilterTime: this.lastFilterTime,
            avgFilterTime: this.filterCount > 0 ? (this.lastFilterTime / this.filterCount).toFixed(2) : 0,
            totalOrders: this.allOrders.length,
            filteredOrders: this.filteredOrders.length,
            activeFilters: Object.entries(this.filters)
                .filter(([key, value]) => value !== '' && value !== null)
                .map(([key, value]) => `${key}:${value}`)
        };
    }
}

// ==========================================
// PRODUCTION INITIALIZATION
// ==========================================

// Създаване на глобална production инстанция
window.productionFilterManager = new ProductionFilterManager();

// Production-ready initialization
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.productionFilterManager.initialize();
        console.log('✓ ProductionFilterManager ready for production use');

        // Global access for debugging
        window.getFilterStats = () => window.productionFilterManager.getPerformanceStats();

    }, 1500); // Намалено време за по-бърза инициализация
});