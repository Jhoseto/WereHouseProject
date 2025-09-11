package com.yourco.warehouse.service.impl;

import com.yourco.warehouse.service.DashboardBroadcastService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.user.SimpUserRegistry;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * DASHBOARD BROADCAST SERVICE IMPLEMENTATION - WEBSOCKET-BASED REAL-TIME COMMUNICATION
 * ===================================================================================
 * Implementation на dashboard broadcasting functionality using Spring WebSocket/STOMP.
 *
 * Архитектурни компоненти:
 * - SimpMessagingTemplate за WebSocket message sending
 * - SimpUserRegistry за connection tracking и monitoring
 * - Event-driven architecture за automatic broadcast triggering
 * - Connection health monitoring за operational visibility
 * - Comprehensive error handling за robust message delivery
 * - Performance tracking за system monitoring
 *
 * Technology Stack:
 * - Spring WebSocket + STOMP protocol за structured messaging
 * - Topic-based routing за selective message delivery
 * - JSON serialization за type-safe message content
 * - Automatic connection management via Spring infrastructure
 *
 * Production Considerations:
 * - Graceful degradation при messaging failures
 * - Monitoring capabilities за operational visibility
 * - Performance optimization за high-throughput scenarios
 * - Security integration със Spring Security context
 */
@Service
public class DashboardBroadcastServiceImpl implements DashboardBroadcastService {

    private static final Logger log = LoggerFactory.getLogger(DashboardBroadcastServiceImpl.class);

    // Message destination constants за type-safe routing
    private static final String TOPIC_COUNTERS = "/topic/dashboard/counters";
    private static final String TOPIC_ORDERS = "/topic/dashboard/orders";
    private static final String TOPIC_REFRESH = "/topic/dashboard/refresh";
    private static final String TOPIC_HEARTBEAT = "/topic/dashboard/heartbeat";
    private static final String TOPIC_ALERTS = "/topic/dashboard/alerts";
    private static final String USER_NOTIFICATIONS = "/user/notifications";

    // Dependencies injected via constructor for immutability
    private final SimpMessagingTemplate messagingTemplate;
    private final SimpUserRegistry userRegistry;

    // Performance и monitoring metrics
    private final AtomicInteger messagesSent = new AtomicInteger(0);
    private final AtomicInteger messagesFailures = new AtomicInteger(0);
    private volatile LocalDateTime lastHeartbeat;
    private volatile boolean serviceHealthy = true;

    /**
     * Constructor injection осигурява immutable dependencies и улеснява testing.
     * SimpMessagingTemplate е Spring's high-level abstraction за WebSocket messaging.
     * SimpUserRegistry предоставя visibility в активни user connections.
     */
    @Autowired
    public DashboardBroadcastServiceImpl(SimpMessagingTemplate messagingTemplate,
                                         SimpUserRegistry userRegistry) {
        this.messagingTemplate = messagingTemplate;
        this.userRegistry = userRegistry;
        this.lastHeartbeat = LocalDateTime.now();

        log.info("DashboardBroadcastService initialized with WebSocket/STOMP messaging");
        log.info("Broadcasting destinations configured: counters={}, orders={}, alerts={}",
                TOPIC_COUNTERS, TOPIC_ORDERS, TOPIC_ALERTS);
    }

    // ==========================================
    // COUNTER UPDATES - за real-time dashboard statistics
    // ==========================================

    /**
     * {@inheritDoc}
     *
     * Implementation Notes:
     * - Создава structured JSON payload за type-safe client consumption
     * - Включва timestamp за client-side staleness detection
     * - Uses atomic broadcast за consistency между multiple dashboard clients
     * - Includes alert indicators за urgent attention requirements
     */
    @Override
    public void broadcastCounterUpdate(Long urgentCount, Long pendingCount,
                                       Long completedCount, Long cancelledCount) {
        try {
            log.debug("Broadcasting counter update: urgent={}, pending={}, completed={}, cancelled={}",
                    urgentCount, pendingCount, completedCount, cancelledCount);

            // Create structured message payload
            Map<String, Object> counterData = new HashMap<>();
            counterData.put("urgentCount", urgentCount != null ? urgentCount : 0L);
            counterData.put("pendingCount", pendingCount != null ? pendingCount : 0L);
            counterData.put("completedCount", completedCount != null ? completedCount : 0L);
            counterData.put("cancelledCount", cancelledCount != null ? cancelledCount : 0L);
            counterData.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
            counterData.put("hasUrgentAlerts", urgentCount != null && urgentCount > 0);
            counterData.put("totalActive", urgentCount + pendingCount);

            // Broadcast to all dashboard clients subscribed to counters topic
            messagingTemplate.convertAndSend(TOPIC_COUNTERS, counterData);

            // Update performance metrics
            messagesSent.incrementAndGet();

            log.info("Counter update broadcasted successfully to {} active connections",
                    getActiveConnectionCount());

        } catch (Exception e) {
            messagesFailures.incrementAndGet();
            serviceHealthy = false;
            log.error("Failed to broadcast counter update", e);

            // В production environment, тук може да добавите alerting mechanism
            // за immediate notification на operations team при messaging failures
        }
    }

