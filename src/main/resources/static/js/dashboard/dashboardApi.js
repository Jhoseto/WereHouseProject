/**
 * DASHBOARD API - HTTP CLIENT & WEBSOCKET MANAGER
 * ==============================================
 * Управлява цялата комуникация между frontend и backend.
 * Включва HTTP заявки за CRUD операции и WebSocket за real-time updates.
 *
 * Основни отговорности:
 * - HTTP client за всички dashboard операции
 * - WebSocket connection management за real-time events
 * - Error handling и retry логика
 * - CSRF token управление
 * - Request/Response caching за performance
 */

class DashboardApi {
    constructor() {
        // Configuration
        this.baseUrl = '/employer/dashboard';
        this.wsUrl = this.getWebSocketUrl();

        // HTTP client settings
        this.csrfToken = window.csrfToken || '';
        this.csrfHeader = window.csrfHeader || 'X-CSRF-TOKEN';

        // WebSocket connection management
        this.ws = null;
        this.wsConnected = false;
        this.wsReconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;

        // Event callbacks - set by DashboardManager
        this.onCountersUpdate = null;
        this.onOrderUpdate = null;
        this.onNewOrder = null;
        this.onConnectionStatus = null;

        // Request caching for performance
        this.cache = new Map();
        this.cacheTimeout = 30000; // 30 seconds

        console.log('DashboardApi initialized');
    }

    // ==========================================
    // INITIALIZATION & CONNECTION MANAGEMENT
    // ==========================================

    /**
     * Initialize API client and establish connections
     */
    async initialize() {
        try {
            console.log('=== DashboardApi Initialization ===');

            // Validate CSRF token
            if (!this.csrfToken) {
                throw new Error('CSRF token не е намерен');
            }

            // Establish WebSocket connection for real-time updates
            await this.connectWebSocket();

            console.log('✓ DashboardApi initialized successfully');
            return true;

        } catch (error) {
            console.error('Failed to initialize DashboardApi:', error);
            return false;
        }
    }

