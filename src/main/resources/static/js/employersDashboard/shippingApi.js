/**
 * SHIPPING API - ENDPOINT MANAGEMENT LAYER
 * =======================================
 * Централизиран слой за управление на всички API заявки свързани със shipping операции.
 * Интегрира се с DashboardBroadcastService за real-time functionality.
 * Адаптиран от order-review архитектурата с фокус върху warehouse loading tracking.
 */

class ShippingApi {
    constructor() {
        // Основна конфигурация
        this.config = window.shippedOrderConfig || {};
        this.orderId = this.config.orderId;

        // API base paths
        this.basePath = '/employer/shipped';

        // WebSocket интеграция за real-time updates
        this.websocket = {
            enabled: this.config.websocket?.enabled || false,
            progressTopic: this.config.websocket?.progressTopic,
            statusTopic: this.config.websocket?.statusTopic,
            connection: null,
            subscribers: new Map()
        };

        // Headers за заявки
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            [this.config.csrfHeader]: this.config.csrfToken
        };

        // Event listeners tracking
        this.eventListeners = new Map();

        // Initialize WebSocket ако е enabled
        this.initializeWebSocket();

        console.log('ShippingApi инициализиран за поръчка:', this.orderId);
    }

    /**
     * CORE API METHODS - ОСНОВНИ ЗАЯВКИ
     * ================================
     */

    /**
     * Зарежда пълната информация за shipping order
     * Включва order details, client info и всички items
     */
    async loadShippingOrderData() {
        try {
            console.log(`📦 Зареждане на shipping данни за поръчка ${this.orderId}`);

            const response = await fetch(`${this.basePath}/order/${this.orderId}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    [this.config.csrfHeader]: this.config.csrfToken
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success && data.order) {
                console.log(`✅ Успешно заредени данни за поръчка ${this.orderId}`);

                // Transform data за по-лесно използване
                const transformedData = this.transformOrderData(data);

                // Broadcast заредените данни ако има WebSocket
                this.broadcastDataLoaded(transformedData);

                return {
                    success: true,
                    data: transformedData,
                    message: 'Данните са заредени успешно'
                };
            } else {
                throw new Error(data.message || 'Неуспешно зареждане на данните');
            }

        } catch (error) {
            console.error(`❌ Грешка при зареждане на shipping данни:`, error);
            return {
                success: false,
                error: error.message,
                message: 'Неуспешно зареждане. Моля опитайте отново.'
            };
        }
    }

    /**
     * Потвърждава завършването на shipping операцията
     * Променя статуса от CONFIRMED към SHIPPED
     */
    async confirmShipping(truckNumber, shippingNote = null, loadedItems = []) {
        try {
            console.log(`🚛 Потвърждаване на shipping за поръчка ${this.orderId}`);

            if (!truckNumber || truckNumber.trim().length === 0) {
                throw new Error('Номерът на камиона е задължителен');
            }

            const requestData = {
                truckNumber: truckNumber.trim(),
                shippingNote: shippingNote?.trim() || null,
                loadedItems: loadedItems || [],
                timestamp: new Date().toISOString()
            };

            const response = await fetch(`${this.basePath}/confirm/${this.orderId}`, {
                method: 'POST',
                headers: this.defaultHeaders,
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.success) {
                console.log(`✅ Поръчка ${this.orderId} успешно потвърдена като изпратена`);

                // Broadcast shipping confirmed event
                this.broadcastShippingConfirmed(requestData);

                return {
                    success: true,
                    orderId: this.orderId,
                    truckNumber: requestData.truckNumber,
                    newStatus: 'SHIPPED',
                    message: result.message || 'Поръчката е успешно изпратена'
                };
            } else {
                throw new Error(result.message || 'Неуспешно потвърждаване');
            }

        } catch (error) {
            console.error(`❌ Грешка при потвърждаване на shipping:`, error);
            return {
                success: false,
                error: error.message,
                message: 'Неуспешно потвърждаване. Моля проверете данните и опитайте отново.'
            };
        }
    }

    /**
     * REAL-TIME PROGRESS TRACKING
     * ==========================
     */

    /**
     * Изпраща real-time update за item loading status
     * Използва се когато warehouse служител маркира item като зареден
     */
    async updateItemLoadingStatus(itemId, isLoaded, progressData = null) {
        try {
            // Локално update за моментален feedback
            this.broadcastItemStatusUpdate(itemId, isLoaded, progressData);

            // Ако има WebSocket връзка, изпрати update на сървъра
            if (this.websocket.enabled && this.websocket.connection) {
                const updateData = {
                    orderId: this.orderId,
                    itemId: itemId,
                    isLoaded: isLoaded,
                    timestamp: new Date().toISOString(),
                    progressData: progressData
                };

                // Send чрез WebSocket за real-time sync
                this.websocket.connection.send(
                    '/app/shipping/item-status',
                    {},
                    JSON.stringify(updateData)
                );

                console.log(`📡 Real-time update изпратен за item ${itemId}: ${isLoaded ? 'loaded' : 'unloaded'}`);
            }

            return { success: true };

        } catch (error) {
            console.error(`❌ Грешка при real-time update:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Получава real-time progress updates от други clients
     * Автоматично synchronизира loading status между devices
     */
    subscribeToProgressUpdates(callback) {
        if (!this.websocket.enabled) {
            console.warn('WebSocket не е активиран за real-time updates');
            return () => {}; // Return empty unsubscribe function
        }

        const subscriptionId = `progress_${Date.now()}_${Math.random()}`;
        this.websocket.subscribers.set(subscriptionId, callback);

        console.log(`📡 Абониране за real-time progress updates с ID: ${subscriptionId}`);

        // Return unsubscribe function
        return () => {
            this.websocket.subscribers.delete(subscriptionId);
            console.log(`📡 Отписване от progress updates: ${subscriptionId}`);
        };
    }

    /**
     * WEBSOCKET INTEGRATION
     * ====================
     */

    /**
     * Initialize WebSocket връзка за real-time functionality
     * Интегрира се със съществуващия DashboardBroadcastService
     */
    initializeWebSocket() {
        if (!this.websocket.enabled) {
            console.log('WebSocket интеграция е деактивирана');
            return;
        }

        try {
            // Използваме глобалния WebSocket connection ако е наличен
            if (window.stompClient && window.stompClient.connected) {
                this.websocket.connection = window.stompClient;
                this.setupWebSocketSubscriptions();
                console.log('✅ Използване на съществуваща WebSocket връзка');
            } else {
                // Изчакваме глобалната WebSocket връзка да се установи
                this.waitForWebSocketConnection();
            }

        } catch (error) {
            console.error('❌ Грешка при WebSocket инициализация:', error);
            this.websocket.enabled = false;
        }
    }

    /**
     * Изчаква установяването на глобална WebSocket връзка
     */
    waitForWebSocketConnection() {
        let attempts = 0;
        const maxAttempts = 10;
        const checkInterval = 1000; // 1 секунда

        const checkConnection = () => {
            attempts++;

            if (window.stompClient && window.stompClient.connected) {
                this.websocket.connection = window.stompClient;
                this.setupWebSocketSubscriptions();
                console.log('✅ WebSocket връзка установена след', attempts, 'опити');
            } else if (attempts < maxAttempts) {
                setTimeout(checkConnection, checkInterval);
            } else {
                console.warn('⚠️ WebSocket връзка не може да се установи - real-time функциите са деактивирани');
                this.websocket.enabled = false;
            }
        };

        setTimeout(checkConnection, checkInterval);
    }

    /**
     * Setup WebSocket subscriptions за shipping events
     */
    setupWebSocketSubscriptions() {
        if (!this.websocket.connection || !this.websocket.progressTopic) {
            return;
        }

        try {
            // Subscribe за progress updates
            this.websocket.connection.subscribe(this.websocket.progressTopic, (message) => {
                const progressData = JSON.parse(message.body);
                this.handleProgressUpdate(progressData);
            });

            // Subscribe за status updates
            if (this.websocket.statusTopic) {
                this.websocket.connection.subscribe(this.websocket.statusTopic, (message) => {
                    const statusData = JSON.parse(message.body);
                    this.handleStatusUpdate(statusData);
                });
            }

            console.log('✅ WebSocket subscriptions setup успешен');

        } catch (error) {
            console.error('❌ Грешка при WebSocket subscriptions:', error);
        }
    }

    /**
     * Handle incoming progress updates от WebSocket
     */
    handleProgressUpdate(progressData) {
        console.log('📡 Получен progress update:', progressData);

        // Notify всички subscribers
        this.websocket.subscribers.forEach(callback => {
            try {
                callback(progressData);
            } catch (error) {
                console.error('❌ Грешка в progress update callback:', error);
            }
        });
    }

    /**
     * Handle incoming status updates от WebSocket
     */
    handleStatusUpdate(statusData) {
        console.log('📡 Получен status update:', statusData);

        // Broadcast status change към UI components
        if (window.toastManager && statusData.message) {
            window.toastManager.info(statusData.message, 'Status Update');
        }
    }

    /**
     * BROADCASTING METHODS - ЛОКАЛНИ EVENTS
     * ====================================
     */

    /**
     * Broadcast заредените данни към заинтересовани components
     */
    broadcastDataLoaded(data) {
        const event = new CustomEvent('shippingDataLoaded', {
            detail: { orderId: this.orderId, data: data }
        });
        document.dispatchEvent(event);
    }

    /**
     * Broadcast item status update към UI components
     */
    broadcastItemStatusUpdate(itemId, isLoaded, progressData) {
        const event = new CustomEvent('shippingItemStatusUpdate', {
            detail: {
                orderId: this.orderId,
                itemId: itemId,
                isLoaded: isLoaded,
                progressData: progressData,
                timestamp: new Date().toISOString()
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Broadcast shipping confirmed event
     */
    broadcastShippingConfirmed(shippingData) {
        const event = new CustomEvent('shippingConfirmed', {
            detail: { orderId: this.orderId, shippingData: shippingData }
        });
        document.dispatchEvent(event);
    }

    /**
     * UTILITY METHODS
     * ==============
     */

    /**
     * Transform raw order data за по-удобно използване в UI
     */
    /**
     * Transform raw order data за по-удобно използване в UI
     */
    transformOrderData(rawData) {
        const order = rawData.order;
        const items = order.items || [];

        return {
            order: {
                id: order.id,
                status: order.status,
                clientId: order.clientId,
                clientName: order.clientName,
                clientCompany: order.clientCompany,
                totalNet: order.totalNet,
                totalVat: order.totalVat,
                totalGross: order.totalGross,
                submittedAt: order.submittedAt,
                confirmedAt: order.confirmedAt
            },
            client: rawData.client || null,
            items: items.map(item => ({
                id: item.id || 0,
                productId: item.productId || 0,
                productName: item.productName || 'Неизвестен продукт',
                productCategory: item.category || 'Без категория',
                // ПОПРАВКА: Премахваме .intValue() защото това е JavaScript, не Java
                quantity: typeof item.quantity === 'number' ? item.quantity :
                    (item.quantity ? Number(item.quantity) : 0),
                // ПОПРАВКА: Използваме 'price' полето от OrderMapper вместо 'pricePerUnit'
                pricePerUnit: typeof item.price === 'number' ? item.price :
                    (item.price ? Number(item.price) : 0),
                totalPrice: typeof item.totalPrice === 'number' ? item.totalPrice :
                    (item.totalPrice ? Number(item.totalPrice) : 0),
                isLoaded: false // Default loading status
            })),
            statistics: {
                totalItems: items.length,
                loadedItems: 0,
                remainingItems: items.length,
                completionPercentage: 0
            }
        };
    }

    /**
     * Calculate loading progress statistics
     */
    calculateProgressStatistics(loadedItemsSet, totalItems) {
        const loadedCount = loadedItemsSet.size;
        const remainingCount = totalItems - loadedCount;
        const percentage = totalItems > 0 ? Math.round((loadedCount / totalItems) * 100) : 0;

        return {
            totalItems: totalItems,
            loadedItems: loadedCount,
            remainingItems: remainingCount,
            completionPercentage: percentage,
            isCompleted: loadedCount === totalItems && totalItems > 0
        };
    }

    /**
     * Validate truck number format
     */
    validateTruckNumber(truckNumber) {
        if (!truckNumber || typeof truckNumber !== 'string') {
            return { valid: false, error: 'Номерът на камиона е задължителен' };
        }

        const trimmed = truckNumber.trim();

        if (trimmed.length < 4) {
            return { valid: false, error: 'Номерът на камиона трябва да е поне 4 символа' };
        }

        if (trimmed.length > 12) {
            return { valid: false, error: 'Номерът на камиона не може да е повече от 12 символа' };
        }

        // Basic format validation (можа да се разшири)
        const validPattern = /^[A-Z0-9\s\-]+$/i;
        if (!validPattern.test(trimmed)) {
            return { valid: false, error: 'Номерът съдържа невалидни символи' };
        }

        return { valid: true, truckNumber: trimmed };
    }

    /**
     * Get shipping validation requirements
     */
    getShippingValidationRequirements() {
        return {
            truckNumberRequired: true,
            allItemsMustBeLoaded: true,
            shippingNoteOptional: true
        };
    }

    /**
     * Cleanup method за освобождаване на resources
     */
    destroy() {
        // Clear WebSocket subscriptions
        this.websocket.subscribers.clear();

        // Remove event listeners
        this.eventListeners.clear();

        // Clear connection reference
        this.websocket.connection = null;

        console.log('🧹 ShippingApi cleanup завършен');
    }

    /**
     * COMPATIBILITY METHODS - За backward compatibility
     * =================================================
     */

    /**
     * Alias method за legacy code compatibility
     */
    async getOrderDetails() {
        return await this.loadShippingOrderData();
    }

    /**
     * Alias method за legacy code compatibility
     */
    async submitShipping(data) {
        return await this.confirmShipping(
            data.truckNumber,
            data.shippingNote,
            data.loadedItems
        );
    }
}

// ==========================================
// ГЛОБАЛНА ИНИЦИАЛИЗАЦИЯ И EXPORT
// ==========================================

/**
 * Auto-initialize ако window.shippedOrderConfig съществува
 */
if (typeof window !== 'undefined' && window.shippedOrderConfig) {
    // Export class globally за използване в други scripts
    window.ShippingApi = ShippingApi;

    console.log('✅ ShippingApi class регистриран глобално');
}

// ES6 Module Export ако е поддържан
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShippingApi;
}
