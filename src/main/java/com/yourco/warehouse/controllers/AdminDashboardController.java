package com.yourco.warehouse.controllers;

import com.yourco.warehouse.dto.DashboardDTO;
import com.yourco.warehouse.dto.OrderDTO;
import com.yourco.warehouse.entity.Order;
import com.yourco.warehouse.entity.enums.OrderStatus;
import com.yourco.warehouse.service.DashboardService;
import com.yourco.warehouse.service.DashboardBroadcastService;
import com.yourco.warehouse.repository.OrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * ADMIN DASHBOARD CONTROLLER - COMPLETE DASHBOARD MANAGEMENT WITH WEBSOCKET
 * ========================================================================
 * Обновен контролер с пълна dashboard функционалност и WebSocket интеграция.
 * Имплементира новата бизнес логика за одобряване на цели поръчки с корекции.
 *
 * Архитектурни подобрения:
 * - HTTP responses + automatic WebSocket broadcasts за real-time updates
 * - Order-level operations вместо product-level (нова бизнес логика)
 * - Change tracking system за client notification при корекции
 * - Constructor dependency injection за по-добра testability
 * - Unified error handling с comprehensive logging
 */
@RestController
@RequestMapping("/employer")
@PreAuthorize("hasRole('ADMIN') or hasRole('EMPLOYER')")
public class AdminDashboardController {

    private static final Logger log = LoggerFactory.getLogger(AdminDashboardController.class);

    // Constructor injection за immutable dependencies
    private final DashboardService dashboardService;
    private final DashboardBroadcastService broadcastService;
    private final OrderRepository orderRepository;

    /**
     * Constructor injection осигурява thread-safe dependencies и улеснява unit testing.
     * Spring автоматично ще inject-не правилните implementations based на type.
     */
    @Autowired
    public AdminDashboardController(DashboardService dashboardService,
                                    DashboardBroadcastService broadcastService,
                                    OrderRepository orderRepository) {
        this.dashboardService = dashboardService;
        this.broadcastService = broadcastService;
        this.orderRepository = orderRepository;
        log.info("AdminDashboardController initialized with WebSocket support");
    }

    // ==========================================
    // DASHBOARD DATA ENDPOINTS - основни данни за dashboard
    // ==========================================

    /**
     * Пълен dashboard - всичко наведнъж (запазен original endpoint)
     *
     * Този endpoint връща comprehensive dashboard data включително counters,
     * daily statistics, и initial data за dashboard initialization.
     * Използва се при първоначално зареждане на dashboard-а.
     */
    @GetMapping("/dashboard/overview")
    public ResponseEntity<DashboardDTO> getFullDashboard() {
        try {
            log.debug("Fetching full dashboard overview");

            DashboardDTO dashboard = dashboardService.getFullDashboard();

            if (dashboard.getSuccess()) {
                log.info("Dashboard overview loaded successfully with {} urgent orders",
                        dashboard.getUrgentCount());
                return ResponseEntity.ok(dashboard);
            } else {
                log.warn("Dashboard overview failed: {}", dashboard.getMessage());
                return ResponseEntity.status(500).body(dashboard);
            }

        } catch (Exception e) {
            log.error("Error fetching dashboard overview", e);
            return ResponseEntity.status(500)
                    .body(new DashboardDTO("Грешка при зареждане на dashboard данните"));
        }
    }

