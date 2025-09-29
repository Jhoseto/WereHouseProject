package com.yourco.warehouse.service;

import java.util.Map;

/**
 * DASHBOARD BROADCAST SERVICE INTERFACE - REAL-TIME COMMUNICATION CONTRACT
 * =======================================================================
 * Дефинира contract за real-time broadcasting на dashboard events към clients.
 *
 * Архитектурни принципи:
 * - Technology agnostic design (може да се implement с WebSocket, SSE, polling, etc.)
 * - Clean separation между business logic и communication mechanism
 * - Type-safe method signatures за предотвратяване на runtime errors
 * - Consistent naming convention според broadcasting patterns
 * - Event-driven architecture support за loose coupling
 *
 * Design Philosophy:
 * Този interface abstract-ва communication technology от business logic.
 * Controllers и services могат да broadcast events без да знаят дали
 * используваме WebSocket, Server-Sent Events, или друг mechanism.
 * Това прави системата flexible за future technology changes.
 */
public interface DashboardBroadcastService {

    // ==========================================
    // COUNTER UPDATES - за real-time dashboard statistics
    // ==========================================

    /**
     * Broadcast updated dashboard counters to all connected clients
     *
     * Този метод се извиква всеки път когато order статуси се променят
     * и dashboard counters трябва да се обновят в real-time. Всички
     * активни dashboard clients получават instant updates без page refresh.
     *
     * Business Use Case:
     * Когато Operator A одобри urgent order, counter-ът за urgent orders
     * трябва да се намали веднага на всички други operator экрани за да
     * предотврати duplicate work на същата поръчка.
     *
     * @param urgentCount текущ брой спешни/приоритетни поръчки (SUBMITTED status)
     * @param pendingCount текущ брой чакащи одобрение поръчки (CONFIRMED status)
     * @param completedCount текущ брой завършени поръчки (SHIPPED status)
     * @param cancelledCount текущ брой отказани поръчки (CANCELLED status)
     */
    void broadcastCounterUpdate(Long urgentCount, Long pendingCount,
                                Long completedCount, Long cancelledCount, Long shippedCount);

    // ==========================================
    // ORDER STATUS CHANGES - за real-time order tracking
    // ==========================================

    /**
     * Broadcast order status change event to all dashboard clients
     *
     * Когато order статус се промени (approval, rejection, shipping),
     * всички dashboard clients трябва да знаят веднага за да могат да:
     * - Update своите order lists в appropriate tabs
     * - Remove orders от старите статус tabs
     * - Add orders към новите статус tabs
     * - Show notification indicators за important changes
     *
     * Business Use Case:
     * Operator A одобрява поръчка от "Urgent" tab. Веднага order-ът
     * изчезва от "Urgent" tab на всички dashboard-и и се появява в
     * "Pending" tab, което предотвратява confusion и duplicate work.
     *
     * @param orderId уникален identifier на поръчката
     * @param newStatus новият status на поръчката (CONFIRMED, SHIPPED, CANCELLED)
     * @param previousStatus предишният status за proper UI transitions
     * @param orderData additional order information за UI display (client name, items, etc.)
     */
    void broadcastOrderStatusChange(Long orderId, String newStatus,
                                    String previousStatus, Map<String, Object> orderData);

    /**
     * Broadcast new order arrival notification to dashboard clients
     *
     * Когато нова поръчка влезе в системата, всички dashboard operators
     * трябва да бъдат notified-и веднага за да могат да react quickly
     * на urgent requests. Това е особено важно за time-sensitive orders.
     *
     * Business Use Case:
     * VIP client изпраща urgent order който трябва да се process-не
     * веднага. Всички operators получават instant notification с
     * highlighted priority indicator за immediate attention.
     *
     * @param orderId уникален identifier на новата поръчка
     * @param orderData comprehensive order information (client, priority, items, deadline)
     */
    void broadcastNewOrder(Long orderId, Map<String, Object> orderData);

