/**
 * OPTIMIZED CART MANAGER - ПРОИЗВОДИТЕЛНОСТ И CACHE
 * ===============================================
 */
class CartManager {
    constructor() {
        this.badge = document.getElementById('cart-badge');
        this.apiEndpoints = {
            add: '/api/cart/add',
            update: '/api/cart/update',
            remove: '/api/cart/remove',
            clear: '/api/cart/clear',
            count: '/api/cart/count',
            items: '/api/cart/items'
        };

        // CACHE за по-бърза работа
        this.cache = {
            count: 0,
            hasItems: false,
            items: null,
            lastUpdate: 0
        };

        // DEBOUNCE за batch операции
        this.pendingOperations = new Map();
        this.operationTimeout = null;

        this.init();
    }

    async init() {
        await this.updateBadge();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Слуша за промени в localStorage от други табове
        window.addEventListener('storage', (e) => {
            if (e.key === 'cart_updated') {
                this.invalidateCache();
                this.updateBadge();
            }
        });

        // Слуша за visibility change за refresh при връщане към таба
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isCacheStale()) {
                this.updateBadge();
            }
        });
    }

    /**
     * Проверява дали cache-а е остарял (над 30 секунди)
     */
    isCacheStale() {
        return Date.now() - this.cache.lastUpdate > 30000;
    }

    /**
     * Инвалидира cache-а
     */
    invalidateCache() {
        this.cache.lastUpdate = 0;
    }

    /**
     * Получава CSRF токена от глобалните JavaScript променливи
     * @returns {Object} - {token: string, header: string}
     */
    getCsrfToken() {
        const token = window.csrfToken || '';
        const header = window.csrfHeader || 'X-CSRF-TOKEN';

        if (!token) {
            console.warn('CSRF токен не е намерен в window.csrfToken');
        }

        return { token, header };
    }

    /**
     * Създава headers за POST заявки с CSRF защита
     * @returns {Object} - Headers обект с CSRF токен
     */
    getPostHeaders() {
        const csrf = this.getCsrfToken();
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };

        if (csrf.token) {
            headers[csrf.header] = csrf.token;
        }

        return headers;
    }

    /**
     * DEBOUNCED добавяне - групира бързи заявки
     * @param {string|number} productId - ID на продукта
     * @param {number} quantity - Количество за добавяне
     * @returns {Promise<boolean>} - true ако е успешно
     */
    async add(productId, quantity = 1) {
        // Добавя в pending операции
        const existingQty = this.pendingOperations.get(productId) || 0;
        this.pendingOperations.set(productId, existingQty + quantity);

        // Отменя предишния timeout
        if (this.operationTimeout) {
            clearTimeout(this.operationTimeout);
        }

        // Чака 300ms за още операции
        return new Promise((resolve) => {
            this.operationTimeout = setTimeout(async () => {
                const success = await this.flushPendingOperations();
                resolve(success);
            }, 300);
        });
    }

    /**
     * Изпълнява всички pending операции наведнъж
     */
    async flushPendingOperations() {
        if (this.pendingOperations.size === 0) return true;

        const operations = Array.from(this.pendingOperations.entries());
        this.pendingOperations.clear();

        let allSuccess = true;

        for (const [productId, quantity] of operations) {
            try {
                const response = await fetch(this.apiEndpoints.add, {
                    method: 'POST',
                    headers: this.getPostHeaders(),
                    body: `productId=${productId}&quantity=${quantity}`,
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        // Обновява cache веднага
                        if (data.cart && data.cart.totalItems !== undefined) {
                            this.updateCacheCount(data.cart.totalItems);
                        }

                        window.toastManager?.success(data.message || 'Продуктът е добавен в кошницата');
                    } else {
                        window.toastManager?.error(data.error || 'Грешка при добавяне в кошницата');
                        allSuccess = false;
                    }
                } else {
                    if (response.status === 403) {
                        window.toastManager?.error('Сесията ви е изтекла. Моля, презаредете страницата.');
                    } else {
                        window.toastManager?.error('Грешка при добавяне в кошницата');
                    }
                    allSuccess = false;
                }
            } catch (error) {
                console.error('Cart add error:', error);
                window.toastManager?.error('Грешка при добавяне в кошницата');
                allSuccess = false;
            }
        }

        // Обновява badge и отваря панела
        await this.updateBadge();

        if (allSuccess) {
            setTimeout(() => {
                window.cartPanel?.open();
            }, 200);
        }

        return allSuccess;
    }

    /**
     * Обновява количеството на артикул в кошницата
     * @param {string|number} productId - ID на продукта
     * @param {number} newQuantity - Ново количество
     * @returns {Promise<boolean>} - true ако е успешно
     */
    async updateQuantity(productId, newQuantity) {
        try {
            const response = await fetch(this.apiEndpoints.update, {
                method: 'POST',
                headers: this.getPostHeaders(),
                body: `productId=${productId}&quantity=${newQuantity}`,
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Обновява cache
                    if (data.cart && data.cart.totalItems !== undefined) {
                        this.updateCacheCount(data.cart.totalItems);
                    }

                    // Не показва toast - cartPanel.js ще покаже
                    return true;
                } else {
                    window.toastManager?.error(data.error || 'Грешка при обновяване на количеството');
                    return false;
                }
            } else {
                if (response.status === 403) {
                    window.toastManager?.error('Сесията ви е изтекла. Моля, презаредете страницата.');
                } else {
                    window.toastManager?.error('Грешка при обновяване на количеството');
                }
                return false;
            }
        } catch (error) {
            console.error('Cart update error:', error);
            window.toastManager?.error('Грешка при обновяване на количеството');
            return false;
        }
    }

    /**
     * Премахва артикул от кошницата
     * @param {string|number} productId - ID на продукта
     * @returns {Promise<boolean>} - true ако е успешно
     */
    async remove(productId) {
        try {
            const response = await fetch(this.apiEndpoints.remove, {
                method: 'POST',
                headers: this.getPostHeaders(),
                body: `productId=${productId}`,
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Обновява cache
                    if (data.cart && data.cart.totalItems !== undefined) {
                        this.updateCacheCount(data.cart.totalItems);
                    }

                    window.toastManager?.success(data.message || 'Артикулът е премахнат');
                    await this.updateBadge();
                    return true;
                } else {
                    window.toastManager?.error(data.error || 'Грешка при премахване');
                    return false;
                }
            } else {
                if (response.status === 403) {
                    window.toastManager?.error('Сесията ви е изтекла. Моля, презаредете страницата.');
                } else {
                    window.toastManager?.error('Грешка при премахване от кошницата');
                }
                return false;
            }
        } catch (error) {
            console.error('Cart remove error:', error);
            window.toastManager?.error('Грешка при премахване от кошницата');
            return false;
        }
    }

    /**
     * Изчиства цялата кошница
     * @returns {Promise<boolean>} - true ако е успешно
     */
    async clear() {
        try {
            const response = await fetch(this.apiEndpoints.clear, {
                method: 'POST',
                headers: this.getPostHeaders(),
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Изчиства cache
                    this.updateCacheCount(0);

                    window.toastManager?.success(data.message || 'Количката е изчистена');
                    await this.updateBadge();
                    return true;
                } else {
                    window.toastManager?.error(data.error || 'Грешка при изчистване');
                    return false;
                }
            } else {
                if (response.status === 403) {
                    window.toastManager?.error('Сесията ви е изтекла. Моля, презаредете страницата.');
                } else {
                    window.toastManager?.error('Грешка при изчистване на кошницата');
                }
                return false;
            }
        } catch (error) {
            console.error('Cart clear error:', error);
            window.toastManager?.error('Грешка при изчистване на кошницата');
            return false;
        }
    }

    /**
     * Получава всички артикули в кошницата с CACHE
     * @returns {Promise<Object|null>} - Данни за кошницата или null при грешка
     */
    async getCartData() {
        // Използва cache ако е свеж
        if (this.cache.items && !this.isCacheStale()) {
            return this.cache.items;
        }

        try {
            const response = await fetch(this.apiEndpoints.items, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                // Обновява cache
                this.cache.items = data;
                this.cache.lastUpdate = Date.now();
                this.updateCacheCount(data.totalItems || 0);
                return data;
            } else {
                console.error('Failed to fetch cart data');
                return null;
            }
        } catch (error) {
            console.error('Cart data fetch error:', error);
            return null;
        }
    }

    /**
     * Обновява badge с броя артикули - OPTIMIZED с cache
     */
    async updateBadge() {
        // Използва cache ако е свеж
        if (!this.isCacheStale() && this.cache.count !== undefined) {
            this.setBadge(this.cache.count);
            return;
        }

        try {
            const response = await fetch(this.apiEndpoints.count, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                const count = data.count || 0;

                this.updateCacheCount(count);
                this.setBadge(count);

                // Уведомява други табове БЕЗ рекурсивно извикване
                this.notifyOtherTabs();
            }
        } catch (error) {
            console.error('Badge update error:', error);
            // Тихо fail за badge update - не пречи на UX
        }
    }

    /**
     * Обновява cache count и hasItems
     */
    updateCacheCount(count) {
        this.cache.count = count;
        this.cache.hasItems = count > 0;
        this.cache.lastUpdate = Date.now();
    }

    /**
     * Уведомява други табове за промяна
     */
    notifyOtherTabs() {
        try {
            localStorage.setItem('cart_updated', Date.now().toString());
            localStorage.removeItem('cart_updated');
        } catch (error) {
            // Игнорира localStorage грешки
        }
    }

    /**
     * Задава стойност на badge
     * @param {number} count - Брой артикули
     */
    setBadge(count) {
        if (!this.badge) return;

        const numCount = parseInt(count) || 0;

        // Обновява текста
        this.badge.textContent = numCount > 99 ? '99+' : numCount.toString();

        // Показва/скрива badge
        if (numCount > 0) {
            this.badge.classList.add('show');
        } else {
            this.badge.classList.remove('show');
        }
    }

    /**
     * Връща дали има артикули в кошницата
     * @returns {boolean}
     */
    hasItems() {
        return this.cache.hasItems;
    }

    /**
     * Връща cached count
     * @returns {number}
     */
    getCount() {
        return this.cache.count;
    }
}

/**
 * ГЛОБАЛНИ ФУНКЦИИ ЗА СЪВМЕСТИМОСТ
 * ===============================
 */

/**
 * Добавя продукт в кошницата - глобална функция за HTML onclick
 * @param {string|number} productId - ID на продукта
 * @param {number} quantity - Количество
 */
async function addToCart(productId, quantity = 1) {
    if (window.cartManager) {
        return await window.cartManager.add(productId, quantity);
    } else {
        console.error('CartManager не е инициализиран');
        return false;
    }
}

/**
 * Изчиства количката след потвърждение
 */
async function clearCart() {
    if (window.cartManager) {
        const confirmed = confirm('Сигурни ли сте, че искате да изчистите количката?');
        if (confirmed) {
            await window.cartManager.clear();
        }
    } else {
        console.error('CartManager не е инициализиран');
    }
}

/**
 * INITIALIZATION
 * =============
 */
document.addEventListener('DOMContentLoaded', function() {
    // Създава глобалния cart manager
    window.cartManager = new CartManager();
    console.log('CartManager инициализиран успешно');
});