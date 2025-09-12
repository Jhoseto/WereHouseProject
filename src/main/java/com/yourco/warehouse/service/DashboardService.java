package com.yourco.warehouse.service;

import com.yourco.warehouse.dto.DashboardDTO;
import com.yourco.warehouse.entity.enums.OrderStatus;

import java.util.List;
import java.util.Map;

/**
 * DASHBOARD SERVICE INTERFACE - EXTENDED FOR NEW BUSINESS LOGIC
 * =============================================================
 * Разширен interface за пълната dashboard функционалност включително:
 * - Основни dashboard операции (counters, statistics, order lists)
 * - Order management с change tracking (нова бизнес логика)
 * - Order approval/rejection на order-level (не product-level)
 * - Correction message generation при order modifications
 * - History tracking за transparency и accountability
 *
 * Архитектурни принципи:
 * - Single Responsibility: всеки метод има clear purpose
 * - Consistent return types: DashboardDTO за unified response handling
 * - Immutable parameters: defensively designed method signatures
 * - Business-focused naming: методите отразяват business operations
 */
public interface DashboardService {

    // ==========================================
    // CORE DASHBOARD DATA OPERATIONS - основни данни
    // ==========================================

    /**
     * Получава пълни dashboard данни - статистики + броячи + daily stats
     *
     * Този метод се използва при initial dashboard load за да populate
     * всички UI components с comprehensive data. Включва counters за
     * status bar, daily statistics за bottom panels, и alerts за urgent items.
     *
     * @return DashboardDTO с всички необходими dashboard данни
     */
    DashboardDTO getFullDashboard();

    /**
     * Получава само основните броячи - за lightweight real-time updates
     *
     * Използва се за frequent polling или automatic refresh operations
     * когато искаме да обновим counters без да зареждаме heavy data.
     * Оптимизиран за минимален database impact и бърз response time.
     *
     * @return DashboardDTO само с counter values
     */
    DashboardDTO getCounters();

    /**
     * Получава filtered списък с поръчки по статус
     *
     * Използва се при tab switching в dashboard UI за да populate
     * specific tab content с relevant orders. Limit parameter осигурява
     * pagination support и performance optimization за large datasets.
     *
     * @param status статус на поръчките за филтриране
     * @param limit максимален брой резултати за връщане
     * @return DashboardDTO с filtered order list
     */
    DashboardDTO getOrdersByStatus(OrderStatus status, int limit);

    // ==========================================
    // ORDER DETAILS & INFORMATION - детайлна информация
    // ==========================================

    /**
     * Получава comprehensive детайли за specific order
     *
     * Връща пълна информация за поръчка включително всички items,
     * current status, modification history, и pending changes.
     * Използва се при order detail expansion в dashboard UI.
     *
     * @param orderId уникален identifier на поръчката
     * @return DashboardDTO с comprehensive order details
     */
    DashboardDTO getOrderDetails(Long orderId);

    /**
     * Получава summary на всички промени направени в поръчка
     *
     * Генерира diff между original order state и current modified state.
     * Използва се за operator review преди approval и за generation
     * на correction message който се изпраща до клиента при одобрение.
     *
     * @param orderId уникален identifier на поръчката
     * @return DashboardDTO с change summary и diff information
     */
    DashboardDTO getOrderChangesSummary(Long orderId);

    // ==========================================
    // ORDER MODIFICATION OPERATIONS - нова бизнес логика
    // ==========================================

    /**
     * Обновява количеството на specific product в поръчка
     *
     * КЛЮЧОВА НОВА ФУНКЦИОНАЛНОСТ: заменя single product approval
     * с quantity modification logic. Автоматично track-ва промените
     * за generation на correction message при order approval.
     *
     * Change tracking позволява на система да генерира accurate
     * correction messages като "Количеството на Product X е променено
     * от 10 на 8 поради limited availability".
     *
     * @param orderId уникален identifier на поръчката
     * @param productId identifier на product-а за modification
     * @param newQuantity новото количество за product-а
     * @return DashboardDTO с operation result и success/failure status
     */
    DashboardDTO updateProductQuantity(Long orderId, Long productId, Integer newQuantity);