    /**
     * Broadcast order modification event to dashboard clients
     *
     * Когато operator направи промени в поръчка (quantity updates,
     * removed products, notes), други operators работещи на същата
     * поръчка или viewing същия dashboard трябва да видят changes
     * в real-time за coordination и conflict prevention.
     *
     * Business Use Case:
     * Operator A намалява quantity на product в поръчка защото
     * stock level е insufficient. Operator B който гледа същата
     * поръчка веднага вижда промяната и може да suggest alternative
     * products или да coordinate с inventory management.
     *
     * @param orderId уникален identifier на поръчката
     * @param modificationType тип на промяната (QUANTITY_UPDATE, PRODUCT_REMOVAL, ORDER_RESET)
     * @param changes detailed information за направените промени
     */
    void broadcastOrderModification(Long orderId, String modificationType,
                                    Map<String, Object> changes);

    // ==========================================
    // SYSTEM-LEVEL BROADCASTS - за general dashboard coordination
    // ==========================================

    /**
     * Broadcast comprehensive dashboard refresh trigger
     *
     * Използва се в exceptional cases когато има significant system
     * changes които изискват пълно refresh на dashboard data instead
     * of incremental updates. Това може да се случи при system
     * maintenance, bulk data updates, или recovery от errors.
     *
     * Business Use Case:
     * Administrative bulk import на orders от external system,
     * или recovery operations след system downtime изискват
     * comprehensive data refresh за consistency.
     *
     * @param reason business-friendly explanation за refresh trigger
     */
    void broadcastDashboardRefresh(String reason);

    /**
     * Send heartbeat signal to test connectivity and monitor client health
     *
     * Utility method за monitoring на WebSocket connection health.
     * Client applications могат да използват heartbeat timing за
     * connection quality assessment и automatic reconnection triggers.
     * Също така useful за debugging connectivity issues.
     *
     * Technical Use Case:
     * Load balancer health checks, connection pool monitoring,
     * network latency measurement, и automatic failover detection.
     */
    void sendHeartbeat();

    // ==========================================
    // CONNECTION MANAGEMENT - за monitoring и lifecycle
    // ==========================================

    /**
     * Get current count of active dashboard connections
     *
     * Monitoring method за operational visibility в броя на активни
     * dashboard users. Полезно за capacity planning, load balancing,
     * и understanding usage patterns за business analytics.
     *
     * Administrative Use Case:
     * System administrators могат да monitor peak usage times,
     * connection stability, и plan infrastructure scaling based
     * на actual usage patterns.
     *
     * @return брой активни WebSocket connections към dashboard clients
     */
    int getActiveConnectionCount();

    /**
     * Check if broadcast service is operational and ready to send messages
     *
     * Health check method за system monitoring и alerting. Returns true
     * ако broadcasting infrastructure е functional и ready за message
     * delivery. Used by health check endpoints и monitoring systems.
     *
     * Operational Use Case:
     * Load balancers и monitoring systems могат да check service health
     * за routing decisions и alerting при infrastructure problems.
     *
     * @return true ако broadcast service е operational, false при problems
     */
    boolean isServiceHealthy();

    // ==========================================
    // ADVANCED FEATURES - за enterprise-level functionality
    // ==========================================

    /**
     * Broadcast message to specific user or user group instead of all clients
     *
     * Advanced targeting functionality за personalized communications.
     * Позволява изпращане на specific messages към specific operators
     * или groups без да spam-ва всички dashboard users.
     *
     * Business Use Case:
     * Manager иска да изпрати specific instructions към определен
     * operator относно specific order, или да notify-ва samo shift
     * supervisors за important policy changes.
     *
     * @param targetUserId specific user ID за targeted message
     * @param messageType тип на съобщението (INSTRUCTION, ALERT, NOTIFICATION)
     * @param messageData content и metadata за съобщението
     */
    void broadcastToUser(Long targetUserId, String messageType, Map<String, Object> messageData);

    /**
     * Broadcast urgent alert that requires immediate operator attention
     *
     * High-priority broadcasting за critical business situations които
     * изискват immediate response. Тези messages се показват with
     * special visual/audio indicators за maximum operator attention.
     *
     * Emergency Use Case:
     * Critical inventory shortage, urgent VIP order, system malfunction,
     * или emergency policy changes които affect ongoing operations
     * и изискват immediate operator awareness и action.
     *
     * @param alertType категория на alert-а (INVENTORY_CRITICAL, VIP_ORDER, SYSTEM_ERROR)
     * @param alertMessage human-readable alert description
     * @param alertData detailed information за alert context и required actions
     */
    void broadcastUrgentAlert(String alertType, String alertMessage, Map<String, Object> alertData);
}