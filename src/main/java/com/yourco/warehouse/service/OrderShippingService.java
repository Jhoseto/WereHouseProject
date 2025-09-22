package com.yourco.warehouse.service;

import java.util.List;
import java.util.Map;

/**
 * ORDER SHIPPING SERVICE - INTERFACE
 * ==================================
 * Минимален contract за shipping операции + monitoring
 */
public interface OrderShippingService {

    /**
     * Стартира shipping процес
     * @param orderId ID на поръчката
     * @param truckNumber номер на камиона
     * @param employeeId ID на служителя
     * @param employeeUsername username на служителя
     * @return Map с sessionId и totalItems
     */
    Map<String, Object> startShipping(Long orderId, String truckNumber, Long employeeId, String employeeUsername);

    /**
     * Toggle статус на артикул (зареден/незареден)
     * @param sessionId ID на сесията
     * @param itemId ID на артикула (не се използва, само за frontend compatibility)
     * @return Map с isLoaded състояние
     */
    Map<String, Object> toggleItem(Long sessionId, Long itemId);

    /**
     * Завършва shipping процеса
     * @param sessionId ID на сесията
     * @return Map с резултат
     */
    Map<String, Object> completeShipping(Long sessionId);

    /**
     * Получава текущ статус на shipping
     * @param orderId ID на поръчката
     * @return Map със статус данни
     */
    Map<String, Object> getShippingStatus(Long orderId);

    /**
     * Обновява heartbeat за активна сесия
     * @param sessionId ID на сесията
     */
    void updateHeartbeat(Long sessionId);

    /**
     * Background job - откриване на изгубени сигнали
     * @param thresholdMinutes минути без heartbeat преди да се счита за изгубен
     * @return броя на маркираните сесии
     */
    int detectLostSignalSessions(int thresholdMinutes);

    /**
     * Background cleanup - изтриване на стари изгубени сесии
     * @param maxAgeHours часове след които да се изтриват
     * @return броя на изтритите сесии
     */
    int cleanupOldLostSessions(int maxAgeHours);

    /**
     * Monitoring - активни shipping сесии
     * @return List с прогреса на всички активни сесии
     */
    List<Map<String, Object>> getActiveSessionsProgress();

    /**
     * Статистика - брой активни сесии
     * @return броя на активните сесии
     */
    long getActiveSessionsCount();
}