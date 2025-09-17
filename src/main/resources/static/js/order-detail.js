/**
 * НОВ ORDER DETAIL MANAGER - ОПРОСТЕНА ЛОГИКА
 * ============================================
 */
class OrderDetailManager {
    constructor() {
        this.orderId = this.getOrderId();
        this.originalData = new Map(); // За съхранение на оригиналните стойности
        this.hasChanges = false;

        // Елементи
        this.saveBtn = document.getElementById('saveChanges');
        this.resetBtn = document.getElementById('resetChanges');
        this.loadingOverlay = document.getElementById('loadingOverlay');

        // CSRF token
        this.csrfToken = document.querySelector('meta[name="_csrf"]')?.getAttribute('content');
        this.csrfHeader = document.querySelector('meta[name="_csrf_header"]')?.getAttribute('content');

        this.init();
    }

    init() {
        console.log('Инициализиране на OrderDetailManager за поръчка:', this.orderId);

        // Запазваме оригиналните стойности
        this.saveOriginalData();

        // Setup event listeners
        this.setupQuantityControls();
        this.setupActionButtons();
        this.setupRemoveButtons();

        console.log('OrderDetailManager инициализиран успешно');
    }

    /**
     * Запазва оригиналните количества за всички артикули
     */
    saveOriginalData() {
        const rows = document.querySelectorAll('.item-row');
        rows.forEach(row => {
            const productId = row.dataset.productId;
            const originalQuantity = parseInt(row.dataset.originalQuantity);
            const unitPrice = parseFloat(row.dataset.unitPrice);

            this.originalData.set(productId, {
                quantity: originalQuantity,
                unitPrice: unitPrice
            });
        });

        console.log('Запазени оригинални данни:', this.originalData);
    }

    /**
     * Запазва актуалните стойности от DOM-а като нови "оригинални" стойности
     * Използва се след успешно запазване
     */
    saveOriginalDataFromDOM() {
        const rows = document.querySelectorAll('.item-row:not(.marked-for-removal)');
        this.originalData.clear();

        rows.forEach(row => {
            const productId = row.dataset.productId;
            const quantityInput = row.querySelector('.quantity-input');
            const currentQuantity = quantityInput ? parseInt(quantityInput.value) : parseInt(row.dataset.originalQuantity);
            const unitPrice = parseFloat(row.dataset.unitPrice);

            this.originalData.set(productId, {
                quantity: currentQuantity,
                unitPrice: unitPrice
            });

            // Обновяваме и data атрибута
            row.dataset.originalQuantity = currentQuantity;
        });

        console.log('Запазени нови оригинални данни:', this.originalData);
    }

