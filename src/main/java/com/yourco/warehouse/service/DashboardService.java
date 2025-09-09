package com.yourco.warehouse.service;

import com.yourco.warehouse.dto.DailyStatsDTO;
import com.yourco.warehouse.dto.DashboardDataDTO;
import com.yourco.warehouse.entity.Order;
import com.yourco.warehouse.entity.enums.OrderStatus;

import java.util.List;
import java.util.Map;

/**
 * DASHBOARD SERVICE INTERFACE
 * ===========================
 * Дефинира бизнес операциите за dashboard функционалността.
 * Този интерфейс абстрахира всички dashboard операции и позволява
 * на контролера да остане чист без бизнес логика.
 */
public interface DashboardService {

    /**
     * Получава обобщените данни за dashboard-а
     * Включва броячи за всички статуси на поръчки
     *
     * @return DashboardDataDTO с актуални статистики
     */
    DashboardDataDTO getDashboardOverview();

    /**
     * Получава дневните статистики за dashboard-а
     * Включва обработени поръчки, приходи, средно време и активни клиенти
     *
     * @return DailyStatsDTO с дневни показатели
     */
    DailyStatsDTO getDailyStatistics();


    /**
     * Потвърждава поръчка (SUBMITTED → CONFIRMED)
     *
     * @param orderId ID на поръчката
     * @return true ако операцията е успешна
     * @throws IllegalArgumentException ако поръчката не съществува
     * @throws IllegalStateException ако статус промяната не е валидна
     */
    boolean confirmOrder(Long orderId);

    /**
     * Започва процес на пикинг (CONFIRMED → PICKED)
     *
     * @param orderId ID на поръчката
     * @return true ако операцията е успешна
     */
    boolean startPickingOrder(Long orderId);

    /**
     * Завършва поръчка за изпращане (PICKED → SHIPPED)
     *
     * @param orderId ID на поръчката
     * @return true ако операцията е успешна
     */
    boolean completeOrder(Long orderId);

    /**
     * Отказва поръчка с причина
     *
     * @param orderId ID на поръчката
     * @param reason причина за отказа
     * @return true ако операцията е успешна
     */
    boolean rejectOrder(Long orderId, String reason);

    /**
     * Проверява дали статус промяната е валидна
     * Имплементира бизнес правилата за workflow на поръчки
     *
     * @param fromStatus текущ статус
     * @param toStatus желан статус
     * @return true ако промяната е позволена
     */
    boolean isValidStatusTransition(OrderStatus fromStatus, OrderStatus toStatus);

    /**
     * Обновява количеството на продукт в поръчка
     *
     * @param orderId ID на поръчката
     * @param productSku SKU на продукта
     * @param newQuantity новото количество
     * @return true ако операцията е успешна
     */
    boolean updateOrderItemQuantity(Long orderId, String productSku, Integer newQuantity);

    /**
     * Одобрява продукт в поръчка
     *
     * @param orderId ID на поръчката
     * @param productSku SKU на продукта
     * @return true ако операцията е успешна
     */
    boolean approveOrderItem(Long orderId, String productSku);

    /**
     * Отказва продукт в поръчка
     *
     * @param orderId ID на поръчката
     * @param productSku SKU на продукта
     * @param reason причина за отказа
     * @return true ако операцията е успешна
     */
    boolean rejectOrderItem(Long orderId, String productSku, String reason);

    /**
     * Получава детайлна информация за поръчка
     * Зарежда всички необходими данни включително items и products
     *
     * @param orderId ID на поръчката
     * @return Order обект с пълни данни или null ако не съществува
     */
    Order getOrderDetails(Long orderId);

    /**
     * Проверява дали има активни поръчки изискващи внимание
     * Използва се за нотификации и алерти
     *
     * @return true ако има спешни поръчки
     */
    boolean hasUrgentOrders();

    /**
     * Получава статистики за ефективността на обработката
     * Включва средно време за обработка, успешност и други KPI
     *
     * @return Map с KPI данни
     */
    Map<String, Object> getPerformanceMetrics();
}