package com.yourco.warehouse.controllers;

import com.yourco.warehouse.dto.DashboardDTO;
import com.yourco.warehouse.entity.enums.OrderStatus;
import com.yourco.warehouse.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * DASHBOARD REST CONTROLLER
 * =========================
 */
@RestController
@RequestMapping("/employer")
@PreAuthorize("hasRole('ADMIN') or hasRole('EMPLOYER')")
public class AdminDashboardController {

    private final DashboardService dashboardService;

    @Autowired
    public AdminDashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    /**
     * Пълен dashboard - всичко наведнъж
     */
    @GetMapping("/dashboard/overview")
    public ResponseEntity<DashboardDTO> getFullDashboard() {
        DashboardDTO dashboard = dashboardService.getFullDashboard();
        return dashboard.getSuccess() ? ResponseEntity.ok(dashboard) : ResponseEntity.status(500).body(dashboard);
    }

    /**
     * Само броячи - за real-time updates
     */
    @GetMapping("/dashboard/counters")
    public ResponseEntity<DashboardDTO> getCounters() {
        DashboardDTO counters = dashboardService.getCounters();
        return counters.getSuccess() ? ResponseEntity.ok(counters) : ResponseEntity.status(500).body(counters);
    }

    /**
     * Поръчки по статус
     */
    @GetMapping("/dashboard/orders/{status}")
    public ResponseEntity<DashboardDTO> getOrdersByStatus(
            @PathVariable String status,
            @RequestParam(defaultValue = "10") int limit) {

        try {
            OrderStatus orderStatus = OrderStatus.valueOf(status.toUpperCase());
            DashboardDTO orders = dashboardService.getOrdersByStatus(orderStatus, limit);
            return orders.getSuccess() ? ResponseEntity.ok(orders) : ResponseEntity.status(500).body(orders);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new DashboardDTO("Невалиден статус: " + status));
        }
    }
}