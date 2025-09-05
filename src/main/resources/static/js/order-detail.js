/**
 * Order Detail Management System
 * Управлява редактирането и функционалността на страницата с детайли за поръчка
 */

class OrderDetailManager {
    constructor() {
        this.isEditMode = false;
        this.pendingChanges = new Map();
        this.originalValues = new Map();
        this.csrfToken = window.csrfToken || '';
        this.csrfHeader = window.csrfHeader || 'X-CSRF-TOKEN';

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupCSRF();
        console.log('Order Detail Manager initialized');
    }

    setupEventListeners() {
        // Edit mode toggle
        const editToggle = document.getElementById('editModeToggle');
        if (editToggle) {
            editToggle.addEventListener('click', () => this.toggleEditMode());
        }

        // Exit edit mode from notice
        const exitEditMode = document.getElementById('exitEditMode');
        if (exitEditMode) {
            exitEditMode.addEventListener('click', () => this.exitEditMode());
        }

        // Quantity controls
        this.setupQuantityControls();

        // Remove item buttons
        this.setupRemoveButtons();

        // Save/Cancel buttons
        this.setupSaveButtons();

        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    setupCSRF() {
        // Enhanced CSRF token detection
        this.csrfToken = this.csrfToken ||
            document.querySelector('meta[name="_csrf"]')?.getAttribute('content') ||
            document.querySelector('input[name="_csrf"]')?.value ||
            '';

        this.csrfHeader = this.csrfHeader ||
            document.querySelector('meta[name="_csrf_header"]')?.getAttribute('content') ||
            'X-CSRF-TOKEN';
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Escape key to exit edit mode
            if (e.key === 'Escape' && this.isEditMode) {
                this.exitEditMode();
            }

            // Ctrl/Cmd + S to save changes
            if ((e.ctrlKey || e.metaKey) && e.key === 's' && this.isEditMode) {
                e.preventDefault();
                this.saveAllChanges();
            }
        });
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

        const editToggle = document.getElementById('editModeToggle');
        const editNotice = document.getElementById('editModeNotice');
        const saveSection = document.getElementById('saveChangesSection');

        // Update UI elements
        if (editToggle) {
            editToggle.classList.add('active');
            editToggle.querySelector('.edit-text').textContent = 'Изход';
            editToggle.querySelector('i').className = 'bi bi-x-circle';
        }

        if (editNotice) {
            editNotice.style.display = 'block';
            setTimeout(() => editNotice.classList.add('show'), 10);
        }

        // Show edit columns and controls
        document.querySelectorAll('.edit-column').forEach(col => {
            col.style.display = 'table-cell';
        });

        document.querySelectorAll('.item-actions').forEach(actions => {
            actions.style.display = 'flex';
        });

        if (saveSection) {
            saveSection.style.display = 'flex';
        }

        // Store original values for reset functionality
        this.storeOriginalValues();

