/**
 * ФИНАЛЕН ORDER DETAIL MANAGER - БЕЗ ГРЕШКИ
 * ========================================
 */

class OrderDetailManager {
    constructor() {
        this.isEditMode = false;
        this.csrfToken = window.csrfToken || '';
        this.csrfHeader = window.csrfHeader || 'X-CSRF-TOKEN';
        this.init();
    }

    init() {
        this.setupEventListeners();
        console.log('Order Detail Manager initialized');
    }

    setupEventListeners() {
        // Edit mode toggle
        const editToggle = document.getElementById('editModeToggle');
        if (editToggle) {
            editToggle.addEventListener('click', () => this.toggleEditMode());
        }

        // Exit edit mode
        const exitEditMode = document.getElementById('exitEditMode');
        if (exitEditMode) {
            exitEditMode.addEventListener('click', () => this.exitEditMode());
        }

        // Save/Cancel buttons
        const saveBtn = document.getElementById('saveAllChanges');
        const cancelBtn = document.getElementById('cancelAllChanges');

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.exitEditMode());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.exitEditMode());
        }

        // Quantity controls
        this.setupQuantityControls();

        // Remove item buttons
        this.setupRemoveButtons();
    }

    toggleEditMode() {
        if (this.isEditMode) {
            this.exitEditMode();
        } else {
            this.enterEditMode();
        }
    }

    enterEditMode() {
        this.isEditMode = true;

        // Update UI elements
        const editToggle = document.getElementById('editModeToggle');
        const editNotice = document.getElementById('editModeNotice');
        const saveSection = document.getElementById('saveChangesSection');

        if (editToggle) {
            editToggle.classList.add('active');
            editToggle.querySelector('.edit-text').textContent = 'Изход';
            editToggle.querySelector('i').className = 'bi bi-x-circle';
        }

        if (editNotice) {
            editNotice.style.display = 'block';
        }

        if (saveSection) {
            saveSection.style.display = 'flex';
        }

        // Show edit controls
        document.querySelectorAll('.edit-column').forEach(col => {
            col.style.display = 'table-cell';
        });

        document.querySelectorAll('.item-actions').forEach(actions => {
            actions.style.display = 'flex';
        });

        this.showToast('info', 'Режим на редактиране', 'Можете да променяте количествата и да премахвате артикули');
    }

    exitEditMode() {
        this.isEditMode = false;

        // Update UI elements
        const editToggle = document.getElementById('editModeToggle');
        const editNotice = document.getElementById('editModeNotice');
        const saveSection = document.getElementById('saveChangesSection');

        if (editToggle) {
            editToggle.classList.remove('active');
            editToggle.querySelector('.edit-text').textContent = 'Редактирай';
            editToggle.querySelector('i').className = 'bi bi-pencil-square';
        }

        if (editNotice) {
            editNotice.style.display = 'none';
        }

        if (saveSection) {
            saveSection.style.display = 'none';
        }

        // Hide edit controls
        document.querySelectorAll('.edit-column').forEach(col => {
            col.style.display = 'none';
        });

        document.querySelectorAll('.quantity-edit-panel').forEach(panel => {
            panel.style.display = 'none';
        });

        document.querySelectorAll('.quantity-display').forEach(display => {
            display.style.display = 'flex';
        });
    }

    setupQuantityControls() {
        // Edit quantity buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.edit-quantity-btn')) {
                const row = e.target.closest('.item-row');
                this.showQuantityEdit(row);
            }
        });

        // Quantity +/- buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.quantity-increase')) {
                const input = e.target.closest('.quantity-controls').querySelector('.quantity-input');
                input.value = Math.min(parseInt(input.value) + 1, 999);
            }

            if (e.target.closest('.quantity-decrease')) {
                const input = e.target.closest('.quantity-controls').querySelector('.quantity-input');
                input.value = Math.max(parseInt(input.value) - 1, 1);
            }
        });

        // Update quantity button
        document.addEventListener('click', (e) => {
            if (e.target.closest('.update-quantity-btn')) {
                const row = e.target.closest('.item-row');
                this.updateQuantity(row);
            }
        });

        // Cancel quantity edit
        document.addEventListener('click', (e) => {
            if (e.target.closest('.cancel-quantity-btn')) {
                const row = e.target.closest('.item-row');
                this.cancelQuantityEdit(row);
            }
        });

        // Enter key to save
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.classList.contains('quantity-input')) {
                e.preventDefault();
                const row = e.target.closest('.item-row');
                this.updateQuantity(row);
            }
        });
    }

    showQuantityEdit(row) {
        const quantityDisplay = row.querySelector('.quantity-display');
        const quantityEdit = row.querySelector('.quantity-edit-panel');
        const quantityInput = quantityEdit.querySelector('.quantity-input');
        const currentValue = row.querySelector('.quantity-value').textContent.trim();

        quantityDisplay.style.display = 'none';
        quantityEdit.style.display = 'block';
        quantityInput.value = currentValue;

        setTimeout(() => {
            quantityInput.focus();
            quantityInput.select();
        }, 100);
    }

    cancelQuantityEdit(row) {
        const quantityDisplay = row.querySelector('.quantity-display');
        const quantityEdit = row.querySelector('.quantity-edit-panel');

        quantityDisplay.style.display = 'flex';
        quantityEdit.style.display = 'none';
    }

    async updateQuantity(row) {
        const productId = row.getAttribute('data-product-id');
        const quantityInput = row.querySelector('.quantity-input');
        const newQuantity = parseInt(quantityInput.value);
        const originalQuantity = parseInt(row.querySelector('.quantity-value').textContent);

        if (!newQuantity || newQuantity < 1) {
            this.showToast('error', 'Грешка', 'Количеството трябва да бъде поне 1');
            return;
        }

        const orderId = this.getOrderId();
        const updateBtn = row.querySelector('.update-quantity-btn');

        try {
            // Show loader
            window.universalLoader?.show('Обновяване на количеството...', 'Запазване на промените');
            updateBtn.disabled = true;
            updateBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Обновява...';

            // API call
            const response = await fetch(`/api/orders/${orderId}/items/${productId}/quantity`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    [this.csrfHeader]: this.csrfToken
                },
                body: `quantity=${newQuantity}`
            });

            const result = await response.json();

            if (result.success) {
                // Update UI
                row.querySelector('.quantity-value').textContent = newQuantity;
                this.cancelQuantityEdit(row);
                this.showToast('success', 'Успешно', 'Количеството е обновено');

                // Reload page to refresh totals
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                // Show error from backend
                this.showToast('error', 'Грешка', result.message);
                // Reset to original value
                quantityInput.value = originalQuantity;
            }
        } catch (error) {
            console.error('Update quantity error:', error);
            this.showToast('error', 'Грешка', 'Възникна грешка при обновяването');
            quantityInput.value = originalQuantity;
        } finally {
            // Hide loader and reset button
            window.universalLoader?.hide();
            updateBtn.disabled = false;
            updateBtn.innerHTML = '<i class="bi bi-check"></i> Обнови';
        }
    }

    setupRemoveButtons() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.remove-item-btn')) {
                const row = e.target.closest('.item-row');
                this.confirmRemoveItem(row);
            }
        });
    }

    confirmRemoveItem(row) {
        const productName = row.querySelector('.product-name').textContent;
        const productSku = row.querySelector('.product-sku').textContent;

        const isConfirmed = confirm(
            `Сигурни ли сте, че искате да премахнете:\n\n${productName} (${productSku})\n\nТова действие не може да бъде отменено.`
        );

        if (isConfirmed) {
            this.removeItem(row);
        }
    }

    async removeItem(row) {
        const productId = row.getAttribute('data-product-id');
        const orderId = this.getOrderId();
        const removeBtn = row.querySelector('.remove-item-btn');

        try {
            // Show loader
            window.universalLoader?.show('Премахване на артикула...', 'Моля изчакайте');
            removeBtn.disabled = true;
            removeBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Премахва...';

            // API call
            const response = await fetch(`/api/orders/${orderId}/items/${productId}`, {
                method: 'DELETE',
                headers: {
                    [this.csrfHeader]: this.csrfToken
                }
            });

            const result = await response.json();

            if (result.success) {
                // Animate removal
                row.style.transition = 'all 0.3s ease';
                row.style.opacity = '0';
                row.style.transform = 'translateX(100%)';

                setTimeout(() => {
                    this.showToast('success', 'Успешно', 'Артикулът е премахнат');
                    // Reload to refresh totals
                    window.location.reload();
                }, 300);
            } else {
                // Show error from backend
                this.showToast('error', 'Грешка', result.message);
            }
        } catch (error) {
            console.error('Remove item error:', error);
            this.showToast('error', 'Грешка', 'Възникна грешка при премахването');
        } finally {
            // Hide loader and reset button
            window.universalLoader?.hide();
            removeBtn.disabled = false;
            removeBtn.innerHTML = '<i class="bi bi-trash"></i> Премахни';
        }
    }

    getOrderId() {
        const pathParts = window.location.pathname.split('/');
        return pathParts[pathParts.length - 1];
    }

    showToast(type, title, message) {
        if (window.toastManager) {
            window.toastManager[type](message);
        } else {
            console.log(`${type.toUpperCase()}: ${title} - ${message}`);
            alert(`${title}: ${message}`);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Order Detail page loaded');
    window.orderDetailManager = new OrderDetailManager();
});