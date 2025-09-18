/**
 * SIMPLE FILTER MANAGER - MULTI-CRITERIA FILTERING
 * ================================================
 * Прост и ефективен филтър мениджър който поддържа:
 * - Едновременно филтриране по множество критерии
 * - Real-time търсене и сортиране
 * - Автоматично извличане на данни от DOM
 */
class SimpleFilterManager {
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

        console.log('SimpleFilterManager created');
    }

    // Основна инициализация
    initialize() {
        this.setupElements();
        this.setupEventListeners();
        this.startDataWatcher();
        console.log('✓ SimpleFilterManager initialized');
    }

    // Намиране на DOM елементи
    setupElements() {
        this.elements = {
            searchInput: document.getElementById('search-input'),
            locationSelect: document.getElementById('location-filter'),
            sortSelect: document.getElementById('sort-select'),
            amountMin: document.getElementById('amount-min'),
            amountMax: document.getElementById('amount-max'),
            itemsMin: document.getElementById('items-min'),
            itemsMax: document.getElementById('items-max'),
            periodSelect: document.getElementById('period-filter'),
            filteredCount: document.getElementById('filtered-count'),
            totalCount: document.getElementById('total-count'),
            totalAmountFiltered: document.getElementById('total-amount-filtered'),
            resetBtn: document.getElementById('reset-filters'),
            tabName: document.getElementById('active-tab-name')
        };

        const foundElements = Object.keys(this.elements).filter(key => this.elements[key]);
        console.log('Filter elements found:', foundElements);
    }

    // Event listeners за всички филтри
    setupEventListeners() {
        // Search input - реагира веднага при писане
        if (this.elements.searchInput) {
            let searchTimeout;
            this.elements.searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.filters.search = e.target.value.trim().toLowerCase();
                    this.applyAllFilters();
                }, 100);
            });
        }

        // Location dropdown
        if (this.elements.locationSelect) {
            this.elements.locationSelect.addEventListener('change', (e) => {
                this.filters.location = e.target.value;
                this.applyAllFilters();
            });
        }

        // Sort dropdown
        if (this.elements.sortSelect) {
            this.elements.sortSelect.addEventListener('change', (e) => {
                this.filters.sort = e.target.value;
                this.applyAllFilters();
            });
        }

        // Amount range inputs
        if (this.elements.amountMin) {
            let timeout;
            this.elements.amountMin.addEventListener('input', (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    const value = parseFloat(e.target.value);
                    this.filters.amountMin = isNaN(value) ? null : value;
                    this.applyAllFilters();
                }, 300);
            });
        }

        if (this.elements.amountMax) {
            let timeout;
            this.elements.amountMax.addEventListener('input', (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    const value = parseFloat(e.target.value);
                    this.filters.amountMax = isNaN(value) ? null : value;
                    this.applyAllFilters();
                }, 300);
            });
        }

        // Period dropdown
        if (this.elements.periodSelect) {
            this.elements.periodSelect.addEventListener('change', (e) => {
                this.filters.period = e.target.value;
                this.applyAllFilters();
            });
        }

        // Reset button
        if (this.elements.resetBtn) {
            this.elements.resetBtn.addEventListener('click', () => {
                this.resetAllFilters();
            });
        }

        console.log('✓ Filter event listeners ready');
    }

    // Автоматично следене за нови данни в DOM
    startDataWatcher() {
        setInterval(() => {
            this.extractDataFromDOM();
        }, 1000);
        console.log('✓ Data watcher started');
    }

    // Извличане на данни от активния таб
    extractDataFromDOM() {
        const activeTabBtn = document.querySelector('.tab-btn.active');
        const currentActiveTab = activeTabBtn?.dataset.tab || 'pending';

        // Обновяваме активния таб за UI целите
        if (currentActiveTab !== this.currentTab) {
            this.currentTab = currentActiveTab;
            this.updateTabIndicator();
        }

        // КЛЮЧОВА ПРОМЯНА: Събираме данни от всички табове
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
                        // Добавяме информация за кой таб принадлежи поръчката
                        orderData.sourceTab = tabName;
                        allExtractedOrders.push(orderData);
                    }
                });
            }
        });

        console.log(`Found data in tabs: ${tabsWithData.join(', ')}`);

        // Обновяваме данните ако има промяна
        if (allExtractedOrders.length !== this.allOrders.length) {
            this.allOrders = allExtractedOrders;
            this.updateLocationOptions();
            this.applyAllFilters();
            console.log(`✓ Extracted ${allExtractedOrders.length} orders from all tabs`);
        }
    }


    // Извличане на данни от order card
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

            // Брой артикули - извличаме числото от "7 артикула"
            const itemsText = itemsEl ? itemsEl.textContent.trim() : '';
            const itemsMatch = itemsText.match(/(\d+)/);
            const itemsCount = itemsMatch ? parseInt(itemsMatch[1]) : 0;

            // Обща сума - извличаме числото от "256.80 лв"
            const totalText = totalEl ? totalEl.textContent.trim() : '';
            const totalMatch = totalText.match(/(\d+(?:\.\d{2})?)/);
            const totalGross = totalMatch ? parseFloat(totalMatch[1]) : 0;

            // Нето цена - извличаме числото от "без ДДС: 214.00 лв"
            const netText = netPriceEl ? netPriceEl.textContent.trim() : '';
            const netMatch = netText.match(/(\d+(?:\.\d{2})?)\s*лв/);
            const totalNet = netMatch ? parseFloat(netMatch[1]) : 0;

            // ПОПРАВЕНО: Date parsing за формат "16.09.2025 г."
            const orderDate = dateEl ? dateEl.textContent.trim() : '';
            const orderTime = timeEl ? timeEl.textContent.trim() : '';

            let submittedDateTime = null;
            if (orderDate && orderTime) {
                // Премахваме " г." от края на датата
                const cleanDate = orderDate.replace(/\s*г\.?$/, '');
                const dateMatch = cleanDate.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
                const timeMatch = orderTime.match(/(\d{1,2}):(\d{1,2})/);

                if (dateMatch && timeMatch) {
                    const day = parseInt(dateMatch[1]);
                    const month = parseInt(dateMatch[2]) - 1; // 0-based months in JavaScript
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
            console.warn('Error extracting order data:', error, card);
            return null;
        }
    }

    // Обновяване на tab indicator
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

        console.log(`Tab changed to: ${this.currentTab}`);
    }

    // Обновяване на location options
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

            console.log(`Updated ${locations.length} location options`);
        }
    }

    // ГЛАВНА ФУНКЦИЯ: Прилагане на всички филтри едновременно
    applyAllFilters() {
        if (!this.allOrders.length) {
            this.filteredOrders = [];
            this.updateDisplay();
            this.updateVisualOrder();
            return;
        }

        // Започваме с всички поръчки
        let results = [...this.allOrders];

        // 1. Search филтър
        if (this.filters.search) {
            results = results.filter(order => {
                const searchText = [
                    order.clientName || '',
                    order.clientCompany || '',
                    order.clientPhone || '',
                    order.clientLocation || '',
                    order.id || ''
                ].join(' ').toLowerCase();

                return searchText.includes(this.filters.search);
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

        // 4. Сортиране на филтрираните резултати
        results = this.applySorting(results);

        // 5. Period филтър
        if (this.filters.period && this.filters.period !== '') {
            results = this.applyPeriodFilter(results, this.filters.period);
        }

        // Записваме резултатите
        this.filteredOrders = results;

        // Обновяваме UI
        this.updateDisplay();
        this.updateVisualOrder();

        console.log(`Applied filters: ${results.length}/${this.allOrders.length} orders shown`);
    }


    // Добавете тази функция в SimpleFilterManager класа:

    applyPeriodFilter(orders, period) {
        if (!period || period === '') return orders;

        const now = new Date();

        // Създаваме помощни функции за дати
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
                // Намираме понedelника на тази седмица
                const dayOfWeek = now.getDay(); // 0 = неделя, 1 = понеделник
                const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                const thisMonday = new Date(now);
                thisMonday.setDate(now.getDate() - daysFromMonday);

                startDate = getStartOfDay(thisMonday);
                endDate = getEndOfDay(now);
                break;

            case 'last-week':
                // Намираме понеделника на миналата седмица
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
                return orders; // Неразпознат период - връщаме всички поръчки
        }

        // Филтрираме поръчките според изчисления период
        return orders.filter(order => {
            if (!order.submittedDateTime) {
                return false; // Ако няма валидна дата, изключваме поръчката
            }

            const orderTime = order.submittedDateTime.getTime();
            const startTime = startDate.getTime();
            const endTime = endDate.getTime();

            return orderTime >= startTime && orderTime <= endTime;
        });
    }


    // Сортиране
    // Заменете applySorting функцията с тази:
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

    // Обновяване на статистики
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
        const totalAmount = this.filteredOrders.reduce((sum, order) => sum + order.totalGross, 0);

        if (this.elements.totalAmountFiltered) {
            this.elements.totalAmountFiltered.textContent = `${totalAmount.toFixed(2)} лв`;
        }
    }

    // Обновяване на визуализацията с правилното подреждане
    updateVisualOrder() {
        // Скриваме всички карти във всички табове
        ['urgent', 'pending', 'confirmed', 'cancelled'].forEach(tabName => {
            const container = document.querySelector(`#${tabName}-orders-list`);
            if (container) {
                const allCards = container.querySelectorAll('.order-card');
                allCards.forEach(card => card.remove());
            }
        });

        // Групираме филтрираните резултати по табове
        const resultsByTab = {};
        this.filteredOrders.forEach(order => {
            const sourceTab = order.sourceTab || 'pending';
            if (!resultsByTab[sourceTab]) {
                resultsByTab[sourceTab] = [];
            }
            resultsByTab[sourceTab].push(order);
        });

        // Възстановяваме картите в съответните табове
        Object.entries(resultsByTab).forEach(([tabName, orders]) => {
            const container = document.querySelector(`#${tabName}-orders-list`);
            if (!container) return;

            orders.forEach(order => {
                if (order.domElement) {
                    container.appendChild(order.domElement);
                }
            });
        });

        console.log(`Cross-tab visibility: showing ${this.filteredOrders.length} of ${this.allOrders.length} orders`);
    }

    // Изчистване на всички филтри
    resetAllFilters() {
        console.log('Resetting all filters...');

        // Изчистване на филтрите
        this.filters = {
            search: '',
            location: '',
            sort: 'newest',
            amountMin: null,
            amountMax: null,
            itemsMin: null,
            itemsMax: null,
            period: ''
        };

        // Изчистване на UI елементи
        if (this.elements.searchInput) this.elements.searchInput.value = '';
        if (this.elements.locationSelect) this.elements.locationSelect.value = '';
        if (this.elements.sortSelect) this.elements.sortSelect.value = 'newest';
        if (this.elements.amountMin) this.elements.amountMin.value = '';
        if (this.elements.amountMax) this.elements.amountMax.value = '';
        if (this.elements.itemsMin) this.elements.itemsMin.value = '';
        if (this.elements.itemsMax) this.elements.itemsMax.value = '';
        if (this.elements.periodSelect) this.elements.periodSelect.value = '';

        // КРИТИЧНО: Принудително извличане на най-нови данни
        this.extractDataFromDOM();

        // След това прилагаме изчистените филтри
        this.applyAllFilters();

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

        console.log(`✓ Reset complete: showing ${this.filteredOrders.length}/${this.allOrders.length} orders`);
    }
}

// Създаване на глобална инстанция
window.simpleFilterManager = new SimpleFilterManager();

// Стартиране след зареждане на страницата
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.simpleFilterManager.initialize();
        console.log('✓ SimpleFilterManager started');
    }, 2000);
});