    /**
     * Само броячи - за real-time updates (запазен original endpoint)
     *
     * Lightweight endpoint за real-time обновяване на counter values.
     * Автоматично broadcast-ва updates към всички активни dashboard clients
     * чрез WebSocket connection за instant UI synchronization.
     */
    @GetMapping("/dashboard/counters")
    public ResponseEntity<DashboardDTO> getCounters() {
        try {
            log.debug("Fetching dashboard counters for real-time update");

            DashboardDTO counters = dashboardService.getCounters();

            if (counters.getSuccess()) {
                // Automatic WebSocket broadcast към всички dashboard clients
                // Това осигурява че всички операторски екрани са синхронизирани
                broadcastService.broadcastCounterUpdate(
                        counters.getUrgentCount(),
                        counters.getPendingCount(),
                        counters.getCompletedCount(),
                        counters.getCancelledCount()
                );

                log.debug("Counters updated and broadcasted: urgent={}, pending={}, completed={}, cancelled={}",
                        counters.getUrgentCount(), counters.getPendingCount(),
                        counters.getCompletedCount(), counters.getCancelledCount());

                return ResponseEntity.ok(counters);
            } else {
                log.warn("Counter fetch failed: {}", counters.getMessage());
                return ResponseEntity.status(500).body(counters);
            }

        } catch (Exception e) {
            log.error("Error fetching counters", e);
            return ResponseEntity.status(500)
                    .body(new DashboardDTO("Грешка при зареждане на броячите"));
        }
    }

    /**
     * Поръчки по статус (запазен original endpoint)
     *
     * Връща filtered списък с поръчки за specific tab в dashboard-а.
     * Използва се при tab switching и initial tab load operations.
     */
    @GetMapping("/dashboard/orders/{status}")
    public ResponseEntity<DashboardDTO> getOrdersByStatus(
            @PathVariable String status,
            @RequestParam(defaultValue = "10") int limit) {

        try {
            log.debug("Fetching orders by status: {} (limit: {})", status, limit);

            OrderStatus orderStatus = OrderStatus.valueOf(status.toUpperCase());
            DashboardDTO orders = dashboardService.getOrdersByStatus(orderStatus, limit);

            if (orders.getSuccess()) {
                log.info("Retrieved {} orders with status {}",
                        orders.getOrders() != null ? orders.getOrders().size() : 0, status);
                return ResponseEntity.ok(orders);
            } else {
                log.warn("Order fetch failed for status {}: {}", status, orders.getMessage());
                return ResponseEntity.status(500).body(orders);
            }

        } catch (IllegalArgumentException e) {
            log.warn("Invalid order status requested: {}", status);
            return ResponseEntity.badRequest()
                    .body(new DashboardDTO("Невалиден статус: " + status));
        } catch (Exception e) {
            log.error("Error fetching orders by status {}", status, e);
            return ResponseEntity.status(500)
                    .body(new DashboardDTO("Грешка при зареждане на поръчките"));
        }
    }

    // ==========================================
    // NEW ORDER MANAGEMENT ENDPOINTS - нова функционалност
    // ==========================================

    /**
     * JSON API за order details - ЗА JAVASCRIPT ЗАЯВКИ
     * Този endpoint връща само JSON данни за AJAX заявките от JavaScript-а
     */
    // В AdminDashboardController.java промени endpoint-а от /details на /data