    /**
     * Премахва product от поръчка completely с documented reason
     *
     * Използва се когато specific products не са available, discontinued,
     * или не могат да бъдат доставени в required time frame. Reason
     * parameter се включва в correction message до клиента.
     *
     * Примери за reasons: "Продуктът не е в наличност", "Изтекъл срок на годност",
     * "Прекратено производство", "Невъзможна доставка в срок".
     *
     * @param orderId уникален identifier на поръчката
     * @param productId identifier на product-а за премахване
     * @param reason business reason за премахването (за client communication)
     * @return DashboardDTO с operation result
     */
    DashboardDTO removeProductFromOrder(Long orderId, Long productId, String reason);

    /**
     * Възстановява поръчка към original състояние (revert all changes)
     *
     * Полезен механизъм когато operator е направил грешки в modifications
     * и иска да започне отначало. Всички quantity changes и removed
     * products се възстановяват към original order state.
     *
     * @param orderId уникален identifier на поръчката
     * @return DashboardDTO с operation result
     */
    DashboardDTO resetOrderToOriginalState(Long orderId);

    // ==========================================
    // ORDER APPROVAL/REJECTION - ключови business operations
    // ==========================================

    /**
     * Одобрява цяла поръчка с automatic correction notification
     *
     * CORE BUSINESS LOGIC: одобряване на order-level (не product-level).
     * Ако са направени modifications (quantity changes, removed products),
     * автоматично генерира professional correction message и го изпраща
     * до клиента via email/SMS/in-app notification.
     *
     * Process flow:
     * 1. Validate order state и pending changes
     * 2. Generate correction message ако има modifications
     * 3. Update order status към CONFIRMED
     * 4. Send notification до клиента с correction details
     * 5. Update inventory reservations ако е необходимо
     * 6. Log approval action за audit trail
     *
     * @param orderId уникален identifier на поръчката
     * @param operatorNote optional бележка от operator за включване в correction message
     * @return DashboardDTO с approval result и information за изпратени notifications
     */
    DashboardDTO approveOrderWithCorrections(Long orderId, String operatorNote);

    /**
     * Отказва цяла поръчка с automatic client notification
     *
     * CORE BUSINESS LOGIC: rejection на order-level с comprehensive
     * client communication. Автоматично изпраща professional rejection
     * message с business reason и alternative suggestions ако е възможно.
     *
     * Process flow:
     * 1. Update order status към CANCELLED
     * 2. Generate rejection notification с professional tone
     * 3. Release inventory reservations за други поръчки
     * 4. Send notification до клиента с rejection reason
     * 5. Log rejection action за business analytics
     * 6. Suggest alternatives ако е applicable
     *
     * @param orderId уникален identifier на поръчката
     * @param rejectionReason business reason за rejection (за client communication)
     * @return DashboardDTO с rejection result и notification status
     */
    DashboardDTO rejectOrderWithNotification(Long orderId, String rejectionReason);

    // ==========================================
    // HELPER METHODS - utility operations за internal use
    // ==========================================

    /**
     * Генерира preview на correction message преди изпращане
     *
     * Позволява на operator да review и edit correction message content
     * преди окончателно одобряване и изпращане до клиента. Useful за
     * quality control и personalization на customer communication.
     *
     * @param orderId уникален identifier на поръчката
     * @param operatorNote optional бележка от operator за включване
     * @return DashboardDTO с generated message preview
     */
    DashboardDTO previewCorrectionMessage(Long orderId, String operatorNote);

    /**
     * Получава audit trail за specific order
     *
     * Връща chronological history на всички actions выполнени върху
     * поръчката включително timestamps, operator information, и action details.
     * Използва се за compliance, troubleshooting, и business analytics.
     *
     * @param orderId уникален identifier на поръчката
     * @return DashboardDTO с comprehensive audit trail
     */
    DashboardDTO getOrderAuditTrail(Long orderId);


    DashboardDTO validateInventoryForOrderChanges(Long orderId, List<Map<String, Object>> changes);

    DashboardDTO approveOrderWithBatchChanges(Long orderId, List<Map<String, Object>> changes, String operatorNote, String changesSummary);
}