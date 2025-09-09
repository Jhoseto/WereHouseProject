/**
 * DASHBOARD API - CENTRALIZED API COMMUNICATION
 * =============================================
 * Handles all server communication for the admin dashboard
 * Provides clean interface for data fetching and order operations
 * Integrates with centralized loader system and error handling
 */

class DashboardAPI {
    constructor(config = {}) {
        this.config = config;
        this.baseUrl = '/employer';

        // Default headers for all requests
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        };

        // Add CSRF token if available
        if (this.config.csrfToken && this.config.csrfHeader) {
            this.defaultHeaders[this.config.csrfHeader] = this.config.csrfToken;
        }
    }

    // ==========================================
    // CORE API METHODS
    // ==========================================

    /**
     * Generic API call method with centralized error handling
     * Uses project's loader system for consistent UX
     */
    async makeRequest(url, options = {}) {
        const {
            showLoader = true,
            loaderMessage = 'Обработка на заявката...',
            ...fetchOptions
        } = options;

        // Show loader for longer operations
        if (showLoader && window.LoaderManager) {
            window.LoaderManager.show(loaderMessage);
        }

        // Prepare request options
        const requestOptions = {
            method: 'GET',
            headers: { ...this.defaultHeaders },
            credentials: 'same-origin',
            ...fetchOptions
        };

        // Merge headers properly
        if (fetchOptions.headers) {
            requestOptions.headers = { ...this.defaultHeaders, ...fetchOptions.headers };
        }

        try {
            const response = await fetch(url, requestOptions);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Check if server returned success flag
            if (data.hasOwnProperty('success') && !data.success) {
                throw new Error(data.message || 'Server returned error');
            }

            return data;

        } catch (error) {
            console.error('API call failed:', error);

            // Show user-friendly error message
            const errorMessage = this.getErrorMessage(error);
            if (window.toastManager) {
                window.toastManager.show(errorMessage, 'error');
            }

            throw error;

        } finally {
            // Always hide loader
            if (showLoader && window.LoaderManager) {
                window.LoaderManager.hide();
            }
        }
    }

    /**
     * Convert error to user-friendly message
     */
    getErrorMessage(error) {
        if (error.message.includes('Failed to fetch')) {
            return 'Проблем с мрежовата връзка. Моля опитайте отново.';
        } else if (error.message.includes('500')) {
            return 'Вътрешна грешка на сървъра. Моля свържете се с администратор.';
        } else if (error.message.includes('403')) {
            return 'Нямате права за тази операция.';
        } else {
            return error.message || 'Възникна неочаквана грешка.';
        }
    }

    // ==========================================
    // DASHBOARD DATA ENDPOINTS
    // ==========================================

    /**
     * Get dashboard overview data (counters, statistics)
     * Used for initial page load and refresh operations
     */
    async getDashboardOverview() {
        return this.makeRequest(`${this.baseUrl}/dashboard/overview`, {
            loaderMessage: 'Зареждане на dashboard данни...'
        });
    }

    /**
     * Get orders filtered by status
     * Used for populating specific dashboard tabs
     */
    async getOrdersByStatus(status) {
        return this.makeRequest(`${this.baseUrl}/dashboard/orders/${status}`, {
            showLoader: false // Fast operation, no loader needed
        });
    }

    /**
     * Get detailed order information
     * Used when expanding order details
     */
    async getOrderDetails(orderId) {
        return this.makeRequest(`${this.baseUrl}/orders/${orderId}`, {
            loaderMessage: 'Зареждане на детайли...'
        });
    }

    // ==========================================
    // ORDER STATUS MANAGEMENT
    // ==========================================

    /**
     * Confirm an order (SUBMITTED → CONFIRMED)
     */
    async confirmOrder(orderId) {
        return this.makeRequest(`${this.baseUrl}/orders/${orderId}/confirm`, {
            method: 'POST',
            loaderMessage: `Потвърждаване на поръчка #${orderId}...`
        });
    }

    /**
     * Start picking process (CONFIRMED → PICKED)
     */
    async startPicking(orderId) {
        return this.makeRequest(`${this.baseUrl}/orders/${orderId}/pick`, {
            method: 'POST',
            loaderMessage: `Започване на пикинг за поръчка #${orderId}...`
        });
    }

    /**
     * Ship an order (PICKED → SHIPPED)
     */
    async shipOrder(orderId) {
        return this.makeRequest(`${this.baseUrl}/orders/${orderId}/ship`, {
            method: 'POST',
            loaderMessage: `Изпращане на поръчка #${orderId}...`
        });
    }

    /**
     * Cancel an order with reason
     */
    async cancelOrder(orderId, reason) {
        return this.makeRequest(`${this.baseUrl}/orders/${orderId}/cancel`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
            loaderMessage: `Отказване на поръчка #${orderId}...`
        });
    }

    // ==========================================
    // PRODUCT MANAGEMENT
    // ==========================================

    /**
     * Update product quantity in an order
     */
    async updateProductQuantity(orderId, productId, quantity) {
        return this.makeRequest(`${this.baseUrl}/orders/${orderId}/items/${productId}/quantity`, {
            method: 'POST',
            body: JSON.stringify({ quantity }),
            showLoader: false, // Quick operation
            loaderMessage: 'Обновяване на количество...'
        });
    }

    /**
     * Approve a product in an order
     */
    async approveProduct(orderId, productId) {
        return this.makeRequest(`${this.baseUrl}/orders/${orderId}/items/${productId}/approve`, {
            method: 'POST',
            showLoader: false,
            loaderMessage: 'Одобряване на продукт...'
        });
    }

    /**
     * Reject a product in an order with reason
     */
    async rejectProduct(orderId, productId, reason) {
        return this.makeRequest(`${this.baseUrl}/orders/${orderId}/items/${productId}/reject`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
            loaderMessage: 'Отказване на продукт...'
        });
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    /**
     * Quick method to show success message
     */
    showSuccess(message) {
        if (window.toastManager) {
            window.toastManager.show(message, 'success');
        }
    }

    /**
     * Quick method to show info message
     */
    showInfo(message) {
        if (window.toastManager) {
            window.toastManager.show(message, 'info');
        }
    }

    /**
     * Quick method to show warning message
     */
    showWarning(message) {
        if (window.toastManager) {
            window.toastManager.show(message, 'warning');
        }
    }

    // ==========================================
    // BATCH OPERATIONS (Future expansion)
    // ==========================================

    /**
     * Process multiple orders at once
     * Useful for batch operations in the future
     */
    async batchUpdateOrders(orderIds, action, data = {}) {
        return this.makeRequest(`${this.baseUrl}/orders/batch/${action}`, {
            method: 'POST',
            body: JSON.stringify({ orderIds, ...data }),
            loaderMessage: `Обработка на ${orderIds.length} поръчки...`
        });
    }

    /**
     * Export orders data
     * For future reporting functionality
     */
    async exportOrders(filters = {}) {
        return this.makeRequest(`${this.baseUrl}/orders/export`, {
            method: 'POST',
            body: JSON.stringify(filters),
            loaderMessage: 'Генериране на отчет...'
        });
    }
}

// Export for use in other modules
window.DashboardAPI = DashboardAPI;