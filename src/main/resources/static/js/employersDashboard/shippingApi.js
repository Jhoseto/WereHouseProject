/**
 * ОПРОСТЕН SHIPPING API - САМО ДВЕ ЗАЯВКИ
 * =====================================
 *
 * Заменя сложния shippingApi.js с максимално опростена логика:
 * 1. Зарежда цялата информация веднъж
 * 2. Потвърждава shipping и сменя статуса
 *
 * Всичко друго се случва в реално време във frontend-а
 */

class ShippedApi {
    constructor() {
        // Основен URL path за shipping операции
        this.basePath = '/api/shipping-orders';

        // Headers за POST/PUT заявки
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        console.log('ShippedApi инициализиран успешно');
    }


    /**
     * 🔹 ЗАЯВКА 2: ПОТВЪРЖДЕНИЕ И SHIPPING
     *
     * Единствената заявка за потвърждение която:
     * - Сменя статуса от CONFIRMED → SHIPPED
     * - Добавя shipping note ако е подаден
     * - Записва timestamp за shipping
     * - Завършва процеса
     *
     * Това е финалната операция - след нея поръчката е изпратена
     */
    async confirmShipping(orderId, shippedNote = null) {
        try {
            console.log(`📦 Потвърждение на shipping за поръчка ${orderId}`);

            const requestData = {
                orderId: orderId,
                shippedNote: shippedNote?.trim() || null,
                shippedAt: new Date().toISOString(),
                action: 'CONFIRM_SHIPPING'
            };

            const response = await this.makeRequest('PUT', `/${orderId}/confirm-shipping`, requestData);

            if (response.success) {
                console.log(`✅ Поръчка ${orderId} е потвърдена като изпратена`);

                return {
                    success: true,
                    orderId: orderId,
                    newStatus: 'SHIPPED',
                    shippedAt: requestData.shippedAt,
                    message: response.message || 'Поръчката е успешно изпратена'
                };
            } else {
                throw new Error(response.message || 'Грешка при потвърждение на shipping');
            }

        } catch (error) {
            console.error(`❌ Грешка при потвърждение на shipping за поръчка ${orderId}:`, error);

            return {
                success: false,
                error: error.message,
                message: 'Неуспешно потвърждение. Моля опитайте отново.'
            };
        }
    }

}

// ==========================================
// ГЛОБАЛНА ИНИЦИАЛИЗАЦИЯ
// ==========================================

/**
 * Създава глобален instance при зареждане на страницата
 */
document.addEventListener('DOMContentLoaded', function() {
    // Създай глобалния shipping API
    window.shippedApi = new ShippedApi();

    console.log('✅ ShippedApi е готов за използване');

    // Експортирай основните функции глобално за HTML onclick events
    window.loadOrderForShipping = async function(orderId) {
        return await window.shippedApi.loadCompleteOrderData(orderId);
    };

    window.confirmOrderShipping = async function(orderId, note) {
        return await window.shippedApi.confirmShipping(orderId, note);
    };
});

// ==========================================
// EXPORT ЗА ES6 MODULES
// ==========================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShippedApi;
}
/*
 * // 2. Потвърждение на shipping
 * const shipped = await window.shippedApi.confirmShipping(123, "Всичко е заредено успешно");
 * if (shipped.success) {
 *     // Поръчката е SHIPPED - готово!
 *     // Можеш да обновиш UI локално
 * }
 */