    /**
     * Get WebSocket URL based on current location
     */
    getWebSocketUrl() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        return `${protocol}//${host}/ws/dashboard`;
    }

    /**
     * Establish WebSocket connection using SockJS and STOMP for enterprise-grade reliability
     */
    async connectWebSocket() {
        try {
            console.log('Connecting to WebSocket with SockJS/STOMP:', this.wsUrl);

            // Проверка дали SockJS и Stomp библиотеките са заредени
            if (typeof SockJS === 'undefined') {
                throw new Error('SockJS библиотеката не е заредена. Проверете bottomHtmlImports фрагмента.');
            }

            if (typeof StompJs === 'undefined') {
                throw new Error('STOMP библиотеката не е заредена. Проверете bottomHtmlImports фрагмента.');
            }

            // Създаване на SockJS connection към правилния endpoint
            // SockJS автоматично добавя необходимите path suffixes за transport negotiation
            const sockJSUrl = this.wsUrl.replace('ws://', 'http://').replace('wss://', 'https://');
            this.sockjs = new SockJS(sockJSUrl);

            // Създаване на STOMP client over SockJS
            this.stompClient = StompJs.Stomp.over(this.sockjs);

            // Конфигуриране на STOMP client за production readiness
            this.configureStompClient();

            // Установяване на STOMP connection
            await this.connectStomp();

        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            throw error;
        }
    }

    /**
     * Configure STOMP client for optimal performance and debugging
     */
    configureStompClient() {
        // Debug mode за development - можете да го изключите в production
        this.stompClient.debug = (message) => {
            console.log('STOMP Debug:', message);
        };

        // Heartbeat configuration за connection health monitoring
        // Изпраща heartbeat на всеки 10 секунди, очаква от сървъра на всеки 10 секунди
        this.stompClient.heartbeat.outgoing = 10000;
        this.stompClient.heartbeat.incoming = 10000;

        // Connection timeout - ако не се свърже в 15 секунди, счита се за неуспешна
        this.stompClient.connectionTimeout = 15000;

        console.log('✓ STOMP client configured for dashboard communication');
    }

    /**
     * Connect STOMP client with proper authentication and error handling
     */
    async connectStomp() {
        return new Promise((resolve, reject) => {
            console.log('Establishing STOMP connection over SockJS...');

            // STOMP connection headers - може да включват authentication info
            const connectHeaders = {
                // Може да добавите authentication headers тук ако е необходимо
                // 'Authorization': 'Bearer ' + token,
                // 'X-CSRF-TOKEN': this.csrfToken
            };

            // Success callback - извиква се при успешна връзка
            const onConnect = (frame) => {
                console.log('✓ STOMP connected successfully');
                console.log('STOMP Server Info:', frame.headers);

                this.wsConnected = true;
                this.wsReconnectAttempts = 0;

                // Subscribe to dashboard channels след успешна връзка
                this.subscribeToChannels();

                // Notify connection status callbacks
                if (this.onConnectionStatus) {
                    this.onConnectionStatus(true);
                }

                resolve();
            };

            // Error callback - извиква се при connection failure
            const onError = (error) => {
                console.error('STOMP connection failed:', error);
                this.wsConnected = false;

                // Notify connection status callbacks
                if (this.onConnectionStatus) {
                    this.onConnectionStatus(false);
                }

                // Schedule reconnection attempt
                if (this.wsReconnectAttempts < this.maxReconnectAttempts) {
                    this.scheduleReconnect();
                    // Don't reject immediately - let reconnection logic handle it
                    resolve(); // Resolve but with failed state
                } else {
                    reject(error);
                }
            };

            // SockJS connection event handlers
            this.sockjs.onclose = (event) => {
                console.log('SockJS connection closed:', event.code, event.reason);
                this.wsConnected = false;

                if (this.onConnectionStatus) {
                    this.onConnectionStatus(false);
                }

                // Auto-reconnect unless it's an intentional disconnect
                if (event.code !== 1000 && this.wsReconnectAttempts < this.maxReconnectAttempts) {
                    this.scheduleReconnect();
                }
            };

            // Initiate STOMP connection
            this.stompClient.connect(connectHeaders, onConnect, onError);
        });
    }

    /**
     * Subscribe to dashboard-specific channels using STOMP subscriptions
     */
    subscribeToChannels() {
        console.log('Subscribing to dashboard channels...');

        // Subscribe to dashboard counters updates
        this.counterSubscription = this.stompClient.subscribe('/topic/dashboard/counters', (message) => {
            try {
                const data = JSON.parse(message.body);
                console.log('Received counter update:', data);

                if (this.onCountersUpdate) {
                    this.onCountersUpdate(data);
                }
            } catch (error) {
                console.error('Error processing counter update:', error);
            }
        });

        // Subscribe to order status changes
        this.orderSubscription = this.stompClient.subscribe('/topic/dashboard/orders', (message) => {
            try {
                const data = JSON.parse(message.body);
                console.log('Received order update:', data.eventType, data.orderId);

                switch (data.eventType) {
                    case 'STATUS_CHANGED':
                        if (this.onOrderUpdate) {
                            this.onOrderUpdate(data);
                        }
                        break;

                    case 'NEW_ORDER':
                        if (this.onNewOrder) {
                            this.onNewOrder(data);
                        }
                        break;

                    case 'ORDER_MODIFIED':
                        if (this.onOrderUpdate) {
                            this.onOrderUpdate(data);
                        }
                        break;

                    default:
                        console.warn('Unknown order event type:', data.eventType);
                }
            } catch (error) {
                console.error('Error processing order update:', error);
            }
        });

        // Subscribe to urgent alerts
        this.alertSubscription = this.stompClient.subscribe('/topic/dashboard/alerts', (message) => {
            try {
                const data = JSON.parse(message.body);
                console.warn('Received urgent alert:', data.alertType, data.alertMessage);

                // Urgent alerts might need special handling
                if (window.toastManager) {
                    window.toastManager.error(data.alertMessage, data.alertType);
                }
            } catch (error) {
                console.error('Error processing alert:', error);
            }
        });

        console.log('✓ Subscribed to all dashboard channels');
        console.log('Active subscriptions:', {
            counters: this.counterSubscription?.id,
            orders: this.orderSubscription?.id,
            alerts: this.alertSubscription?.id
        });
    }

    /**
     * Schedule WebSocket reconnection with exponential backoff
     */
    scheduleReconnect() {
        this.wsReconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.wsReconnectAttempts - 1);

        console.log(`Scheduling WebSocket reconnect attempt ${this.wsReconnectAttempts} in ${delay}ms`);

        setTimeout(() => {
            this.connectWebSocket();
        }, delay);
    }

    // ==========================================
    // DASHBOARD DATA OPERATIONS
    // ==========================================

    /**
     * Get full dashboard data (counters + statistics)
     */
    async getFullDashboard() {
        const cacheKey = 'fullDashboard';

        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log('Returning cached dashboard data');
                return cached.data;
            }
        }

        try {
            const response = await this.makeRequest('GET', '/overview');
            const data = await response.json();

            // Cache successful response
            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });

            return data;

        } catch (error) {
            console.error('Error fetching full dashboard:', error);
            throw error;
        }
    }

    /**
     * Get only counters for real-time updates (lightweight request)
     */
    async getCounters() {
        try {
            const response = await this.makeRequest('GET', '/counters');
            return await response.json();

        } catch (error) {
            console.error('Error fetching counters:', error);
            throw error;
        }
    }

    /**
     * Get orders by status with optional limit
     */
    async getOrdersByStatus(status, limit = 10) {
        const cacheKey = `orders_${status}_${limit}`;

        try {
            const response = await this.makeRequest('GET', `/orders/${status}?limit=${limit}`);
            const data = await response.json();

            // Cache for shorter time since order data changes frequently
            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });

            return data;

        } catch (error) {
            console.error(`Error fetching orders for status ${status}:`, error);
            throw error;
        }
    }

    // ==========================================
    // ORDER MANAGEMENT OPERATIONS
    // ==========================================

    /**
     * Get detailed order data with all items
     */
    async getOrderDetails(orderId) {
        const cacheKey = `orderDetails_${orderId}`;

        try {
            const response = await this.makeRequest('GET', `/order/${orderId}/details`);
            const data = await response.json();

            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });

            return data;

        } catch (error) {
            console.error(`Error fetching order details for ${orderId}:`, error);
            throw error;
        }
    }

    /**
     * Update product quantity in order (with change tracking)
     */
    async updateProductQuantity(orderId, productId, newQuantity) {
        try {
            const requestData = {
                orderId: orderId,
                productId: productId,
                quantity: newQuantity
            };

            const response = await this.makeRequest('PUT', `/order/${orderId}/product/${productId}/quantity`, requestData);
            const data = await response.json();

            // Clear cached order details since data changed
            this.clearOrderCache(orderId);

            return data;

        } catch (error) {
            console.error(`Error updating quantity for product ${productId} in order ${orderId}:`, error);
            throw error;
        }
    }

    /**
     * Remove product from order completely
     */
    async removeProductFromOrder(orderId, productId, reason) {
        try {
            const requestData = {
                orderId: orderId,
                productId: productId,
                removalReason: reason
            };

            const response = await this.makeRequest('DELETE', `/order/${orderId}/product/${productId}`, requestData);
            const data = await response.json();

            this.clearOrderCache(orderId);
            return data;

        } catch (error) {
            console.error(`Error removing product ${productId} from order ${orderId}:`, error);
            throw error;
        }
    }

    /**
     * Add operator note to order
     */
    async addOperatorNote(orderId, note) {
        try {
            const requestData = {
                orderId: orderId,
                operatorNote: note
            };

            const response = await this.makeRequest('POST', `/order/${orderId}/note`, requestData);
            const data = await response.json();

            this.clearOrderCache(orderId);
            return data;

        } catch (error) {
            console.error(`Error adding note to order ${orderId}:`, error);
            throw error;
        }
    }

    /**
     * Save order changes without approving (draft state)
     */
    async saveOrderChanges(orderId) {
        try {
            const response = await this.makeRequest('PUT', `/order/${orderId}/save`);
            const data = await response.json();

            this.clearOrderCache(orderId);
            return data;

        } catch (error) {
            console.error(`Error saving changes for order ${orderId}:`, error);
            throw error;
        }
    }

    /**
     * Approve entire order (with automatic correction message if modified)
     */
    async approveOrder(orderId, operatorNote = '') {
        try {
            const requestData = {
                orderId: orderId,
                operatorNote: operatorNote,
                action: 'approve'
            };

            const response = await this.makeRequest('POST', `/order/${orderId}/approve`, requestData);
            const data = await response.json();

            this.clearOrderCache(orderId);
            this.clearCache(); // Clear all cache since counters will change

            return data;

        } catch (error) {
            console.error(`Error approving order ${orderId}:`, error);
            throw error;
        }
    }

    /**
     * Reject entire order with reason
     */
    async rejectOrder(orderId, rejectionReason) {
        try {
            const requestData = {
                orderId: orderId,
                rejectionReason: rejectionReason,
                action: 'reject'
            };

            const response = await this.makeRequest('POST', `/order/${orderId}/reject`, requestData);
            const data = await response.json();

            this.clearOrderCache(orderId);
            this.clearCache(); // Clear all cache since counters will change

            return data;

        } catch (error) {
            console.error(`Error rejecting order ${orderId}:`, error);
            throw error;
        }
    }

    /**
     * Get order changes (diff between original and current state)
     */
    async getOrderChanges(orderId) {
        try {
            const response = await this.makeRequest('GET', `/order/${orderId}/changes`);
            return await response.json();

        } catch (error) {
            console.error(`Error fetching changes for order ${orderId}:`, error);
            throw error;
        }
    }

    /**
     * Reset order changes (revert to original state)
     */
    async resetOrderChanges(orderId) {
        try {
            const response = await this.makeRequest('POST', `/order/${orderId}/reset`);
            const data = await response.json();

            this.clearOrderCache(orderId);
            return data;

        } catch (error) {
            console.error(`Error resetting changes for order ${orderId}:`, error);
            throw error;
        }
    }

    // ==========================================
    // HTTP CLIENT UTILITIES
    // ==========================================

    /**
     * Make HTTP request with proper headers and error handling
     */
    async makeRequest(method, endpoint, data = null) {
        const url = this.baseUrl + endpoint;

        const config = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                [this.csrfHeader]: this.csrfToken
            }
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
            config.body = JSON.stringify(data);
        }

        console.log(`Making ${method} request to ${url}`);

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return response;

        } catch (error) {
            console.error(`Request failed for ${method} ${url}:`, error);
            throw error;
        }
    }

    // ==========================================
    // CACHE MANAGEMENT
    // ==========================================

    /**
     * Clear specific order cache
     */
    clearOrderCache(orderId) {
        const keysToDelete = [];
        for (const key of this.cache.keys()) {
            if (key.includes(`order`) && key.includes(orderId)) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));
        console.log(`Cleared cache for order ${orderId}`);
    }

    /**
     * Clear all cache
     */
    clearCache() {
        this.cache.clear();
        console.log('All cache cleared');
    }

    /**
     * Set event callbacks for real-time updates
     */
    setEventCallbacks(callbacks) {
        this.onCountersUpdate = callbacks.onCountersUpdate;
        this.onOrderUpdate = callbacks.onOrderUpdate;
        this.onNewOrder = callbacks.onNewOrder;
        this.onConnectionStatus = callbacks.onConnectionStatus;

        console.log('✓ Event callbacks configured');
    }

    /**
     * Cleanup connections and resources
     */
    destroy() {
        if (this.ws) {
            this.ws.close(1000, 'Dashboard closing');
            this.ws = null;
        }

        this.clearCache();
        console.log('DashboardApi destroyed');
    }
}

// Export for use in other modules
window.DashboardApi = DashboardApi;