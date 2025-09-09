package com.yourco.warehouse.controllers;

import com.yourco.warehouse.dto.DailyStatsDTO;
import com.yourco.warehouse.dto.DashboardDataDTO;
import com.yourco.warehouse.entity.Order;
import com.yourco.warehouse.entity.UserEntity;
import com.yourco.warehouse.entity.enums.OrderStatus;
import com.yourco.warehouse.service.DashboardService;
import com.yourco.warehouse.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * CLEAN ADMIN DASHBOARD CONTROLLER
 * ================================
 * Чист контролер който се занимава само с HTTP комуникация.
 * Цялата бизнес логика е делегирана на DashboardService.
 * Този контролер служи само като тънък слой между HTTP заявките и сервиза.
 */
@Controller
@RequestMapping("/employer")
@PreAuthorize("hasRole('ADMIN') or hasRole('EMPLOYER')")
public class AdminDashboardController {

    private static final Logger log = LoggerFactory.getLogger(AdminDashboardController.class);

    private final DashboardService dashboardService;
    private final UserService userService;

    @Autowired
    public AdminDashboardController(DashboardService dashboardService, UserService userService) {
        this.dashboardService = dashboardService;
        this.userService = userService;
    }

    // ==========================================
    // PAGE RENDERING ENDPOINTS
    // ==========================================

    /**
     * Главна dashboard страница
     * Зарежда данните чрез сервиза и ги предава на template-а
     */
    @GetMapping("/dashboard")
    public String mainDashboard(Model model, Authentication authentication) {
        try {
            log.info("Loading dashboard page for user: {}", authentication.getName());

            // Получаваме текущия потребител
            UserEntity currentUser = userService.getCurrentUser();
            model.addAttribute("currentUser", currentUser);

            // Получаваме dashboard данните чрез сервиза
            DashboardDataDTO dashboardData = dashboardService.getDashboardOverview();

            // Добавяме данните в модела за Thymeleaf
            model.addAttribute("submittedCount", dashboardData.getSubmittedCount());
            model.addAttribute("confirmedCount", dashboardData.getConfirmedCount());
            model.addAttribute("pickedCount", dashboardData.getPickedCount());
            model.addAttribute("shippedCount", dashboardData.getShippedCount());
            model.addAttribute("cancelledCount", dashboardData.getCancelledCount());
            model.addAttribute("dashboardData", dashboardData);

            // Получаваме дневните статистики
            DailyStatsDTO dailyStats = dashboardService.getDailyStatistics();
            model.addAttribute("dailyStats", dailyStats);

            // Добавяме timestamp за cache-busting
            model.addAttribute("lastUpdate", LocalDateTime.now());

            log.info("Dashboard page loaded successfully for user: {}", currentUser.getUsername());
            return "main-dashboard";

        } catch (Exception e) {
            log.error("Error loading dashboard page: {}", e.getMessage(), e);
            model.addAttribute("error", "Възникна грешка при зареждане на dashboard-а");
            return "error/general";
        }
    }

    // ==========================================
    // API ENDPOINTS FOR DASHBOARD DATA
    // ==========================================

    /**
     * API endpoint за общи dashboard данни
     * Връща актуални статистики за frontend-а
     */
    @GetMapping("/dashboard/overview")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getDashboardOverview() {
        try {
            log.debug("API request for dashboard overview");

            DashboardDataDTO dashboardData = dashboardService.getDashboardOverview();
            DailyStatsDTO dailyStats = dashboardService.getDailyStatistics();

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("urgentCount", dashboardData.getSubmittedCount());
            response.put("pendingCount", dashboardData.getConfirmedCount());
            response.put("readyCount", dashboardData.getPickedCount());
            response.put("completedCount", dashboardData.getShippedCount());
            response.put("cancelledCount", dashboardData.getCancelledCount());
            response.put("dailyStats", dailyStats);
            response.put("timestamp", LocalDateTime.now());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error getting dashboard overview: {}", e.getMessage(), e);
            return createErrorResponse("Грешка при зареждане на dashboard данните");
        }
    }

    /**
     * API endpoint за поръчки по статус
     * Връща филтрирани поръчки за конкретни dashboard табове
     */
    @GetMapping("/dashboard/orders/{status}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getOrdersByStatus(@PathVariable String status) {
        try {
            log.debug("API request for orders with status: {}", status);

            // Валидираме статуса
            OrderStatus orderStatus;
            try {
                orderStatus = OrderStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid order status requested: {}", status);
                return createErrorResponse("Невалиден статус на поръчка: " + status);
            }

            // Получаваме поръчките чрез сервиза (ограничени до 50 за performance)
            List<Order> orders = dashboardService.getOrdersByStatus(orderStatus, 50);

            // Конвертираме към API response формат
            List<Map<String, Object>> orderMaps = orders.stream()
                    .map(dashboardService::convertOrderToApiResponse)
                    .toList();

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("orders", orderMaps);
            response.put("totalCount", orders.size());
            response.put("status", status);
            response.put("timestamp", LocalDateTime.now());

            log.info("Successfully returned {} orders for status: {}", orderMaps.size(), status);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error getting orders by status {}: {}", status, e.getMessage(), e);
            return createErrorResponse("Грешка при зареждане на поръчките");
        }
    }

