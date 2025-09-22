package com.yourco.warehouse.controllers;

import com.yourco.warehouse.dto.DashboardDTO;
import com.yourco.warehouse.service.OrderShippingService;
import com.yourco.warehouse.service.DashboardBroadcastService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * SHIPPING REST CONTROLLER - минимален контролер за JSON API
 *
 * Следва същия pattern като EmployerDashboardController:
 * - Минимален контролер - само извиква service методи
 * - ResponseEntity<DashboardDTO> за всички методи
 * - Constructor injection
 * - Broadcast за real-time updates
 * - Base URL: /shipping-order според shippingApi.js
 */
@RestController
@RequestMapping("/shipping-order")
@PreAuthorize("hasRole('ADMIN') or hasRole('EMPLOYER')")
public class OrderShippingRestController {

    // Constructor injection като EmployerDashboardController
    private final OrderShippingService orderShippingService;
    private final DashboardBroadcastService broadcastService;

    @Autowired
    public OrderShippingRestController(OrderShippingService orderShippingService,
                                  DashboardBroadcastService broadcastService) {
        this.orderShippingService = orderShippingService;
        this.broadcastService = broadcastService;
    }

    // ==========================================
    // ORDER DETAILS ENDPOINTS - според shippingApi.js
    // ==========================================

    /**
     * GET /{orderId}/details - Order details for shipping interface
     * Минимален метод - само извиква service
     */
    @GetMapping("/{orderId}/details")
    public ResponseEntity<DashboardDTO> getOrderDetails(@PathVariable Long orderId) {
        try {
            DashboardDTO response = orderShippingService.getOrderDetails(orderId);

            if (response.getSuccess()) {
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.badRequest().body(response);
            }

        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(new DashboardDTO("API грешка: " + e.getMessage()));
        }
    }

    /**
     * GET /{orderId}/progress - Shipping progress
     * Минимален метод - само извиква service
     */
    @GetMapping("/{orderId}/progress")
    public ResponseEntity<DashboardDTO> getShippingProgress(@PathVariable Long orderId) {
        try {
            DashboardDTO response = orderShippingService.getShippingProgress(orderId);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(new DashboardDTO("API грешка: " + e.getMessage()));
        }
    }

    // ==========================================
    // ITEM LOADING ENDPOINTS - според shippingApi.js
    // ==========================================

    /**
     * PUT /{orderId}/item/{itemId}/loading-status - Update single item loading
     * Минимален метод - само извиква service и broadcast
     */
    @PutMapping("/{orderId}/item/{itemId}/loading-status")
    public ResponseEntity<DashboardDTO> updateItemLoadingStatus(@PathVariable Long orderId,
                                                                @PathVariable Long itemId,
                                                                @RequestBody Map<String, Object> request) {
        try {
            Boolean isLoaded = (Boolean) request.get("isLoaded");
            String notes = (String) request.get("notes");

            DashboardDTO response = orderShippingService.updateItemLoadingStatus(orderId, itemId, isLoaded, notes);

            if (response.getSuccess()) {
                // Broadcast промяната
                broadcastService.broadcastOrderModification(orderId, "ITEM_LOADING_UPDATE", request);
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(new DashboardDTO("API грешка: " + e.getMessage()));
        }
    }

    /**
     * PUT /{orderId}/items/batch-loading-status - Batch update items loading
     * Минимален метод - само извиква service и broadcast
     */
    @PutMapping("/{orderId}/items/batch-loading-status")
    public ResponseEntity<DashboardDTO> batchUpdateItemsLoadingStatus(@PathVariable Long orderId,
                                                                      @RequestBody Map<String, Object> request) {
        try {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> itemUpdates = (List<Map<String, Object>>) request.get("itemUpdates");

            DashboardDTO response = orderShippingService.batchUpdateItemsLoadingStatus(orderId, itemUpdates);

            if (response.getSuccess()) {
                // Broadcast промяната
                broadcastService.broadcastOrderModification(orderId, "BATCH_LOADING_UPDATE", request);
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(new DashboardDTO("API грешка: " + e.getMessage()));
        }
    }

    // ==========================================
    // ORDER SHIPPING COMPLETION - според shippingApi.js
    // ==========================================


    // ==========================================
    // SHIPPING NOTES - според shippingApi.js
    // ==========================================


    // ==========================================
    // VALIDATION AND STATISTICS - според shippingApi.js
    // ==========================================

    /**
     * GET /{orderId}/validate - Validate order for shipping
     * Минимален метод - само извиква service
     */
    @GetMapping("/{orderId}/validate")
    public ResponseEntity<DashboardDTO> validateOrderForShipping(@PathVariable Long orderId) {
        try {
            DashboardDTO response = orderShippingService.validateOrderForShipping(orderId);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(new DashboardDTO("API грешка: " + e.getMessage()));
        }
    }

    /**
     * GET /statistics - Get shipping statistics
     * Минимален метод - само извиква service
     */
    @GetMapping("/statistics")
    public ResponseEntity<DashboardDTO> getShippingStatistics(@RequestParam(defaultValue = "today") String timeframe) {
        try {
            DashboardDTO response = orderShippingService.getShippingStatistics(timeframe);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(new DashboardDTO("API грешка: " + e.getMessage()));
        }
    }

    /**
     * GET /ready - Get orders ready for shipping
     * Минимален метод - само извиква service
     */
    @GetMapping("/ready")
    public ResponseEntity<DashboardDTO> getOrdersReadyForShipping(@RequestParam(defaultValue = "20") Integer limit,
                                                                  @RequestParam(defaultValue = "0") Integer offset) {
        try {
            DashboardDTO response = orderShippingService.getOrdersReadyForShipping(limit, offset);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(new DashboardDTO("API грешка: " + e.getMessage()));
        }
    }
}