    /**
     * JSON API за order данни - ЗА JAVASCRIPT И REAL-TIME UPDATES
     * ПРОМЕНЕН ENDPOINT: /dashboard/order/{orderId}/data (вместо /details)
     *
     * Този endpoint служи само JSON данни за:
     * - AJAX заявки от JavaScript-а
     * - Real-time обновления през WebSocket
     * - Inventory synchronization
     */
    @GetMapping("/dashboard/order/{orderId}/orderDetailData")
    public ResponseEntity<Map<String, Object>> getOrderData(@PathVariable Long orderId) {
        try {

            // Използваме същия service като HTML endpoint-а
            DashboardDTO orderDetails = dashboardService.getOrderDetails(orderId);

            if (!orderDetails.getSuccess()) {
                log.warn("Failed to load order data for JSON API {}: {}", orderId, orderDetails.getMessage());
                return ResponseEntity.status(404).body(Map.of(
                        "success", false,
                        "message", orderDetails.getMessage()
                ));
            }

            OrderDTO order = orderDetails.getOrder();
            if (order == null) {
                log.error("Order data is null in JSON API response for order {}", orderId);
                return ResponseEntity.status(500).body(Map.of(
                        "success", false,
                        "message", "Order data unavailable"
                ));
            }

            // Структурираме JSON отговора точно както JavaScript-ът очаква
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", order); // JavaScript в orderReviewCatalog.js очаква data.items
            response.put("message", "Order data loaded successfully");
            response.put("orderId", orderId);
            response.put("itemsCount", order.getItems() != null ? order.getItems().size() : 0);

            // Добавяме timestamp за real-time tracking
            response.put("timestamp", java.time.LocalDateTime.now());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Critical error in JSON API for order data {}", orderId, e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "System error occurred"
            ));
        }
    }


    /**
     * Update product quantity in order with change tracking
     *
     * Ново: заменя single product approval логиката с quantity modification.
     * Автоматично track-ва промените за generation на correction message
     * при order approval. Broadcast-ва real-time updates за координация
     * между multiple operators които работят на същата поръчка.
     */
    @PutMapping("/dashboard/order/{orderId}/product/{productId}/quantity")
    public ResponseEntity<DashboardDTO> updateProductQuantity(
            @PathVariable Long orderId,
            @PathVariable Long productId,
            @RequestBody Map<String, Object> request) {

        try {
            Integer newQuantity = (Integer) request.get("quantity");
            log.info("Updating quantity for product {} in order {} to {}",
                    productId, orderId, newQuantity);

            DashboardDTO response = dashboardService.updateProductQuantity(orderId, productId, newQuantity);

            if (response.getSuccess()) {
                // Broadcast modification to other dashboard users за real-time collaboration
                Map<String, Object> changes = new HashMap<>();
                changes.put("productId", productId);
                changes.put("oldQuantity", request.get("oldQuantity"));
                changes.put("newQuantity", newQuantity);

                broadcastService.broadcastOrderModification(orderId, "QUANTITY_UPDATE", changes);

                log.info("Product quantity updated and broadcasted for order {}", orderId);
                return ResponseEntity.ok(response);
            } else {
                log.warn("Quantity update failed for product {} in order {}: {}",
                        productId, orderId, response.getMessage());
                return ResponseEntity.status(500).body(response);
            }

        } catch (Exception e) {
            log.error("Error updating product quantity for product {} in order {}", productId, orderId, e);
            return ResponseEntity.status(500)
                    .body(new DashboardDTO("Грешка при обновяване на количеството"));
        }
    }

    /**
     * Remove product from order completely
     *
     * Ново: премахване на артикули с documented reason.
     * Използва се когато specific products не са available или
     * не могат да бъдат доставени в requested time frame.
     */
    @DeleteMapping("/dashboard/order/{orderId}/product/{productId}")
    public ResponseEntity<DashboardDTO> removeProductFromOrder(
            @PathVariable Long orderId,
            @PathVariable Long productId,
            @RequestBody Map<String, Object> request) {

        try {
            String reason = (String) request.get("removalReason");
            log.info("Removing product {} from order {} with reason: {}",
                    productId, orderId, reason);

            DashboardDTO response = dashboardService.removeProductFromOrder(orderId, productId, reason);

            if (response.getSuccess()) {
                // Broadcast product removal за other operators
                Map<String, Object> changes = new HashMap<>();
                changes.put("productId", productId);
                changes.put("action", "REMOVED");
                changes.put("reason", reason);

                broadcastService.broadcastOrderModification(orderId, "PRODUCT_REMOVAL", changes);

                log.info("Product {} removed from order {} and broadcasted", productId, orderId);
                return ResponseEntity.ok(response);
            } else {
                log.warn("Product removal failed for product {} in order {}: {}",
                        productId, orderId, response.getMessage());
                return ResponseEntity.status(500).body(response);
            }

        } catch (Exception e) {
            log.error("Error removing product {} from order {}", productId, orderId, e);
            return ResponseEntity.status(500)
                    .body(new DashboardDTO("Грешка при премахване на продукта"));
        }
    }

    /**
     * Approve entire order (with automatic correction message if modified)
     *
     * КЛЮЧОВА НОВА ФУНКЦИОНАЛНОСТ: одобряване на цяла поръчка.
     * Ако има направени промени (quantity changes, removed products),
     * автоматично генерира correction message и го изпраща до клиента.
     * Това е core business logic за warehouse operations.
     */
    @PostMapping("/dashboard/order/{orderId}/approve")
    public ResponseEntity<DashboardDTO> approveOrder(
            @PathVariable Long orderId,
            @RequestBody Map<String, Object> request) {

        try {
            String operatorNote = (String) request.get("operatorNote");
            log.info("Approving order {} with operator note: {}", orderId, operatorNote);

            Optional<Order> orderOpt = orderRepository.findById(orderId);
            if (orderOpt.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new DashboardDTO("Поръчката не е намерена"));
            }
            String originalStatus = orderOpt.get().getStatus().name();

            DashboardDTO response = dashboardService.approveOrderWithCorrections(orderId, operatorNote);

            if (response.getSuccess()) {
                // Broadcast order status change за real-time dashboard updates
                Map<String, Object> orderData = new HashMap<>();
                orderData.put("orderId", orderId);
                orderData.put("operatorNote", operatorNote);
                orderData.put("hasCorrections", response.getMessage().contains("корекции"));

                broadcastService.broadcastOrderStatusChange(
                        orderId, "CONFIRMED", originalStatus, orderData);

                // Trigger automatic counter update broadcast
                this.getCounters();
                log.info("Order {} approved and status change broadcasted", orderId);
                return ResponseEntity.ok(response);
            } else {
                log.warn("Order approval failed for order {}: {}", orderId, response.getMessage());
                return ResponseEntity.status(500).body(response);
            }

        } catch (Exception e) {
            log.error("Error approving order {}", orderId, e);
            return ResponseEntity.status(500)
                    .body(new DashboardDTO("Грешка при одобряване на поръчката"));
        }
    }

    /**
     * Reject entire order with reason
     *
     * КЛЮЧОВА НОВА ФУНКЦИОНАЛНОСТ: отказ на цяла поръчка.
     * Автоматично изпраща rejection notification до клиента
     * и release-ва reserved inventory за други поръчки.
     */
    @PostMapping("/dashboard/order/{orderId}/reject")
    public ResponseEntity<DashboardDTO> rejectOrder(
            @PathVariable Long orderId,
            @RequestBody Map<String, Object> request) {

        try {
            String rejectionReason = (String) request.get("rejectionReason");
            log.info("Rejecting order {} with reason: {}", orderId, rejectionReason);

            Optional<Order> orderOpt = orderRepository.findById(orderId);
            if (orderOpt.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new DashboardDTO("Поръчката не е намерена"));
            }
            String originalStatus = orderOpt.get().getStatus().name();

            DashboardDTO response = dashboardService.rejectOrderWithNotification(orderId, rejectionReason);

            if (response.getSuccess()) {
                // Broadcast order status change
                Map<String, Object> orderData = new HashMap<>();
                orderData.put("orderId", orderId);
                orderData.put("rejectionReason", rejectionReason);

                broadcastService.broadcastOrderStatusChange(
                        orderId, "CANCELLED", originalStatus, orderData);

                this.getCounters();
                log.info("Order {} rejected and status change broadcasted", orderId);

                return ResponseEntity.ok(response);
            } else {
                log.warn("Order rejection failed for order {}: {}", orderId, response.getMessage());
                return ResponseEntity.status(500).body(response);
            }

        } catch (Exception e) {
            log.error("Error rejecting order {}", orderId, e);
            return ResponseEntity.status(500)
                    .body(new DashboardDTO("Грешка при отказване на поръчката"));
        }
    }

    // ==========================================
    // CHANGE TRACKING ENDPOINTS - за order modification history
    // ==========================================

    /**
     * Get order changes (diff between original and current state)
     *
     * Показва comprehensive diff на всички промени направени в поръчката.
     * Използва се за operator review преди approval и за generation
     * на correction message който се изпраща до клиента.
     */
    @GetMapping("/dashboard/order/{orderId}/changes")
    public ResponseEntity<DashboardDTO> getOrderChanges(@PathVariable Long orderId) {
        try {
            log.debug("Fetching change summary for order {}", orderId);

            DashboardDTO changes = dashboardService.getOrderChangesSummary(orderId);

            if (changes.getSuccess()) {
                log.info("Change summary loaded for order {}", orderId);
                return ResponseEntity.ok(changes);
            } else {
                log.warn("Failed to load changes for order {}: {}", orderId, changes.getMessage());
                return ResponseEntity.status(500).body(changes);
            }

        } catch (Exception e) {
            log.error("Error fetching order changes for order {}", orderId, e);
            return ResponseEntity.status(500)
                    .body(new DashboardDTO("Грешка при зареждане на промените"));
        }
    }

    /**
     * Reset order changes (revert to original state)
     *
     * Позволява на operator да върне поръчката в original състояние
     * ако е направил грешки или иска да започне отначало.
     */
    @PostMapping("/dashboard/order/{orderId}/reset")
    public ResponseEntity<DashboardDTO> resetOrderChanges(@PathVariable Long orderId) {
        try {
            log.info("Resetting all changes for order {}", orderId);

            DashboardDTO response = dashboardService.resetOrderToOriginalState(orderId);

            if (response.getSuccess()) {
                // Broadcast order modification за other users
                Map<String, Object> changes = new HashMap<>();
                changes.put("action", "RESET_TO_ORIGINAL");

                broadcastService.broadcastOrderModification(orderId, "ORDER_RESET", changes);

                log.info("Order {} reset to original state and broadcasted", orderId);
                return ResponseEntity.ok(response);
            } else {
                log.warn("Order reset failed for order {}: {}", orderId, response.getMessage());
                return ResponseEntity.status(500).body(response);
            }

        } catch (Exception e) {
            log.error("Error resetting order changes for order {}", orderId, e);
            return ResponseEntity.status(500)
                    .body(new DashboardDTO("Грешка при възстановяване на промените"));
        }


    }


    @PostMapping("/dashboard/order/{orderId}/validate-inventory")
    public ResponseEntity<DashboardDTO> validateInventoryForChanges(
            @PathVariable Long orderId,
            @RequestBody Map<String, Object> request) {

        try {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> changes = (List<Map<String, Object>>) request.get("changes");

            DashboardDTO result = dashboardService.validateInventoryForOrderChanges(orderId, changes);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Error validating inventory for order {}", orderId, e);
            return ResponseEntity.status(500).body(new DashboardDTO("Грешка при проверка на наличности"));
        }
    }

    @PostMapping("/dashboard/order/{orderId}/approve-with-changes")
    public ResponseEntity<DashboardDTO> approveOrderWithBatchChanges(
            @PathVariable Long orderId,
            @RequestBody Map<String, Object> request) {

        try {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> changes = (List<Map<String, Object>>) request.get("changes");
            String operatorNote = (String) request.get("operatorNote");
            String changesSummary = (String) request.get("changesSummary");

            DashboardDTO response = dashboardService.approveOrderWithBatchChanges(orderId, changes, operatorNote, changesSummary);

            if (response.getSuccess()) {
                broadcastService.broadcastOrderStatusChange(orderId, "CONFIRMED", "PENDING", new HashMap<>());
                this.getCounters();
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error approving order {} with changes", orderId, e);
            return ResponseEntity.status(500).body(new DashboardDTO("Грешка при одобряване"));
        }
    }




}