    // ==========================================
    // ORDER STATUS CHANGES - за real-time order tracking
    // ==========================================

    /**
     * {@inheritDoc}
     *
     * Implementation Notes:
     * - Event payload includes comprehensive order context за UI updates
     * - Status transition information помага clients да animate changes
     * - Includes metadata за business analytics и audit trail
     * - Optimized JSON structure за minimal bandwidth usage
     */
    @Override
    public void broadcastOrderStatusChange(Long orderId, String newStatus,
                                           String previousStatus, Map<String, Object> orderData) {
        try {
            log.info("Broadcasting order status change: order={}, {} -> {}",
                    orderId, previousStatus, newStatus);

            // Create comprehensive event payload
            Map<String, Object> eventData = new HashMap<>();
            eventData.put("eventType", "STATUS_CHANGED");
            eventData.put("orderId", orderId);
            eventData.put("newStatus", newStatus);
            eventData.put("previousStatus", previousStatus);
            eventData.put("orderData", orderData != null ? orderData : new HashMap<>());
            eventData.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
            eventData.put("messageId", generateMessageId()); // За deduplication в client

            // Add business context за UI enhancement
            eventData.put("requiresAttention", isHighPriorityStatusChange(newStatus, previousStatus));
            eventData.put("workflowStage", mapStatusToWorkflowStage(newStatus));

            // Broadcast to all dashboard clients subscribed to orders topic
            messagingTemplate.convertAndSend(TOPIC_ORDERS, eventData);

            messagesSent.incrementAndGet();

            log.info("Order status change broadcasted successfully (order: {}, connections: {})",
                    orderId, getActiveConnectionCount());

        } catch (Exception e) {
            messagesFailures.incrementAndGet();
            log.error("Failed to broadcast order status change for order {}", orderId, e);
        }
    }

    /**
     * {@inheritDoc}
     *
     * Implementation Notes:
     * - New order events receive highest priority processing
     * - Includes comprehensive order metadata за immediate operator assessment
     * - Special handling за urgent/VIP orders с enhanced notification
     * - Triggers automatic dashboard attention indicators
     */
    @Override
    public void broadcastNewOrder(Long orderId, Map<String, Object> orderData) {
        try {
            log.info("Broadcasting new order arrival: order={}", orderId);

            Map<String, Object> eventData = new HashMap<>();
            eventData.put("eventType", "NEW_ORDER");
            eventData.put("orderId", orderId);
            eventData.put("orderData", orderData != null ? orderData : new HashMap<>());
            eventData.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
            eventData.put("messageId", generateMessageId());

            // Enhanced metadata за new order processing
            eventData.put("isUrgent", determineOrderUrgency(orderData));
            eventData.put("estimatedProcessingTime", calculateProcessingEstimate(orderData));
            eventData.put("requiresSpecialHandling", checkSpecialRequirements(orderData));

            // Broadcast to all dashboard clients
            messagingTemplate.convertAndSend(TOPIC_ORDERS, eventData);

            messagesSent.incrementAndGet();

            log.info("New order broadcasted successfully (order: {}, urgent: {}, connections: {})",
                    orderId, eventData.get("isUrgent"), getActiveConnectionCount());

        } catch (Exception e) {
            messagesFailures.incrementAndGet();
            log.error("Failed to broadcast new order {}", orderId, e);
        }
    }