    // ==========================================
    // ORDER MANAGEMENT ENDPOINTS
    // ==========================================

    /**
     * Потвърждаване на поръчка
     */
    @PostMapping("/orders/{orderId}/confirm")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> confirmOrder(@PathVariable Long orderId) {
        try {
            log.info("Confirming order: {}", orderId);

            boolean success = dashboardService.confirmOrder(orderId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", success);
            response.put("message", success ? "Поръчката е потвърдена успешно" : "Грешка при потвърждаване");
            response.put("orderId", orderId);

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            log.warn("Invalid order ID for confirmation: {}", orderId);
            return createErrorResponse("Поръчката не съществува");
        } catch (IllegalStateException e) {
            log.warn("Invalid status transition for order {}: {}", orderId, e.getMessage());
            return createErrorResponse("Невалидна операция: " + e.getMessage());
        } catch (Exception e) {
            log.error("Error confirming order {}: {}", orderId, e.getMessage(), e);
            return createErrorResponse("Грешка при потвърждаване на поръчката");
        }
    }

    /**
     * Започване на пикинг процес
     */
    @PostMapping("/orders/{orderId}/pick")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> startPicking(@PathVariable Long orderId) {
        try {
            log.info("Starting picking for order: {}", orderId);

            boolean success = dashboardService.startPickingOrder(orderId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", success);
            response.put("message", success ? "Пикингът е започнат успешно" : "Грешка при започване на пикинга");
            response.put("orderId", orderId);

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            log.warn("Invalid order ID for picking: {}", orderId);
            return createErrorResponse("Поръчката не съществува");
        } catch (IllegalStateException e) {
            log.warn("Invalid status transition for picking order {}: {}", orderId, e.getMessage());
            return createErrorResponse("Невалидна операция: " + e.getMessage());
        } catch (Exception e) {
            log.error("Error starting picking for order {}: {}", orderId, e.getMessage(), e);
            return createErrorResponse("Грешка при започване на пикинга");
        }
    }

    /**
     * Завършване на поръчка
     */
    @PostMapping("/orders/{orderId}/complete")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> completeOrder(@PathVariable Long orderId) {
        try {
            log.info("Completing order: {}", orderId);

            boolean success = dashboardService.completeOrder(orderId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", success);
            response.put("message", success ? "Поръчката е завършена успешно" : "Грешка при завършване");
            response.put("orderId", orderId);

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            log.warn("Invalid order ID for completion: {}", orderId);
            return createErrorResponse("Поръчката не съществува");
        } catch (IllegalStateException e) {
            log.warn("Invalid status transition for completing order {}: {}", orderId, e.getMessage());
            return createErrorResponse("Невалидна операция: " + e.getMessage());
        } catch (Exception e) {
            log.error("Error completing order {}: {}", orderId, e.getMessage(), e);
            return createErrorResponse("Грешка при завършване на поръчката");
        }
    }

    /**
     * Отказване на поръчка
     */
    @PostMapping("/orders/{orderId}/reject")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> rejectOrder(@PathVariable Long orderId,
                                                           @RequestBody Map<String, String> requestBody) {
        try {
            String reason = requestBody.getOrDefault("reason", "Няма посочена причина");
            log.info("Rejecting order: {} with reason: {}", orderId, reason);

            boolean success = dashboardService.rejectOrder(orderId, reason);

            Map<String, Object> response = new HashMap<>();
            response.put("success", success);
            response.put("message", success ? "Поръчката е отказана успешно" : "Грешка при отказване");
            response.put("orderId", orderId);

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            log.warn("Invalid order ID for rejection: {}", orderId);
            return createErrorResponse("Поръчката не съществува");
        } catch (IllegalStateException e) {
            log.warn("Invalid status transition for rejecting order {}: {}", orderId, e.getMessage());
            return createErrorResponse("Невалидна операция: " + e.getMessage());
        } catch (Exception e) {
            log.error("Error rejecting order {}: {}", orderId, e.getMessage(), e);
            return createErrorResponse("Грешка при отказване на поръчката");
        }
    }

    /**
     * Получаване на детайли за поръчка
     */
    @GetMapping("/orders/{orderId}/details")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getOrderDetails(@PathVariable Long orderId) {
        try {
            log.debug("Getting details for order: {}", orderId);

            Order order = dashboardService.getOrderDetails(orderId);

            if (order == null) {
                return createErrorResponse("Поръчката не съществува");
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("order", dashboardService.convertOrderToApiResponse(order));

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error getting order details for {}: {}", orderId, e.getMessage(), e);
            return createErrorResponse("Грешка при зареждане на детайлите");
        }
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    /**
     * Създава стандартизиран error response
     */
    private ResponseEntity<Map<String, Object>> createErrorResponse(String message) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("success", false);
        errorResponse.put("message", message);
        errorResponse.put("timestamp", LocalDateTime.now());
        return ResponseEntity.ok(errorResponse); // Използваме OK за consistency с frontend-а
    }
}