        this.showToast('info', 'Режим на редактиране', 'Можете да променяте количествата и да премахвате артикули');
    }

    exitEditMode() {
        this.isEditMode = false;

        const editToggle = document.getElementById('editModeToggle');
        const editNotice = document.getElementById('editModeNotice');
        const saveSection = document.getElementById('saveChangesSection');

        // Update UI elements
        if (editToggle) {
            editToggle.classList.remove('active');
            editToggle.querySelector('.edit-text').textContent = 'Редактирай';
            editToggle.querySelector('i').className = 'bi bi-pencil-square';
        }

        if (editNotice) {
            editNotice.style.display = 'none';
        }

        // Hide edit columns and controls
        document.querySelectorAll('.edit-column').forEach(col => {
            col.style.display = 'none';
        });

        document.querySelectorAll('.quantity-edit-panel').forEach(panel => {
            panel.style.display = 'none';
        });

        document.querySelectorAll('.quantity-display').forEach(display => {
            display.style.display = 'flex';
        });

        if (saveSection) {
            saveSection.style.display = 'none';
        }

        // Clear pending changes
        this.pendingChanges.clear();
        this.originalValues.clear();
    }

    storeOriginalValues() {
        document.querySelectorAll('.item-row').forEach(row => {
            const productId = row.getAttribute('data-product-id');
            const quantityValue = row.querySelector('.quantity-value')?.textContent?.trim();
            if (productId && quantityValue) {
                this.originalValues.set(productId, parseInt(quantityValue));
            }
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

        // Quantity increase/decrease buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.quantity-increase')) {
                const input = e.target.closest('.quantity-controls').querySelector('.quantity-input');
                const currentValue = parseInt(input.value) || 1;
                input.value = Math.min(currentValue + 1, 999);
                this.highlightInput(input);
            }

            if (e.target.closest('.quantity-decrease')) {
                const input = e.target.closest('.quantity-controls').querySelector('.quantity-input');
                const currentValue = parseInt(input.value) || 1;
                input.value = Math.max(currentValue - 1, 1);
                this.highlightInput(input);
            }
        });

        // Update quantity buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.update-quantity-btn')) {
                const row = e.target.closest('.item-row');
                this.updateQuantity(row);
            }
        });

        // Cancel quantity edit buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.cancel-quantity-btn')) {
                const row = e.target.closest('.item-row');
                this.cancelQuantityEdit(row);
            }
        });

        // Input validation
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('quantity-input')) {
                this.validateQuantityInput(e.target);
            }
        });

        // Enter key to confirm quantity
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.classList.contains('quantity-input')) {
                e.preventDefault();
                const row = e.target.closest('.item-row');
                this.updateQuantity(row);
            }
        });
    }

    highlightInput(input) {
        input.style.background = '#e3f2fd';
        setTimeout(() => {
            input.style.background = '';
        }, 200);
    }

    validateQuantityInput(input) {
        const value = parseInt(input.value);
        const min = parseInt(input.getAttribute('min')) || 1;
        const max = parseInt(input.getAttribute('max')) || 999;

        if (isNaN(value) || value < min) {
            input.value = min;
        } else if (value > max) {
            input.value = max;
        }

        // Visual feedback for valid/invalid values
        if (value >= min && value <= max) {
            input.style.borderColor = '#28a745';
        } else {
            input.style.borderColor = '#dc3545';
        }
    }

    showQuantityEdit(row) {
        const quantityDisplay = row.querySelector('.quantity-display');
        const quantityEdit = row.querySelector('.quantity-edit-panel');
        const quantityInput = quantityEdit.querySelector('.quantity-input');
        const currentValue = row.querySelector('.quantity-value').textContent.trim();

        // Hide display, show edit panel
        quantityDisplay.style.display = 'none';
        quantityEdit.style.display = 'block';

        // Set current value and focus
        quantityInput.value = currentValue;
        setTimeout(() => {
            quantityInput.focus();
            quantityInput.select();
        }, 100);

        // Add animation
        quantityEdit.style.opacity = '0';
        quantityEdit.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            quantityEdit.style.transition = 'all 0.3s ease';
            quantityEdit.style.opacity = '1';
            quantityEdit.style.transform = 'translateY(0)';
        }, 10);
    }

    cancelQuantityEdit(row) {
        const quantityDisplay = row.querySelector('.quantity-display');
        const quantityEdit = row.querySelector('.quantity-edit-panel');

        // Animation out
        quantityEdit.style.transition = 'all 0.2s ease';
        quantityEdit.style.opacity = '0';
        quantityEdit.style.transform = 'translateY(-10px)';

        setTimeout(() => {
            quantityDisplay.style.display = 'flex';
            quantityEdit.style.display = 'none';
            quantityEdit.style.transition = '';
        }, 200);
    }

    async updateQuantity(row) {
        const productId = row.getAttribute('data-product-id');
        const quantityInput = row.querySelector('.quantity-input');
        const newQuantity = parseInt(quantityInput.value);

        if (!newQuantity || newQuantity < 1) {
            this.showToast('error', 'Грешка', 'Количеството трябва да бъде поне 1');
            return;
        }

        const orderId = this.getOrderId();
        const updateBtn = row.querySelector('.update-quantity-btn');

        try {
            // Disable button and show loading
            updateBtn.disabled = true;
            updateBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Обновява...';

            this.showLoading(true);

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
                // Update the display
                row.querySelector('.quantity-value').textContent = newQuantity;
                this.cancelQuantityEdit(row);
                this.recalculateItemTotal(row);
                this.showToast('success', 'Успешно', 'Количеството е обновено');

                // Refresh page to update totals after a short delay
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                throw new Error(result.message || 'Грешка при обновяване на количеството');
            }
        } catch (error) {
            console.error('Error updating quantity:', error);
            this.showToast('error', 'Грешка', error.message || 'Възникна грешка при обновяването');
        } finally {
            // Re-enable button
            updateBtn.disabled = false;
            updateBtn.innerHTML = '<i class="bi bi-check"></i> Обнови';
            this.showLoading(false);
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

        // Enhanced confirmation dialog
        const isConfirmed = confirm(
            `Сигурни ли сте, че искате да премахнете следния артикул от поръчката?\n\n` +
            `${productName} (${productSku})\n\n` +
            `Това действие не може да бъде отменено.`
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
            // Disable button and show loading
            removeBtn.disabled = true;
            removeBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Премахва...';

            this.showLoading(true);

            const response = await fetch(`/api/orders/${orderId}/items/${productId}`, {
                method: 'DELETE',
                headers: {
                    [this.csrfHeader]: this.csrfToken
                }
            });

            const result = await response.json();

            if (result.success) {
                // Animate row removal
                row.style.transition = 'all 0.3s ease';
                row.style.opacity = '0';
                row.style.transform = 'translateX(-20px)';

                this.showToast('success', 'Успешно', 'Артикулът е премахнат');

                // Refresh page after animation
                setTimeout(() => {
                    window.location.reload();
                }, 800);
            } else {
                throw new Error(result.message || 'Грешка при премахване на артикула');
            }
        } catch (error) {
            console.error('Error removing item:', error);
            this.showToast('error', 'Грешка', error.message || 'Възникна грешка при премахването');

            // Re-enable button
            removeBtn.disabled = false;
            removeBtn.innerHTML = '<i class="bi bi-trash"></i> Премахни';
        } finally {
            this.showLoading(false);
        }
    }

    setupSaveButtons() {
        const saveBtn = document.getElementById('saveAllChanges');
        const cancelBtn = document.getElementById('cancelAllChanges');

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveAllChanges());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.cancelAllChanges());
        }
    }

    async saveAllChanges() {
        if (this.pendingChanges.size === 0) {
            this.showToast('info', 'Информация', 'Няма промени за запазване');
            return;
        }

        // For now, we'll just exit edit mode since individual changes are saved immediately
        this.showToast('success', 'Успешно', 'Всички промени са запазени');
        this.exitEditMode();
    }

    cancelAllChanges() {
        const hasChanges = this.pendingChanges.size > 0;
        const confirmMessage = hasChanges
            ? 'Сигурни ли сте, че искате да отмените всички промени?'
            : 'Излизане от режим на редактиране?';

        if (confirm(confirmMessage)) {
            this.exitEditMode();
            this.showToast('info', 'Отменено', 'Всички промени са отменени');
        }
    }

    recalculateItemTotal(row) {
        const quantity = parseInt(row.querySelector('.quantity-value').textContent);
        const unitPriceText = row.querySelector('.unit-price').textContent;
        const unitPrice = parseFloat(unitPriceText.replace(' лв', '').replace(',', '.'));
        const total = (quantity * unitPrice).toFixed(2);

        const itemTotalElement = row.querySelector('.item-total');
        itemTotalElement.textContent = total + ' лв';

        // Add visual feedback
        itemTotalElement.style.background = '#e8f5e8';
        setTimeout(() => {
            itemTotalElement.style.background = '';
        }, 1000);
    }

    getOrderId() {
        // Extract order ID from URL
        const pathParts = window.location.pathname.split('/');
        return pathParts[pathParts.length - 1];
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            if (show) {
                overlay.style.display = 'flex';
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.style.transition = 'opacity 0.3s ease';
                    overlay.style.opacity = '1';
                }, 10);
            } else {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.style.display = 'none';
                    overlay.style.transition = '';
                }, 300);
            }
        }
    }

    showToast(type, title, message, duration = 4000) {
        // Use the existing toast system if available
        if (window.Toast && window.Toast[type]) {
            window.Toast[type](title, message, duration);
        } else {
            // Fallback to console and alert
            console.log(`${type.toUpperCase()}: ${title} - ${message}`);

            // Simple fallback notification
            const notification = document.createElement('div');
            notification.className = `toast-fallback toast-${type}`;
            notification.innerHTML = `
                <strong>${title}</strong><br>
                ${message}
            `;

            // Style the fallback
            Object.assign(notification.style, {
                position: 'fixed',
                top: '20px',
                right: '20px',
                padding: '15px 20px',
                borderRadius: '8px',
                color: 'white',
                fontWeight: '500',
                zIndex: '10000',
                maxWidth: '350px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                background: type === 'success' ? '#28a745' :
                    type === 'error' ? '#dc3545' :
                        type === 'warning' ? '#ffc107' : '#17a2b8'
            });

            document.body.appendChild(notification);

            // Auto remove
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 300);
            }, duration);
        }
    }

    // Utility functions
    formatPrice(price) {
        return parseFloat(price).toFixed(2);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Order Detail page loaded');

    // Initialize the order detail manager
    window.orderDetailManager = new OrderDetailManager();
});

// Export for testing or external use
window.OrderDetailManager = OrderDetailManager;