    /**
     * {@inheritDoc}
     *
     * Implementation Notes:
     * - Modification events support collaborative editing scenarios
     * - Includes detailed change information за conflict resolution
     * - Operator identification за accountability и communication
     * - Real-time coordination между multiple dashboard users
     */
    @Override
    public void broadcastOrderModification(Long orderId, String modificationType,
                                           Map<String, Object> changes) {
        try {
            log.info("Broadcasting order modification: order={}, type={}", orderId, modificationType);

            Map<String, Object> eventData = new HashMap<>();
            eventData.put("eventType", "ORDER_MODIFIED");
            eventData.put("orderId", orderId);
            eventData.put("modificationType", modificationType);
            eventData.put("changes", changes != null ? changes : new HashMap<>());
            eventData.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
            eventData.put("messageId", generateMessageId());

            // Collaboration metadata за multi-user coordination
            eventData.put("requiresReview", isSignificantModification(modificationType));
            eventData.put("affectsInventory", modificationAffectsInventory(modificationType));

            // TODO: Add current operator information когато user context е available
            // eventData.put("operatorId", getCurrentOperatorId());
            // eventData.put("operatorName", getCurrentOperatorName());

            messagingTemplate.convertAndSend(TOPIC_ORDERS, eventData);

            messagesSent.incrementAndGet();

            log.info("Order modification broadcasted successfully (order: {}, type: {}, connections: {})",
                    orderId, modificationType, getActiveConnectionCount());

        } catch (Exception e) {
            messagesFailures.incrementAndGet();
            log.error("Failed to broadcast order modification for order {}", orderId, e);
        }
    }

    // ==========================================
    // SYSTEM-LEVEL BROADCASTS - за general dashboard coordination
    // ==========================================

    /**
     * {@inheritDoc}
     *
     * Implementation Notes:
     * - Dashboard refresh events trigger comprehensive client-side reload
     * - Includes reason information за user communication
     * - Used sparingly за major system changes
     * - Provides graceful coordination для maintenance windows
     */
    @Override
    public void broadcastDashboardRefresh(String reason) {
        try {
            log.info("Broadcasting dashboard refresh request: reason={}", reason);

            Map<String, Object> eventData = new HashMap<>();
            eventData.put("eventType", "DASHBOARD_REFRESH");
            eventData.put("reason", reason != null ? reason : "System update");
            eventData.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
            eventData.put("messageId", generateMessageId());
            eventData.put("refreshType", "FULL"); // За future partial refresh support

            messagingTemplate.convertAndSend(TOPIC_REFRESH, eventData);

            messagesSent.incrementAndGet();

            log.info("Dashboard refresh broadcasted successfully (reason: {}, connections: {})",
                    reason, getActiveConnectionCount());

        } catch (Exception e) {
            messagesFailures.incrementAndGet();
            log.error("Failed to broadcast dashboard refresh", e);
        }
    }

    /**
     * {@inheritDoc}
     *
     * Implementation Notes:
     * - Heartbeat messages support connection health monitoring
     * - Client applications can measure latency и detect connection issues
     * - Minimal payload за bandwidth efficiency
     * - Used by monitoring systems за service health assessment
     */
    @Override
    public void sendHeartbeat() {
        try {
            log.debug("Sending heartbeat to dashboard clients");

            Map<String, Object> heartbeat = new HashMap<>();
            heartbeat.put("eventType", "HEARTBEAT");
            heartbeat.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
            heartbeat.put("serverStatus", serviceHealthy ? "HEALTHY" : "DEGRADED");
            heartbeat.put("activeConnections", getActiveConnectionCount());
            heartbeat.put("messagesSent", messagesSent.get());

            messagingTemplate.convertAndSend(TOPIC_HEARTBEAT, heartbeat);

            lastHeartbeat = LocalDateTime.now();
            messagesSent.incrementAndGet();

            log.debug("Heartbeat sent successfully to {} connections", getActiveConnectionCount());

        } catch (Exception e) {
            messagesFailures.incrementAndGet();
            log.error("Failed to send heartbeat", e);
        }
    }

    // ==========================================
    // CONNECTION MANAGEMENT - за monitoring и lifecycle
    // ==========================================

    /**
     * {@inheritDoc}
     *
     * Implementation Notes:
     * - Uses SimpUserRegistry за accurate connection counting
     * - Returns real-time count на active WebSocket sessions
     * - Essential за capacity planning и performance monitoring
     */
    @Override
    public int getActiveConnectionCount() {
        try {
            return userRegistry.getUserCount();
        } catch (Exception e) {
            log.error("Failed to get active connection count", e);
            return 0; // Defensive response
        }
    }

