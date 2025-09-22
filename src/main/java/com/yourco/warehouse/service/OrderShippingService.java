package com.yourco.warehouse.service;

import com.yourco.warehouse.dto.DashboardDTO;

public interface OrderShippingService {

    /**
     * Зарежда пълна информация за поръчка готова за shipping
     * Включва order details, client info и items с shipping-specific логика
     */
    DashboardDTO loadShippingOrderData(Long orderId);

    /**
     * Потвърждава изпращането на поръчка - мени статус към SHIPPED
     * Записва shipping timestamp, truck number и бележки
     */
    DashboardDTO confirmOrderShipping(Long orderId, String truckNumber, String shippingNote);

    /**
     * Валидира дали поръчката е готова за shipping
     * Проверява статус, данни и други предпоставки
     */
    DashboardDTO validateOrderForShipping(Long orderId);
}