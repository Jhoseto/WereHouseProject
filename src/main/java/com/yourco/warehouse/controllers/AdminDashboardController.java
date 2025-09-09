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
    private final DashboardServiceImpl dashboardServiceImpl;

    @Autowired
    public AdminDashboardController(DashboardService dashboardService,
                                        DashboardServiceImpl dashboardServiceImpl) {
        this.dashboardService = dashboardService;
        this.dashboardServiceImpl = dashboardServiceImpl;
    }

    // ==========================================
    // API ENDPOINTS FOR DASHBOARD DATA
    // ==========================================

    /**
     * API endpoint за dashboard overview - използва реалния getDashboardOverviewAsDTO метод
     */
    @GetMapping("/dashboard/overview")
    public ResponseEntity<DashboardResponseDTO> getDashboardOverview() {
        try {
            DashboardOverviewResponseDTO overviewData = dashboardServiceImpl.getDashboardOverviewAsDTO();
            DashboardResponseDTO response = DashboardResponseDTO.success(overviewData);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting dashboard overview: {}", e.getMessage(), e);
            DashboardResponseDTO errorResponse = DashboardResponseDTO.error("Грешка при зареждане на dashboard данните");
            return ResponseEntity.ok(errorResponse);
        }
    }

    /**
     * API endpoint за поръчки по статус - използва реалния getOrdersByStatusAsDTO метод
     */
    @GetMapping("/dashboard/orders/{status}")
    public ResponseEntity<DashboardResponseDTO> getOrdersByStatus(@PathVariable String status) {
        try {

            OrderStatus orderStatus;
            try {
                orderStatus = OrderStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid order status requested: {}", status);
                DashboardResponseDTO errorResponse = DashboardResponseDTO.error("Невалиден статус на поръчка: " + status);
                return ResponseEntity.badRequest().body(errorResponse);
            }

            OrdersListResponseDTO ordersData = dashboardServiceImpl.getOrdersByStatusAsDTO(orderStatus, 50);
            DashboardResponseDTO response = DashboardResponseDTO.success(ordersData);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting orders by status {}: {}", status, e.getMessage(), e);
            DashboardResponseDTO errorResponse = DashboardResponseDTO.error("Грешка при зареждане на поръчките");
            return ResponseEntity.ok(errorResponse);
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

            OrderDTO orderDTO = dashboardServiceImpl.convertOrderToDTO(order);
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