    /**
     * {@inheritDoc}
     *
     * Implementation Notes:
     * - Health assessment based на recent messaging success rate
     * - Considers connection stability и error patterns
     * - Used by load balancers и monitoring systems
     */
    @Override
    public boolean isServiceHealthy() {
        try {
            // Consider service healthy if:
            // 1. Recent heartbeat sent successfully
            // 2. Low error rate в recent operations
            // 3. Messaging infrastructure operational

            boolean recentHeartbeat = lastHeartbeat != null &&
                    lastHeartbeat.isAfter(LocalDateTime.now().minusMinutes(5));

            int totalMessages = messagesSent.get();
            int failures = messagesFailures.get();
            boolean lowErrorRate = totalMessages == 0 || (failures * 100.0 / totalMessages) < 5.0;

            boolean healthy = serviceHealthy && recentHeartbeat && lowErrorRate;

            log.debug("Service health check: healthy={}, recentHeartbeat={}, errorRate={}%",
                    healthy, recentHeartbeat,
                    totalMessages > 0 ? (failures * 100.0 / totalMessages) : 0.0);

            return healthy;

        } catch (Exception e) {
            log.error("Failed to assess service health", e);
            return false; // Defensive response при health check errors
        }
    }

    // ==========================================
    // ADVANCED FEATURES - за enterprise-level functionality
    // ==========================================

    /**
     * {@inheritDoc}
     *
     * Implementation Notes:
     * - User-specific targeting използва Spring's user destination support
     * - Requires user authentication context за proper routing
     * - Enables personalized communication flows
     */
    @Override
    public void broadcastToUser(Long targetUserId, String messageType, Map<String, Object> messageData) {
        try {
            log.info("Broadcasting targeted message to user {}: type={}", targetUserId, messageType);

            Map<String, Object> targetedMessage = new HashMap<>();
            targetedMessage.put("messageType", messageType);
            targetedMessage.put("messageData", messageData != null ? messageData : new HashMap<>());
            targetedMessage.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
            targetedMessage.put("messageId", generateMessageId());
            targetedMessage.put("targetUserId", targetUserId);

            // Use Spring's user-specific destination routing
            String userDestination = USER_NOTIFICATIONS + "/" + targetUserId;
            messagingTemplate.convertAndSend(userDestination, targetedMessage);

            messagesSent.incrementAndGet();

            log.info("Targeted message broadcasted successfully to user {}", targetUserId);

        } catch (Exception e) {
            messagesFailures.incrementAndGet();
            log.error("Failed to broadcast targeted message to user {}", targetUserId, e);
        }
    }

    /**
     * {@inheritDoc}
     *
     * Implementation Notes:
     * - Urgent alerts receive highest priority routing
     * - Enhanced visual/audio indicators support в client applications
     * - Critical business communication за immediate operator response
     */
    @Override
    public void broadcastUrgentAlert(String alertType, String alertMessage, Map<String, Object> alertData) {
        try {
            log.warn("Broadcasting urgent alert: type={}, message={}", alertType, alertMessage);

            Map<String, Object> urgentAlert = new HashMap<>();
            urgentAlert.put("alertType", alertType);
            urgentAlert.put("alertMessage", alertMessage);
            urgentAlert.put("alertData", alertData != null ? alertData : new HashMap<>());
            urgentAlert.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
            urgentAlert.put("messageId", generateMessageId());
            urgentAlert.put("priority", "URGENT");
            urgentAlert.put("requiresAcknowledgment", true);

            // Broadcast to specialized alerts topic за enhanced client handling
            messagingTemplate.convertAndSend(TOPIC_ALERTS, urgentAlert);

            messagesSent.incrementAndGet();

            log.warn("Urgent alert broadcasted successfully: type={}, connections={}",
                    alertType, getActiveConnectionCount());

        } catch (Exception e) {
            messagesFailures.incrementAndGet();
            log.error("Failed to broadcast urgent alert: type={}", alertType, e);
        }
    }

    // ==========================================
    // EVENT LISTENERS - automatic broadcast triggering
    // ==========================================

