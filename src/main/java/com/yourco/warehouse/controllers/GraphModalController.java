package com.yourco.warehouse.controllers;

import com.yourco.warehouse.service.GraphModalService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST Controller за Graph Modal функционалността.
 * Следва принципа на минимален код - само два endpoint-а които обслужват цялата функционалност.
 */
@RestController
@RequestMapping("/admin/graph-modal")
@PreAuthorize("hasRole('ADMIN')")
public class GraphModalController {

    private static final Logger log = LoggerFactory.getLogger(GraphModalController.class);

    private final GraphModalService graphModalService;

    public GraphModalController(GraphModalService graphModalService) {
        this.graphModalService = graphModalService;
    }

    /**
     * Главният endpoint който връща всички данни необходими за графичните анализи.
     *
     * GET /api/graph-modal/analytics
     * Query parameters:
     * - productIds: comma-separated списък с product IDs (optional - ако липсва се анализират всички)
     * - timeRange: "7d", "30d", "90d", "1y", "all" (default: "30d")
     * - includeCategories: true/false (default: false)
     * - includeSuppliers: true/false (default: false)
     *
     * Примери на употреба:
     * - /admin/graph-modal/analytics - анализ на всички продукти за последните 30 дни
     * - /admin/graph-modal/analytics?productIds=1,2,3&timeRange=1y - конкретни продукти за 1 година
     * - /admin/graph-modal/analytics?timeRange=90d&includeCategories=true&includeSuppliers=true - пълен анализ
     */
    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> getAnalyticsData(
            @RequestParam(required = false) String productIds,
            @RequestParam(defaultValue = "30d") String timeRange,
            @RequestParam(defaultValue = "false") boolean includeCategories,
            @RequestParam(defaultValue = "false") boolean includeSuppliers) {

        try {

            // Парсираме product IDs ако са подадени
            List<Long> productIdsList = null;
            if (productIds != null && !productIds.trim().isEmpty()) {
                try {
                    productIdsList = List.of(productIds.split(","))
                            .stream()
                            .map(String::trim)
                            .map(Long::parseLong)
                            .toList();
                } catch (NumberFormatException e) {
                    log.warn("Invalid product IDs format: {}", productIds);
                    return ResponseEntity.badRequest()
                            .body(Map.of("success", false, "message", "Невалиден формат на product IDs"));
                }
            }

            // Валидираме time range
            if (!isValidTimeRange(timeRange)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("success", false, "message", "Невалиден time range: " + timeRange));
            }

            // Извикваме service метода
            Map<String, Object> analyticsData = graphModalService.getGraphAnalyticsData(
                    productIdsList, timeRange, includeCategories, includeSuppliers);

            // Обвиваме в success response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", analyticsData);

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            log.warn("Invalid request parameters: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            log.error("Error loading analytics data", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Грешка при зареждане на графичните данни"));
        }
    }

    /**
     * Endpoint за зареждане на мета данни необходими за конфигуриране на UI контролите.
     *
     * GET /api/graph-modal/metadata
     *
     * Върща списъци с всички налични продукти, категории, доставчици и time range опции
     * за попълване на dropdown менютата в modal-а.
     */
    @GetMapping("/metadata")
    public ResponseEntity<Map<String, Object>> getMetadata() {
        try {

            Map<String, Object> metadata = graphModalService.getAnalyticsMetadata();

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("metadata", metadata);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error loading metadata", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Грешка при зареждане на мета данни"));
        }
    }

    /**
     * Utility метод за валидиране на time range параметъра
     */
    private boolean isValidTimeRange(String timeRange) {
        return List.of("7d", "30d", "90d", "1y", "all").contains(timeRange);
    }
}