    /**
     * Setup за quantity контролите
     */
    setupQuantityControls() {
        // Quantity input промени
        document.addEventListener('input', (e) => {
            if (e.target.matches('.quantity-input')) {
                this.handleQuantityChange(e.target);
            }
        });

        // Quantity бутони (+/-)
        document.querySelectorAll('.quantity-decrease').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const input = btn.closest('.quantity-input-wrapper').querySelector('.quantity-input');
                const currentValue = parseInt(input.value) || 1;
                if (currentValue > 1) {
                    input.value = currentValue - 1;
                    this.handleQuantityChange(input);
                }
            });
        });

        document.querySelectorAll('.quantity-increase').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const input = btn.closest('.quantity-input-wrapper').querySelector('.quantity-input');
                const currentValue = parseInt(input.value) || 1;
                if (currentValue < 9999) {
                    input.value = currentValue + 1;
                    this.handleQuantityChange(input);
                }
            });
        });
    }


    /**
     * Обработва промяна в количеството
     */
    handleQuantityChange(input) {
        const row = input.closest('.item-row');
        const productId = row.dataset.productId;
        const newQuantity = parseInt(input.value) || 1;
        const originalQuantity = this.originalData.get(productId).quantity;

        // Валидация
        if (newQuantity < 1) {
            input.value = 1;
            return;
        }
        if (newQuantity > 999) {
            input.value = 999;
            return;
        }

        // Обновяване на общата цена за реда
        this.updateRowTotal(row, newQuantity);

        // Обновяване на общата цена на поръчката
        this.updateOrderTotals();

        // Проверка за промени
        const hasChanged = newQuantity !== originalQuantity;
        row.classList.toggle('changed', hasChanged);

        // Проверка дали има общи промени
        this.checkForChanges();
    }

    /**
     * Обновява общите суми
     */
    updateOrderTotals() {
        let totalGross = 0;

        // Събираме всички цени от редовете
        document.querySelectorAll('.item-row:not(.marked-for-removal) .item-total').forEach(totalElement => {
            const price = parseFloat(totalElement.textContent.replace(' лв.', '')) || 0;
            totalGross += price;
        });

        // Изчисляваме нето и ДДС (20%)
        const totalNet = totalGross / 1.2;
        const totalVat = totalGross - totalNet;

        // Обновяваме DOM елементите
        document.getElementById('totalNet').textContent = totalNet.toFixed(2) + ' лв.';
        document.getElementById('totalVat').textContent = totalVat.toFixed(2) + ' лв.';
        document.getElementById('totalGross').textContent = totalGross.toFixed(2) + ' лв.';
    }

    /**
     * Обновява общата цена за даден ред
     */
    updateRowTotal(row, quantity) {
        const productId = row.dataset.productId;
        const unitPrice = this.originalData.get(productId).unitPrice;
        const totalPrice = (unitPrice * quantity).toFixed(2);

        const totalElement = row.querySelector('.item-total');
        totalElement.textContent = totalPrice + ' лв.';
    }

    /**
     * Setup за action бутоните
     */
    setupActionButtons() {
        // Запази промените
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => {
                this.saveChanges();
            });
        }

        // Върни оригиналните стойности
        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => {
                this.resetChanges();
            });
        }
    }

    /**
     * Setup за бутоните за премахване
     */
    setupRemoveButtons() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.remove-item-btn')) {
                const row = e.target.closest('.item-row');
                this.removeItem(row);
            }
        });
    }

    /**
     * Премахва артикул (маркира за премахване)
     */
    /**
     * Премахва артикул (маркира за премахване)
     */
    removeItem(row) {
        const productName = row.querySelector('.product-name').textContent;

        if (confirm(`Сигурни ли сте, че искате да премахнете "${productName}" от поръчката?`)) {
            row.style.opacity = '0.5';
            row.style.textDecoration = 'line-through';
            row.classList.add('marked-for-removal');

            // Скриваме quantity контролите
            const quantityInput = row.querySelector('.quantity-input');
            if (quantityInput) {
                quantityInput.disabled = true;
            }

            this.checkForChanges();
            this.showToast('warning', 'Артикулът е маркиран за премахване. Натиснете "Запази промените" за да потвърдите.');

            // 🔵 Quick loader за UX
            window.universalLoader.showQuick("Маркиране...", "Очаква потвърждение", 1000, "secondary");
        }
    }


    /**
     * Проверява дали има промени и активира/деактивира бутоните
     */
    checkForChanges() {
        const changedRows = document.querySelectorAll('.item-row.changed');
        const removedRows = document.querySelectorAll('.item-row.marked-for-removal');

        this.hasChanges = changedRows.length > 0 || removedRows.length > 0;

        // Активиране/деактивиране на бутоните
        if (this.saveBtn) {
            this.saveBtn.disabled = !this.hasChanges;
        }
        if (this.resetBtn) {
            this.resetBtn.disabled = !this.hasChanges;
        }

        console.log('Промени:', this.hasChanges, 'Променени редове:', changedRows.length, 'Премахнати:', removedRows.length);
    }

    /**
     * Запазва всички промени с един API call
     */

    async saveChanges() {
        if (!this.hasChanges) {
            this.showToast('info', 'Няма промени за запазване.');
            return;
        }

        const items = [];
        const rows = document.querySelectorAll('.item-row:not(.marked-for-removal)');

        rows.forEach(row => {
            const productId = parseInt(row.dataset.productId);
            const quantityInput = row.querySelector('.quantity-input');
            const quantity = quantityInput ? parseInt(quantityInput.value) : parseInt(row.dataset.originalQuantity);

            items.push({
                productId: productId,
                quantity: quantity
            });
        });

        console.log('Изпращане на промени:', items);

        try {
            // 🔵 Показваме Universal Loader
            window.universalLoader.show("Запазване...", "Моля изчакайте", "primary", "save");

            const response = await fetch(`/api/orders/${this.orderId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    [this.csrfHeader]: this.csrfToken
                },
                body: JSON.stringify({ items: items })
            });

            const result = await response.json();

            if (result.success) {
                this.handleSuccessResponse(result);
            } else {
                this.handleErrorResponse(result);
            }

        } catch (error) {
            console.error('Грешка при запазване:', error);
            this.showToast('error', 'Възникна грешка при запазването. Моля, опитайте отново.');
        } finally {
            // 🟢 Скриваме Universal Loader
            window.universalLoader.hide();
        }
    }


    /**
     * Обработва успешен отговор от сървъра
     */
    handleSuccessResponse(result) {
        // Основно съобщение за успех
        if (result.updatedItems && result.updatedItems.length > 0) {
            this.showToast('success', `Поръчката ви е обновена успешно !`);
        }

        // Предупреждения за артикули с недостатъчна наличност
        if (result.warnings && result.warnings.length > 0) {
            result.warnings.forEach(warning => {
                this.showToast('warning', warning.message);
            });
        }

        // Ако има общи суми, ги обновяваме
        if (result.totals) {
            this.updateTotals(result.totals);
        }

        // 🟢 Презареждаме артикулите от бекенда
        this.reloadItems();
    }

    /**
     * Презарежда артикулите от бекенда и обновява таблицата
     */
    async reloadItems() {
        try {
            window.universalLoader.show("Презареждане...", "Моля изчакайте", "secondary", "refresh");

            const response = await fetch(`/api/orders/${this.orderId}/items`, {
                headers: {
                    [this.csrfHeader]: this.csrfToken
                }
            });

            const itemsHtml = await response.text();

            // Замества таблицата с нов HTML от бекенда
            const container = document.getElementById('orderItemsContainer');
            if (container) {
                container.innerHTML = itemsHtml;
            }

            // Реинициализация на event listeners и originalData
            this.saveOriginalDataFromDOM();
            this.checkForChanges();
            this.setupQuantityControls();
            this.setupActionButtons();
            this.setupRemoveButtons();

        } catch (error) {
            console.error('Грешка при презареждане на артикули:', error);
            this.showToast('error', 'Неуспешно презареждане на артикулите.');
        } finally {
            window.universalLoader.hide();
        }
    }

    /**
     * Обработва грешен отговор от сървъра
     */
    handleErrorResponse(result) {
        if (result.errors && result.errors.length > 0) {
            result.errors.forEach(error => {
                this.showToast('error', error.message);
            });
        } else {
            this.showToast('error', result.message || 'Възникна грешка при запазването.');
            this.resetChanges();
        }
    }

    /**
     * Обновява общите суми в UI
     */
    updateTotals(totals) {
        const totalNetElement = document.getElementById('totalNet');
        const totalVatElement = document.getElementById('totalVat');
        const totalGrossElement = document.getElementById('totalGross');

        if (totalNetElement && totals.totalNet !== undefined) {
            totalNetElement.textContent = totals.totalNet.toFixed(2) + ' лв.';
        }
        if (totalVatElement && totals.totalVat !== undefined) {
            totalVatElement.textContent = totals.totalVat.toFixed(2) + ' лв.';
        }
        if (totalGrossElement && totals.totalGross !== undefined) {
            totalGrossElement.textContent = totals.totalGross.toFixed(2) + ' лв.';
        }
    }

    /**
     * Връща всички промени към оригиналните стойности
     */
    resetChanges() {
        const rows = document.querySelectorAll('.item-row');

        rows.forEach(row => {
            const productId = row.dataset.productId;
            const originalData = this.originalData.get(productId);

            // Възстановяване на количеството
            const quantityInput = row.querySelector('.quantity-input');
            if (quantityInput) {
                quantityInput.value = originalData.quantity;
                quantityInput.disabled = false;
            }

            // Възстановяване на общата цена
            this.updateRowTotal(row, originalData.quantity);

            // Премахване на change индикаторите
            row.classList.remove('changed', 'marked-for-removal');
            row.style.opacity = '';
            row.style.textDecoration = '';
        });

        this.checkForChanges();
        this.showToast('info', 'Всички промени са върнати към оригиналните стойности.');
    }


    /**
     * Получава ID на поръчката от URL
     */
    getOrderId() {
        const pathParts = window.location.pathname.split('/');
        return pathParts[pathParts.length - 1];
    }

    /**
     * Показва toast съобщение
     */
    showToast(type, message, title = '') {
        if (window.toastManager) {
            window.toastManager[type](message, title);
        } else {
            console.log(`${type.toUpperCase()}: ${title} - ${message}`);
            alert(`${title ? title + ': ' : ''}${message}`);
        }
    }
}

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Order Detail страница заредена');

    // Инициализираме само ако има редактируеми елементи
    const editableInputs = document.querySelectorAll('.quantity-input');
    if (editableInputs.length > 0) {
        window.orderDetailManager = new OrderDetailManager();
        console.log('OrderDetailManager инициализиран за редактиране');
    } else {
        console.log('Поръчката не може да се редактира - OrderDetailManager не е нужен');
    }
});