    /**
     * Listen for application events и automatically broadcast them
     *
     * Този pattern позволява на други services да просто publish events
     * без да се грижат за WebSocket broadcasting logic. Broadcasting
     * service автоматично ще catch events и ще ги forward към clients.
     */
    @EventListener
    public void handleOrderStatusChangeEvent(OrderStatusChangeEvent event) {
        broadcastOrderStatusChange(
                event.getOrderId(),
                event.getNewStatus(),
                event.getPreviousStatus(),
                event.getOrderData()
        );
    }

    @EventListener
    public void handleNewOrderEvent(NewOrderEvent event) {
        broadcastNewOrder(event.getOrderId(), event.getOrderData());
    }

    // ==========================================
    // PRIVATE HELPER METHODS - internal utilities
    // ==========================================

    /**
     * Generate unique message ID за client-side deduplication
     */
    private String generateMessageId() {
        return "msg_" + System.currentTimeMillis() + "_" + Math.random();
    }

    /**
     * Determine if status change requires immediate operator attention
     */
    private boolean isHighPriorityStatusChange(String newStatus, String previousStatus) {
        // New urgent orders
        // Failed orders
        return "SUBMITTED".equals(newStatus) || "CANCELLED".equals(newStatus); // Reverted orders
    }

    /**
     * Map order status to workflow stage за UI enhancement
     */
    private String mapStatusToWorkflowStage(String status) {
        return switch (status) {
            case "SUBMITTED" -> "INTAKE";
            case "CONFIRMED" -> "PROCESSING";
            case "SHIPPED" -> "FULFILLMENT";
            case "CANCELLED" -> "RESOLVED";
            default -> "UNKNOWN";
        };
    }

    /**
     * Determine order urgency based на order metadata
     */
    private boolean determineOrderUrgency(Map<String, Object> orderData) {
        if (orderData == null) return false;

        // TODO: Implement sophisticated urgency detection logic
        // Consider factors like: client priority, deadline, order value, special requirements
        return orderData.containsKey("priority") &&
                "HIGH".equals(orderData.get("priority"));
    }

    /**
     * Calculate estimated processing time за new orders
     */
    private String calculateProcessingEstimate(Map<String, Object> orderData) {
        // TODO: Implement processing time estimation based on order complexity
        return "2-4 hours"; // Placeholder estimation
    }

    /**
     * Check if order requires special handling procedures
     */
    private boolean checkSpecialRequirements(Map<String, Object> orderData) {
        if (orderData == null) return false;

        // TODO: Implement special requirements detection
        return orderData.containsKey("specialHandling") ||
                orderData.containsKey("customInstructions");
    }

    /**
     * Determine if modification type requires management review
     */
    private boolean isSignificantModification(String modificationType) {
        return "PRODUCT_REMOVAL".equals(modificationType) ||
                "ORDER_RESET".equals(modificationType);
    }

    /**
     * Check if modification affects inventory levels
     */
    private boolean modificationAffectsInventory(String modificationType) {
        return "QUANTITY_UPDATE".equals(modificationType) ||
                "PRODUCT_REMOVAL".equals(modificationType);
    }
}

// ==========================================
// EVENT CLASSES - за type-safe event publishing
// ==========================================

/**
 * Event class за order status changes
 * Reused from DashboardBroadcastService.java creation
 */
class OrderStatusChangeEvent {
    private final Long orderId;
    private final String newStatus;
    private final String previousStatus;
    private final Map<String, Object> orderData;

    public OrderStatusChangeEvent(Long orderId, String newStatus, String previousStatus, Map<String, Object> orderData) {
        this.orderId = orderId;
        this.newStatus = newStatus;
        this.previousStatus = previousStatus;
        this.orderData = orderData;
    }

    // Getters
    public Long getOrderId() { return orderId; }
    public String getNewStatus() { return newStatus; }
    public String getPreviousStatus() { return previousStatus; }
    public Map<String, Object> getOrderData() { return orderData; }
}

/**
 * Event class за new orders
 * Reused from DashboardBroadcastService.java creation
 */
class NewOrderEvent {
    private final Long orderId;
    private final Map<String, Object> orderData;

    public NewOrderEvent(Long orderId, Map<String, Object> orderData) {
        this.orderId = orderId;
        this.orderData = orderData;
    }

    // Getters
    public Long getOrderId() { return orderId; }
    public Map<String, Object> getOrderData() { return orderData; }
}