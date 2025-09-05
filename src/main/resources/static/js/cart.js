/**
 * CART MANAGER - ОБНОВЕН С PANEL ИНТЕГРАЦИЯ И CSRF PROTECTION
 * ===========================================================
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
        this.init();
    }

    async init() {
        await this.updateBadge();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Слуша за промени в localStorage от други табове (ако е нужно)
        window.addEventListener('storage', (e) => {
            if (e.key === 'cart_updated') {
                this.updateBadge();
            }
        });
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
     * Добавя продукт в кошницата
     * @param {string|number} productId - ID на продукта
     * @param {number} quantity - Количество за добавяне
     * @returns {Promise<boolean>} - true ако е успешно
     */
    async add(productId, quantity = 1) {
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
                    // Показва toast notification
                    window.toastManager?.success(data.message || 'Продуктът е добавен в кошницата');

                    // Обновява badge
                    await this.updateBadge();

                    // Обновява cart panel ако е отворен
                    if (window.cartPanel?.isOpen) {
                        await window.cartPanel.loadCartContent();
                    }

                    // Автоматично отваря панела след кратко забавяне
                    setTimeout(() => {
                        window.cartPanel?.open();
                    }, 300);

                    return true;
                } else {
                    window.toastManager?.error(data.error || 'Грешка при добавяне в кошницата');
                    return false;
                }
            } else {
                // Проверява за 403 CSRF грешка
                if (response.status === 403) {
                    window.toastManager?.error('Сесията ви е изтекла. Моля, презаредете страницата.');
                } else {
                    window.toastManager?.error('Грешка при добавяне в кошницата');
                }
                return false;
            }
        } catch (error) {
            console.error('Cart add error:', error);
            window.toastManager?.error('Грешка при добавяне в кошницата');
            return false;
        }
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
                    window.toastManager?.success('Количеството е обновено');
                    await this.updateBadge();

                    // Обновява cart panel ако е отворен
                    if (window.cartPanel?.isOpen) {
                        await window.cartPanel.loadCartContent();
                    }

                    return true;
                } else {
                    window.toastManager?.error(data.error || 'Грешка при обновяване на количеството');
                    return false;
                }
            } else {
                // Проверява за 403 CSRF грешка
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
                    window.toastManager?.success('Продуктът е премахнат от кошницата');
                    await this.updateBadge();

                    // Обновява cart panel ако е отворен
                    if (window.cartPanel?.isOpen) {
                        await window.cartPanel.loadCartContent();
                    }

                    return true;
                } else {
                    window.toastManager?.error(data.error || 'Грешка при премахване от кошницата');
                    return false;
                }
            } else {
                // Проверява за 403 CSRF грешка
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
                    window.toastManager?.success('Кошницата е изчистена');
                    await this.updateBadge();

                    // Обновява cart panel ако е отворен
                    if (window.cartPanel?.isOpen) {
                        await window.cartPanel.loadCartContent();
                    }

                    return true;
                } else {
                    window.toastManager?.error(data.error || 'Грешка при изчистване на кошницата');
                    return false;
                }
            } else {
                // Проверява за 403 CSRF грешка
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
     * Получава всички артикули в кошницата
     * @returns {Promise<Object|null>} - Данни за кошницата или null при грешка
     */
    async getCartData() {
        try {
            const response = await fetch(this.apiEndpoints.items, {
                credentials: 'include'
            });

            if (response.ok) {
                return await response.json();
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
     * Обновява badge с броя артикули
     */
    async updateBadge() {
        try {
            const response = await fetch(this.apiEndpoints.count, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.setBadge(data.count || 0);

                // Уведомява други табове за промяната (ако е нужно)
                localStorage.setItem('cart_updated', Date.now().toString());
                localStorage.removeItem('cart_updated');
            }
        } catch (error) {
            console.error('Badge update error:', error);
            // Тихо fail за badge update - не пречи на UX
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
        this.badge.classList.toggle('show', numCount > 0);

        // Добавя animation при промяна
        if (numCount > 0) {
            this.badge.style.animation = 'none';
            setTimeout(() => {
                this.badge.style.animation = '';
            }, 10);
        }
    }

    /**
     * Utility методи
     */
    formatPrice(price) {
        return parseFloat(price || 0).toFixed(2);
    }

    /**
     * Проверява дали има артикули в кошницата
     * @returns {Promise<boolean>}
     */
    async hasItems() {
        const cartData = await this.getCartData();
        return cartData && cartData.items && cartData.items.length > 0;
    }

    /**
     * Получава общия брой артикули
     * @returns {Promise<number>}
     */
    async getTotalQuantity() {
        try {
            const response = await fetch(this.apiEndpoints.count, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                return data.count || 0;
            }
            return 0;
        } catch (error) {
            console.error('Get total quantity error:', error);
            return 0;
        }
    }
}

/**
 * GLOBAL CART FUNCTIONS
 * =====================
 */

/**
 * Глобална функция за добавяне в кошница - за HTML onclick events
 * @param {string|number} productId - ID на продукта
 * @param {number} quantity - Количество
 */
async function addToCart(productId, quantity = 1) {
    if (window.cartManager) {
        await window.cartManager.add(productId, quantity);
    } else {
        console.error('CartManager не е инициализиран');
    }
}

/**
 * Глобална функция за промяна на количество - за HTML events
 * @param {string|number} productId - ID на продукта
 * @param {number} newQuantity - Ново количество
 */
async function updateCartQuantity(productId, newQuantity) {
    if (window.cartManager) {
        await window.cartManager.updateQuantity(productId, newQuantity);
    } else {
        console.error('CartManager не е инициализиран');
    }
}

/**
 * Глобална функция за премахване от кошница - за HTML onclick events
 * @param {string|number} productId - ID на продукта
 */
async function removeFromCart(productId) {
    if (window.cartManager) {
        await window.cartManager.remove(productId);
    } else {
        console.error('CartManager не е инициализиран');
    }
}

/**
 * Глобална функция за изчистване на кошницата - за HTML onclick events
 */
async function clearCart() {
    if (window.cartManager) {
        const confirmed = confirm('Сигурни ли сте, че искате да изчистите кошницата?');
        if (confirmed) {
            await window.cartManager.clear();
        }
    } else {
        console.error('CartManager не е инициализиран');
    }
}

/**
 * INITIALIZATION
 * ==============
 */
document.addEventListener('DOMContentLoaded', function() {
    // Създава глобалния cart manager
    window.cartManager = new CartManager();

    console.log('CartManager инициализиран успешно');
});