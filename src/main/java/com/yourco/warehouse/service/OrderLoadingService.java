package com.yourco.warehouse.service;

import com.yourco.warehouse.entity.UserEntity;

import java.util.List;
import java.util.Map;

/**
 * ORDER LOADING SERVICE - BUSINESS INTERFACE
 * ==========================================
 * Управлява процеса на товарене на поръчки в камиони.
 * Всеки служител може да започне товарене и само той може да го управлява.
 * Останалите служители могат само да наблюдават процеса.
 */
public interface OrderLoadingService {

    /**
     * Започва процес на товарене на поръчка
     * Създава активна session която заключва поръчката за конкретен служител
     *
     * @param orderId ID на поръчката за товарене
     * @param truckNumber номер на камиона в който се товари
     * @return резултат с sessionId и общ брой артикули
     * @throws RuntimeException ако поръчката вече се товари или не е CONFIRMED
     */
    Map<String, Object> startLoading(Long orderId, String truckNumber);

    /**
     * Toggle състоянието на артикул в активна session
     * Само служителят който е започнал товаренето може да прави промени
     *
     * @param sessionId ID на активната товарна session
     * @param itemId фиктивен ID за toggle операция (не се използва реално)
     * @return нов статус и обновен брой заредени артикули
     * @throws RuntimeException ако session не съществува
     */
    Map<String, Object> toggleItem(Long sessionId, Long itemId);

    /**
     * Завършва процеса на товарене
     * Прави поръчката SHIPPED и изтрива временната session
     *
     * @param sessionId ID на активната товарна session
     * @return резултат с общо време за товарене
     * @throws RuntimeException ако не всички артикули са маркирани като заредени
     */
    Map<String, Object> completeLoading(Long sessionId);

    /**
     * Получава статус на процеса на товарене за конкретна поръчка
     * Използва се за определяне дали служителят може да прави промени или само да наблюдава
     *
     * @param orderId ID на поръчката
     * @return статус на session с данни за активния служител
     */
    Map<String, Object> getLoadingStatus(Long orderId);

    /**
     * Обновява heartbeat за активна session
     * Използва се за проследяване на активността на служителя
     *
     * @param sessionId ID на активната товарна session
     */
    void updateHeartbeat(Long sessionId);

    /**
     * Намира sessions със загубена връзка
     * Background операция за системно администриране
     *
     * @param thresholdMinutes минути без heartbeat преди да се счита като загубена
     * @return брой sessions маркирани като загубени
     */
    int detectLostConnectionSessions(int thresholdMinutes);

    /**
     * Изчиства стари изоставени sessions
     * Background операция за системно администриране
     *
     * @param maxAgeHours максимална възраст на sessions за изтриване
     * @return брой изтрити sessions
     */
    int cleanupAbandonedSessions(int maxAgeHours);

    /**
     * Получава прогрес на всички активни товарни sessions
     * Използва се за monitoring dashboard
     *
     * @return списък с прогрес данни за всяка активна session
     */
    List<Map<String, Object>> getActiveLoadingProgress();

    /**
     * Брой активни товарни sessions в момента
     * Използва се за статистики и monitoring
     *
     * @return общ брой активни sessions
     */
    long getActiveLoadingSessionsCount();

    UserEntity getEmployer(Long orderId);
}