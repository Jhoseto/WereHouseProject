/**
 * SHIPPING API - DEDICATED API CLIENT FOR SHIPPING OPERATIONS
 * ==========================================================
 * Специализиран API клас само за shipping функционалност
 * Използва /shipping-order/** endpoints
 */

class ShippingApi {
    constructor() {
        this.baseUrl = '/shipping-order';
        this.csrfToken = document.querySelector('meta[name="_csrf"]')?.getAttribute('content') ||
            window.shippedOrderConfig?.csrfToken || '';
        this.csrfHeader = document.querySelector('meta[name="_csrf_header"]')?.getAttribute('content') ||
            window.shippedOrderConfig?.csrfHeader || 'X-CSRF-TOKEN';

        // Request cache for performance optimization
        this.cache = new Map();
        this.cacheTimeout = 60000; // 1 minute cache
    }

    /**
     * Make HTTP request with proper headers and error handling
     */
    async makeRequest(method, endpoint, data = null) {
        const url = `${this.baseUrl}${endpoint}`;

        const config = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                [this.csrfHeader]: this.csrfToken
            }
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return response;
        } catch (error) {
            console.error(`Shipping API request failed: ${method} ${url}`, error);
            throw error;
        }
    }

    /**
     * Get from cache if available and not expired
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    /**
     * Set cache entry
     */
    setCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    /**
     * Clear cache entries
     */
    clearCache(pattern = null) {
        if (pattern) {
            for (const [key] of this.cache) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.clear();
        }
    }

    // ==========================================
    // SHIPPING ORDER DETAILS API
    // ==========================================

    /**
     * Get order details for shipping interface
     */
    async getOrderDetails(orderId) {
        const cacheKey = `order_details_${orderId}`;
        const cached = this.getFromCache(cacheKey);

        if (cached) {
            return cached;
        }

        try {
            const response = await this.makeRequest('GET', `/${orderId}/details`);
            const data = await response.json();

            this.setCache(cacheKey, data);
            return data;
        } catch (error) {
            console.error(`Failed to get order details for ${orderId}:`, error);
            throw error;
        }
    }

    /**
     * Get shipping progress for order
     */
    async getShippingProgress(orderId) {
        try {
            const response = await this.makeRequest('GET', `/${orderId}/progress`);
            return await response.json();
        } catch (error) {
            console.error(`Failed to get shipping progress for ${orderId}:`, error);
            throw error;
        }
    }

    // ==========================================
    // ITEM LOADING MANAGEMENT API
    // ==========================================

    /**
     * Update single item loading status
     */
    async updateItemLoadingStatus(orderId, itemId, isLoaded, notes = null) {
        const data = {
            isLoaded: isLoaded,
            notes: notes,
            timestamp: new Date().toISOString()
        };

        try {
            const response = await this.makeRequest('PUT', `/${orderId}/item/${itemId}/loading-status`, data);
            const result = await response.json();

            // Clear relevant cache
            this.clearCache(`order_${orderId}`);

            return result;
        } catch (error) {
            console.error(`Failed to update loading status for item ${itemId}:`, error);
            throw error;
        }
    }

    /**
     * Batch update multiple items loading status
     */
    async batchUpdateItemsLoadingStatus(orderId, itemUpdates) {
        const data = {
            itemUpdates: itemUpdates,
            batchTimestamp: new Date().toISOString()
        };

        try {
            const response = await this.makeRequest('PUT', `/${orderId}/items/batch-loading-status`, data);
            const result = await response.json();

            // Clear relevant cache
            this.clearCache(`order_${orderId}`);

            return result;
        } catch (error) {
            console.error(`Failed to batch update items for order ${orderId}:`, error);
            throw error;
        }
    }

    // ==========================================
    // ORDER SHIPPING COMPLETION API
    // ==========================================

    /**
     * Mark order as shipped (complete shipping process)
     */
    async markOrderAsShipped(orderId, shippingNotes = null) {
        const data = {
            shippingNotes: shippingNotes,
            shippedAt: new Date().toISOString()
        };

        try {
            const response = await this.makeRequest('PUT', `/${orderId}/mark-shipped`, data);
            const result = await response.json();

            // Clear all cache since order status changed
            this.clearCache();

            return result;
        } catch (error) {
            console.error(`Failed to mark order ${orderId} as shipped:`, error);
            throw error;
        }
    }

    /**
     * Cancel shipping for order
     */
    async cancelShipping(orderId, reason) {
        const data = {
            reason: reason,
            cancelledAt: new Date().toISOString()
        };

        try {
            const response = await this.makeRequest('PUT', `/${orderId}/cancel-shipping`, data);
            const result = await response.json();

            // Clear all cache since order status changed
            this.clearCache();

            return result;
        } catch (error) {
            console.error(`Failed to cancel shipping for order ${orderId}:`, error);
            throw error;
        }
    }

    // ==========================================
    // SHIPPING NOTES API
    // ==========================================

    /**
     * Add shipping note to order
     */
    async addShippingNote(orderId, note) {
        const data = {
            note: note,
            addedAt: new Date().toISOString()
        };

        try {
            const response = await this.makeRequest('POST', `/${orderId}/shipping-note`, data);
            const result = await response.json();

            // Clear order cache
            this.clearCache(`order_${orderId}`);

            return result;
        } catch (error) {
            console.error(`Failed to add shipping note to order ${orderId}:`, error);
            throw error;
        }
    }

    // ==========================================
    // SHIPPING STATISTICS API
    // ==========================================

    /**
     * Get shipping statistics
     */
    async getShippingStatistics(timeframe = 'today') {
        const cacheKey = `shipping_stats_${timeframe}`;
        const cached = this.getFromCache(cacheKey);

        if (cached) {
            return cached;
        }

        try {
            const response = await this.makeRequest('GET', `/statistics?timeframe=${timeframe}`);
            const data = await response.json();

            this.setCache(cacheKey, data);
            return data;
        } catch (error) {
            console.error(`Failed to get shipping statistics for ${timeframe}:`, error);
            throw error;
        }
    }

    /**
     * Get orders ready for shipping
     */
    async getOrdersReadyForShipping(limit = 20, offset = 0) {
        const cacheKey = `ready_orders_${limit}_${offset}`;
        const cached = this.getFromCache(cacheKey);

        if (cached) {
            return cached;
        }

        try {
            const response = await this.makeRequest('GET', `/ready?limit=${limit}&offset=${offset}`);
            const data = await response.json();

            this.setCache(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Failed to get orders ready for shipping:', error);
            throw error;
        }
    }

    // ==========================================
    // VALIDATION API
    // ==========================================

    /**
     * Validate order for shipping
     */
    async validateOrderForShipping(orderId) {
        try {
            const response = await this.makeRequest('GET', `/${orderId}/validate`);
            return await response.json();
        } catch (error) {
            console.error(`Failed to validate order ${orderId} for shipping:`, error);
            throw error;
        }
    }

    // ==========================================
    // MOBILE OPTIMIZATION METHODS
    // ==========================================

    /**
     * Preload data for better mobile performance
     */
    async preloadOrderData(orderId) {
        try {
            const promises = [
                this.getOrderDetails(orderId),
                this.getShippingProgress(orderId)
            ];

            await Promise.allSettled(promises);
            console.log(`Preloaded shipping data for order ${orderId}`);
        } catch (error) {
            console.warn(`Failed to preload data for order ${orderId}:`, error);
        }
    }

    /**
     * Retry mechanism for mobile connections
     */
    async retryRequest(requestFn, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await requestFn();
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }

                // Exponential backoff
                const delay = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));

                console.warn(`Retry attempt ${attempt}/${maxRetries} for shipping API request`);
            }
        }
    }

    /**
     * Check connection status
     */
    async checkConnection() {
        try {
            const response = await this.makeRequest('GET', '/health');
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    /**
     * Update CSRF token (for long-running sessions)
     */
    updateCsrfToken(token, header = null) {
        this.csrfToken = token;
        if (header) {
            this.csrfHeader = header;
        }
        console.log('CSRF token updated for shipping API');
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys())
        };
    }

    /**
     * Cleanup method
     */
    destroy() {
        this.clearCache();
        console.log('ShippingApi instance destroyed');
    }
}

// Export for global access
window.ShippingApi = ShippingApi;