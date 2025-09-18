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
            amountMax: null
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
        // Намираме активния таб
        const activeTabBtn = document.querySelector('.tab-btn.active');
        if (!activeTabBtn) return;

        const currentTab = activeTabBtn.dataset.tab;

        // Обновяваме tab indicator ако се е променил
        if (currentTab !== this.currentTab) {
            this.currentTab = currentTab;
            this.updateTabIndicator();
        }

        // Извличаме поръчките от DOM
        const ordersContainer = document.querySelector(`#${currentTab}-orders-list`);
        if (!ordersContainer) return;

        const orderCards = ordersContainer.querySelectorAll('.order-card');

        // Ако няма промяна в броя, не правим нищо
        if (orderCards.length === this.allOrders.length && orderCards.length > 0) return;

        // Извличаме данните
        const extractedOrders = [];
        orderCards.forEach((card) => {
            const orderData = this.extractOrderDataFromCard(card);
            if (orderData) {
                extractedOrders.push(orderData);
            }
        });

        // Обновяваме данните
        if (extractedOrders.length !== this.allOrders.length) {
            this.allOrders = extractedOrders;
            this.updateLocationOptions();
            this.applyAllFilters();
            console.log(`✓ Extracted ${extractedOrders.length} orders from ${currentTab} tab`);
        }
    }

    // Извличане на данни от order card
    extractOrderDataFromCard(card) {
        try {
            // Основни елементи
            const orderIdEl = card.querySelector('.order-id');
            const companyEl = card.querySelector('.client-company');
            const detailsEl = card.querySelector('.client-details');
            const totalEl = card.querySelector('.order-total');
            const itemsEl = card.querySelector('.order-items'); // За брой артикули
            const dateEl = card.querySelector('.order-date'); // За дата
            const timeEl = card.querySelector('.order-time'); // За час
            const netPriceEl = card.querySelector('.order-net-price'); // За цена без ДДС

            if (!orderIdEl) return null;

            // Извличане на ID
            const orderId = orderIdEl.textContent.replace(/[^0-9]/g, '');
            if (!orderId) return null;

            // Извличане на фирма
            const company = companyEl ? companyEl.textContent.trim() : '';

            // Парсиране на клиентски детайли
            const detailsText = detailsEl ? detailsEl.textContent.trim() : '';
            const detailsParts = detailsText.split(' • ');
            const clientName = detailsParts[0] || '';
            const clientPhone = detailsParts[1] || '';
            const clientLocation = detailsParts[2] || '';

            // Извличане на обща сума
            const totalText = totalEl ? totalEl.textContent.trim() : '';
            const totalMatch = totalText.match(/(\d+(?:\.\d{2})?)\s*лв/);
            const totalGross = totalMatch ? parseFloat(totalMatch[1]) : 0;

            // Извличане на нето цена
            const netText = netPriceEl ? netPriceEl.textContent.trim() : '';
            const netMatch = netText.match(/(\d+(?:\.\d{2})?)\s*лв/);
            const totalNet = netMatch ? parseFloat(netMatch[1]) : 0;

            // Извличане на брой артикули
            const itemsText = itemsEl ? itemsEl.textContent.trim() : '';
            const itemsMatch = itemsText.match(/(\d+)/);
            const itemsCount = itemsMatch ? parseInt(itemsMatch[1]) : 0;

            // Извличане на дата и час
            const orderDate = dateEl ? dateEl.textContent.trim() : '';
            const orderTime = timeEl ? timeEl.textContent.trim() : '';

            // Създаване на Date object за правилно сортиране по време
            let submittedDateTime = null;
            if (orderDate && orderTime) {
                // Предполагаме формат DD.MM.YYYY за датата
                const dateParts = orderDate.split('.');
                const timeParts = orderTime.split(':');

                if (dateParts.length === 3 && timeParts.length === 2) {
                    submittedDateTime = new Date(
                        parseInt(dateParts[2]), // година
                        parseInt(dateParts[1]) - 1, // месец (0-based)
                        parseInt(dateParts[0]), // ден
                        parseInt(timeParts[0]), // час
                        parseInt(timeParts[1]) // минути
                    );
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
                submittedDateTime: submittedDateTime, // За точно сортиране по време
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

        // Записваме резултатите
        this.filteredOrders = results;

        // Обновяваме UI
        this.updateDisplay();
        this.updateVisualOrder();

        console.log(`Applied filters: ${results.length}/${this.allOrders.length} orders shown`);
    }

    // Сортиране
    applySorting(orders) {
        const sorted = [...orders];

        switch (this.filters.sort) {
            case 'newest':
                return sorted.sort((a, b) => {
                    // Ако имаме точни DateTime обекти, използваме ги
                    if (a.submittedDateTime && b.submittedDateTime) {
                        return b.submittedDateTime - a.submittedDateTime;
                    }
                    // Иначе fallback към ID сравнение
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
                return sorted.sort((a, b) =>
                    (a.clientCompany || '').localeCompare(b.clientCompany || '', 'bg')
                );

            case 'company-za':
                return sorted.sort((a, b) =>
                    (b.clientCompany || '').localeCompare(a.clientCompany || '', 'bg')
                );

            case 'client-az':
                return sorted.sort((a, b) =>
                    (a.clientName || '').localeCompare(b.clientName || '', 'bg')
                );

            case 'client-za':
                return sorted.sort((a, b) =>
                    (b.clientName || '').localeCompare(a.clientName || '', 'bg')
                );

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
        const container = document.querySelector(`#${this.currentTab}-orders-list`);
        if (!container) return;

        // Намираме всички карти
        const allCards = Array.from(container.querySelectorAll('.order-card'));

        // Премахваме всички карти
        allCards.forEach(card => card.remove());

        // Добавяме обратно само филтрираните в правилния ред
        this.filteredOrders.forEach(order => {
            const matchingCard = allCards.find(card =>
                card.getAttribute('data-order-id') === order.id
            );

            if (matchingCard) {
                container.appendChild(matchingCard);
            }
        });

        console.log(`Visibility updated: showing ${this.filteredOrders.length} of ${this.allOrders.length} orders`);
    }

    // Изчистване на всички филтри
    resetAllFilters() {
        console.log('Resetting all filters...');

        // Изчистване на състоянието
        this.filters = {
            search: '',
            location: '',
            sort: 'newest',
            amountMin: null,
            amountMax: null
        };

        // Изчистване на всички UI елементи
        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
        }
        if (this.elements.locationSelect) {
            this.elements.locationSelect.value = '';
        }
        if (this.elements.sortSelect) {
            this.elements.sortSelect.value = 'newest';
        }
        if (this.elements.amountMin) {
            this.elements.amountMin.value = '';
        }
        if (this.elements.amountMax) {
            this.elements.amountMax.value = '';
        }

        // Прилагаме изчистените филтри
        this.applyAllFilters();

        // Визуален feedback за потребителя
        if (this.elements.resetBtn) {
            const originalText = this.elements.resetBtn.innerHTML;
            this.elements.resetBtn.innerHTML = '<i class="bi bi-check"></i> Изчистено';
            this.elements.resetBtn.style.background = '#28a745';

            setTimeout(() => {
                this.elements.resetBtn.innerHTML = originalText;
                this.elements.resetBtn.style.background = '';
            }, 1000);
        }

        console.log('✓ All filters reset successfully');
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