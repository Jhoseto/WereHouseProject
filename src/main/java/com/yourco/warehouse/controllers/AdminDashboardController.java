package com.yourco.warehouse.controllers;

import com.yourco.warehouse.dto.*;
import com.yourco.warehouse.entity.Order;
import com.yourco.warehouse.entity.enums.OrderStatus;
import com.yourco.warehouse.service.DashboardService;
import com.yourco.warehouse.service.impl.DashboardServiceImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * DASHBOARD REST CONTROLLER
 * ================================================
 */
@RestController
@RequestMapping("/employer")
@PreAuthorize("hasRole('ADMIN') or hasRole('EMPLOYER')")
public class AdminDashboardController {

    private static final Logger log = LoggerFactory.getLogger(AdminDashboardController.class);

    private final DashboardService dashboardService;

    @Autowired
    public AdminDashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    // ==========================================
    // API ENDPOINTS FOR DASHBOARD DATA
    // ==========================================

    /**
     * API endpoint за dashboard overview - използва реалния getDashboardOverviewAsDTO метод
     */
    @GetMapping("/dashboard/overview")
    public ResponseEntity<Map<String, Object>> getDashboardOverview() {
        try {
            log.debug("API call: Getting dashboard overview data");

            // Извличаме основните dashboard данни
            DashboardDataDTO dashboardData = dashboardService.getDashboardOverview();
            DailyStatsDTO dailyStats = dashboardService.getDailyStatistics();

            // ✅ ПОПРАВЕНО: Създаваме структура с правилни имена на полетата
            // Тези имена трябва да съответстват на тези, които JavaScript-ът очаква
            Map<String, Object> responseData = new HashMap<>();

            // Основни броячи - използваме имената които JavaScript-ът очаква
            responseData.put("urgentCount", dashboardData.getSubmittedCount());
            responseData.put("pendingCount", dashboardData.getConfirmedCount());
            responseData.put("readyCount", dashboardData.getPickedCount());
            responseData.put("completedCount", dashboardData.getShippedCount());
            responseData.put("cancelledCount", dashboardData.getCancelledCount());

            // Дневни статистики
            responseData.put("dailyStats", dailyStats);

            // Метаданни
            responseData.put("hasUrgentAlerts", dashboardData.getSubmittedCount() > 5);
            responseData.put("lastUpdate", LocalDateTime.now().toString());
            long totalActive = dashboardData.getSubmittedCount() +
                    dashboardData.getConfirmedCount() +
                    dashboardData.getPickedCount();
            responseData.put("totalActive", totalActive);


            // Структурираме отговора в формат, който frontend-ът очаква
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", responseData);
            response.put("timestamp", System.currentTimeMillis());

            log.debug("Dashboard overview API response prepared successfully");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error getting dashboard overview", e);

            // При грешка връщаме структуриран error response
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Грешка при зареждане на dashboard данни");
            errorResponse.put("timestamp", System.currentTimeMillis());

            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
    /**
     * API endpoint за спешни поръчки
     * Връща списък със спешните поръчки (SUBMITTED и CONFIRMED)
     */
    @GetMapping("/dashboard/urgent-orders")
    public ResponseEntity<Map<String, Object>> getUrgentOrders() {
        try {
            log.debug("API call: Getting urgent orders");

            List<Order> urgentOrders = dashboardService.getUrgentOrders();

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", urgentOrders);
            response.put("count", urgentOrders.size());
            response.put("timestamp", System.currentTimeMillis());

            log.debug("Found {} urgent orders", urgentOrders.size());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error getting urgent orders", e);

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Грешка при зареждане на спешни поръчки");

            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    /**
     * API endpoint за поръчки по статус
     * Параметър: status - статусът на поръчките които искаме
     */
    @GetMapping("/dashboard/orders-by-status")
    public ResponseEntity<Map<String, Object>> getOrdersByStatus(
            @RequestParam("status") String statusName) {
        try {
            log.debug("API call: Getting orders by status: {}", statusName);

            // Конвертираме string в OrderStatus enum
            OrderStatus status = OrderStatus.valueOf(statusName.toUpperCase());
            List<Order> orders = dashboardService.getOrdersByStatus(status);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", orders);
            response.put("count", orders.size());
            response.put("status", statusName);
            response.put("timestamp", System.currentTimeMillis());

            log.debug("Found {} orders with status {}", orders.size(), statusName);
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            log.error("Invalid status parameter: {}", statusName, e);

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Невалиден статус: " + statusName);

            return ResponseEntity.badRequest().body(errorResponse);

        } catch (Exception e) {
            log.error("Error getting orders by status: {}", statusName, e);

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Грешка при зареждане на поръчки");

            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    /**
     * API endpoint за последни поръчки
     * Параметър: limit - колко поръчки да върне (по подразбиране 10)
     */
    @GetMapping("/dashboard/recent-orders")
    public ResponseEntity<Map<String, Object>> getRecentOrders(
            @RequestParam(value = "limit", defaultValue = "10") int limit) {
        try {
            log.debug("API call: Getting {} recent orders", limit);

            // Валидираме лимита
            if (limit < 1 || limit > 100) {
                limit = 10; // Безопасна стойност по подразбиране
            }

            List<Order> recentOrders = dashboardService.getRecentOrders(limit);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", recentOrders);
            response.put("count", recentOrders.size());
            response.put("limit", limit);
            response.put("timestamp", System.currentTimeMillis());

            log.debug("Retrieved {} recent orders", recentOrders.size());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error getting recent orders", e);

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Грешка при зареждане на последни поръчки");

            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }


    // ==========================================
    // ORDER OPERATION ENDPOINTS
    // ==========================================

    /**
     * Потвърждаване на поръчка - използва реалния confirmOrder метод
     */
    @PostMapping("/orders/{orderId}/confirm")
    public ResponseEntity<DashboardResponseDTO> confirmOrder(@PathVariable Long orderId) {
        try {

            boolean success = dashboardService.confirmOrder(orderId);

            if (success) {
                DashboardResponseDTO response = DashboardResponseDTO.success("Поръчката е потвърдена успешно");
                return ResponseEntity.ok(response);
            } else {
                DashboardResponseDTO response = DashboardResponseDTO.error("Грешка при потвърждаване на поръчката");
                return ResponseEntity.ok(response);
            }
        } catch (IllegalArgumentException e) {
            log.warn("Invalid order ID for confirmation: {}", orderId);
            DashboardResponseDTO errorResponse = DashboardResponseDTO.error("Поръчката не съществува");
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (IllegalStateException e) {
            log.warn("Invalid status transition for order {}: {}", orderId, e.getMessage());
            DashboardResponseDTO errorResponse = DashboardResponseDTO.error("Невалидна операция: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            log.error("Error confirming order {}: {}", orderId, e.getMessage(), e);
            DashboardResponseDTO errorResponse = DashboardResponseDTO.error("Грешка при потвърждаване на поръчката");
            return ResponseEntity.ok(errorResponse);
        }
    }

    /**
     * Започване на пикинг процес - използва реалния startPickingOrder метод
     */
    @PostMapping("/orders/{orderId}/pick")
    public ResponseEntity<DashboardResponseDTO> startPicking(@PathVariable Long orderId) {
        try {

            boolean success = dashboardService.startPickingOrder(orderId);

            if (success) {
                DashboardResponseDTO response = DashboardResponseDTO.success("Пикинг процесът е започнат успешно");
                return ResponseEntity.ok(response);
            } else {
                DashboardResponseDTO response = DashboardResponseDTO.error("Грешка при започване на пикинг процеса");
                return ResponseEntity.ok(response);
            }
        } catch (IllegalArgumentException e) {
            log.warn("Invalid order ID for picking: {}", orderId);
            DashboardResponseDTO errorResponse = DashboardResponseDTO.error("Поръчката не съществува");
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (IllegalStateException e) {
            log.warn("Invalid status transition for picking order {}: {}", orderId, e.getMessage());
            DashboardResponseDTO errorResponse = DashboardResponseDTO.error("Невалидна операция: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            log.error("Error starting picking for order {}: {}", orderId, e.getMessage(), e);
            DashboardResponseDTO errorResponse = DashboardResponseDTO.error("Грешка при започване на пикинг процеса");
            return ResponseEntity.ok(errorResponse);
        }
    }

    /**
     * Отказване на поръчка - използва реалния rejectOrder метод с причина
     */
    @PostMapping("/orders/{orderId}/reject")
    public ResponseEntity<DashboardResponseDTO> rejectOrder(@PathVariable Long orderId) {
        try {

            boolean success = dashboardService.rejectOrder(orderId, "Отказана от dashboard");

            if (success) {
                DashboardResponseDTO response = DashboardResponseDTO.success("Поръчката е отказана успешно");
                return ResponseEntity.ok(response);
            } else {
                DashboardResponseDTO response = DashboardResponseDTO.error("Грешка при отказване на поръчката");
                return ResponseEntity.ok(response);
            }
        } catch (IllegalArgumentException e) {
            log.warn("Invalid order ID for rejection: {}", orderId);
            DashboardResponseDTO errorResponse = DashboardResponseDTO.error("Поръчката не съществува");
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (IllegalStateException e) {
            log.warn("Invalid status transition for rejecting order {}: {}", orderId, e.getMessage());
            DashboardResponseDTO errorResponse = DashboardResponseDTO.error("Невалидна операция: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            log.error("Error rejecting order {}: {}", orderId, e.getMessage(), e);
            DashboardResponseDTO errorResponse = DashboardResponseDTO.error("Грешка при отказване на поръчката");
            return ResponseEntity.ok(errorResponse);
        }
    }

    /**
     * Получаване на детайли за поръчка - използва реалния convertOrderToDTO метод
     */
    @GetMapping("/orders/{orderId}/details")
    public ResponseEntity<DashboardResponseDTO> getOrderDetails(@PathVariable Long orderId) {
        try {
            log.debug("Getting details for order: {}", orderId);

            Order order = dashboardService.getOrderDetails(orderId);
            if (order == null) {
                DashboardResponseDTO errorResponse = DashboardResponseDTO.error("Поръчката не съществува");
                return ResponseEntity.notFound().build();
            }

            OrderDTO orderDTO = dashboardService.convertOrderToDTO(order);
            DashboardResponseDTO response = DashboardResponseDTO.success(orderDTO);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting order details for {}: {}", orderId, e.getMessage(), e);
            DashboardResponseDTO errorResponse = DashboardResponseDTO.error("Грешка при зареждане на детайлите");
            return ResponseEntity.ok(errorResponse);
        }
    }

    // ==========================================
    // HEALTH CHECK ENDPOINT
    // ==========================================

    /**
     * Health check - използва реалния getDashboardOverview метод
     */
    @GetMapping("/dashboard/health")
    public ResponseEntity<DashboardResponseDTO> healthCheck() {
        try {
            DashboardDataDTO testData = dashboardService.getDashboardOverview();

            long totalOrders = testData.getSubmittedCount() + testData.getConfirmedCount()
                    + testData.getPickedCount() + testData.getShippedCount();

            String healthInfo = String.format("Dashboard service operational - Processing %d total orders", totalOrders);
            DashboardResponseDTO response = DashboardResponseDTO.success(healthInfo);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Health check failed: {}", e.getMessage());
            DashboardResponseDTO errorResponse = DashboardResponseDTO.error("Dashboard service unavailable");
            return ResponseEntity.status(503).body(errorResponse);
        }
    }
}
