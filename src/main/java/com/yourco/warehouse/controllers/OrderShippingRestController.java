package com.yourco.warehouse.controllers;

import com.yourco.warehouse.service.OrderShippingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * ORDER SHIPPING REST CONTROLLER - ПЪЛНА ИМПЛЕМЕНТАЦИЯ
 * ==================================================
 * REST API за товарна логика с всички Service методи
 */
@RestController
@RequestMapping("/api/loading")
@PreAuthorize("hasRole('ADMIN') or hasRole('EMPLOYER')")
public class OrderShippingRestController {

    private static final Logger log = LoggerFactory.getLogger(OrderShippingRestController.class);

    private final OrderShippingService orderShippingService;

    @Autowired
    public OrderShippingRestController(OrderShippingService orderShippingService) {
        this.orderShippingService = orderShippingService;
    }

    // ==========================================
    // ОСНОВНИ SHIPPING ОПЕРАЦИИ
    // ==========================================

    /**
     * Стартира товарене - POST /api/loading/start
     * Request: { orderId, truckNumber, employeeId }
     * Response: { success: true, sessionId: 123, totalItems: 15 }
     */
    @PostMapping("/start")
    public ResponseEntity<?> startLoading(@RequestBody Map<String, Object> request) {
        try {
            Long orderId = ((Number) request.get("orderId")).longValue();
            String truckNumber = (String) request.get("truckNumber");
            Long employeeId = ((Number) request.get("employeeId")).longValue();
            String employeeUsername = (String) request.get("employeeUsername");

            log.debug("Starting loading for order {} with truck {} by employee {}",
                    orderId, truckNumber, employeeId);

            // РЕАЛЕН SERVICE CALL
            Map<String, Object> result = orderShippingService.startShipping(
                    orderId, truckNumber, employeeId, employeeUsername);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Error starting loading: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Toggle артикул - PATCH /api/loading/toggle-item
     * Request: { sessionId, itemId }
     * Response: { success: true, isLoaded: true }
     */
    @PatchMapping("/toggle-item")
    public ResponseEntity<?> toggleItem(@RequestBody Map<String, Object> request) {
        try {
            Long sessionId = ((Number) request.get("sessionId")).longValue();
            Long itemId = ((Number) request.get("itemId")).longValue();

            log.debug("Toggling item {} in session {}", itemId, sessionId);

            // РЕАЛЕН SERVICE CALL
            Map<String, Object> result = orderShippingService.toggleItem(sessionId, itemId);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Error toggling item: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Завършва товарене - POST /api/loading/complete
     * Request: { sessionId }
     * Response: { success: true, orderId: 123, totalDuration: 3600 }
     */
    @PostMapping("/complete")
    public ResponseEntity<?> completeLoading(@RequestBody Map<String, Object> request) {
        try {
            Long sessionId = ((Number) request.get("sessionId")).longValue();

            log.debug("Completing loading for session {}", sessionId);

            // РЕАЛЕН SERVICE CALL
            Map<String, Object> result = orderShippingService.completeShipping(sessionId);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Error completing loading: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Получава статус на товарене - GET /api/loading/status/{orderId}
     * Response: { hasActiveSession: true, session: {...} } или 404
     */
    @GetMapping("/status/{orderId}")
    public ResponseEntity<?> getLoadingStatus(@PathVariable Long orderId) {
        try {
            log.debug("Getting loading status for order {}", orderId);

            // РЕАЛЕН SERVICE CALL
            Map<String, Object> result = orderShippingService.getShippingStatus(orderId);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Error getting loading status for order {}: {}", orderId, e.getMessage(), e);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Heartbeat за поддържане на връзка - PATCH /api/loading/heartbeat
     * Request: { sessionId }
     * Response: OK или error
     */
    @PatchMapping("/heartbeat")
    public ResponseEntity<?> sendHeartbeat(@RequestBody Map<String, Object> request) {
        try {
            Long sessionId = ((Number) request.get("sessionId")).longValue();

            log.trace("Heartbeat for session {}", sessionId);

            // РЕАЛЕН SERVICE CALL
            orderShippingService.updateHeartbeat(sessionId);

            return ResponseEntity.ok(Map.of("success", true));

        } catch (Exception e) {
            log.warn("Error processing heartbeat: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // ==========================================
    // MONITORING & ADMIN ОПЕРАЦИИ
    // ==========================================

    /**
     * Активни shipping сесии - GET /api/loading/active-sessions
     * Response: [{ orderId: 123, shippedItems: 5, totalItems: 10, completionPercentage: 50 }]
     */
    @GetMapping("/active-sessions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getActiveSessionsProgress() {
        try {
            log.debug("Getting active sessions progress");

            // РЕАЛЕН SERVICE CALL
            List<Map<String, Object>> result = orderShippingService.getActiveSessionsProgress();

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "activeSessions", result,
                    "totalCount", result.size()
            ));

        } catch (Exception e) {
            log.error("Error getting active sessions: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Брой активни сесии - GET /api/loading/active-count
     * Response: { count: 5 }
     */
    @GetMapping("/active-count")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getActiveSessionsCount() {
        try {
            log.debug("Getting active sessions count");

            // РЕАЛЕН SERVICE CALL
            long count = orderShippingService.getActiveSessionsCount();

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "activeSessionsCount", count
            ));

        } catch (Exception e) {
            log.error("Error getting active sessions count: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Откриване на изгубени сигнали - POST /api/loading/detect-lost-signals
     * Request: { thresholdMinutes: 10 }
     * Response: { affectedSessions: 3 }
     */
    @PostMapping("/detect-lost-signals")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> detectLostSignals(@RequestBody Map<String, Object> request) {
        try {
            Integer thresholdMinutes = request.containsKey("thresholdMinutes") ?
                    ((Number) request.get("thresholdMinutes")).intValue() : 10;

            log.debug("Detecting lost signals with threshold {} minutes", thresholdMinutes);

            // РЕАЛЕН SERVICE CALL
            int affectedSessions = orderShippingService.detectLostSignalSessions(thresholdMinutes);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "affectedSessions", affectedSessions,
                    "message", affectedSessions > 0 ?
                            "Намерени " + affectedSessions + " изгубени сигнали" :
                            "Няма изгубени сигнали"
            ));

        } catch (Exception e) {
            log.error("Error detecting lost signals: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Cleanup на стари изгубени сесии - POST /api/loading/cleanup-old-sessions
     * Request: { maxAgeHours: 24 }
     * Response: { deletedSessions: 2 }
     */
    @PostMapping("/cleanup-old-sessions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> cleanupOldSessions(@RequestBody Map<String, Object> request) {
        try {
            int maxAgeHours = request.containsKey("maxAgeHours") ?
                    ((Number) request.get("maxAgeHours")).intValue() : 24;

            log.debug("Cleaning up sessions older than {} hours", maxAgeHours);

            // РЕАЛЕН SERVICE CALL
            int deletedSessions = orderShippingService.cleanupOldLostSessions(maxAgeHours);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "deletedSessions", deletedSessions,
                    "message", deletedSessions > 0 ?
                            "Изтрити " + deletedSessions + " стари сесии" :
                            "Няма стари сесии за изтриване"
            ));

        } catch (Exception e) {
            log.error("Error cleaning up old sessions: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}