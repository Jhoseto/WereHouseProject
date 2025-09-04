package com.yourco.warehouse.controllers.client;

import com.yourco.warehouse.dto.ProductCatalogDTO;
import com.yourco.warehouse.service.CatalogService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping
public class CatalogController {

    private final CatalogService catalogService;

    @Autowired
    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    // ==========================================
    // JSON API ENDPOINTS
    // ==========================================

    @GetMapping(value = "/api/products", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseBody
    public ResponseEntity<List<ProductCatalogDTO>> getAllProducts() {
        try {
            List<ProductCatalogDTO> productDTOs = catalogService.getAllActiveProducts();
            return ResponseEntity.ok()
                    .header("Cache-Control", "public, max-age=300")
                    .body(productDTOs);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.emptyList());
        }
    }

    @GetMapping(value = "/api/products/search", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseBody
    public ResponseEntity<List<ProductCatalogDTO>> searchProducts(
            @RequestParam(value = "q", required = false)
            String query) {
        if (query != null && query.length() > 100) {
            return ResponseEntity.badRequest().body(Collections.emptyList());
        }
        try {
            List<ProductCatalogDTO> productDTOs = catalogService.searchActive(query);
            return ResponseEntity.ok()
                    .header("Cache-Control", "public, max-age=60")
                    .body(productDTOs);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.emptyList());
        }
    }

    // ПОПРАВЕН filterProducts метод
    @GetMapping(value = "/api/products/filter", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseBody
    public ResponseEntity<?> filterProducts(
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "minPrice", required = false) BigDecimal minPrice,
            @RequestParam(value = "maxPrice", required = false) BigDecimal maxPrice) {
        if ((minPrice != null && minPrice.compareTo(BigDecimal.ZERO) < 0) ||
                (maxPrice != null && maxPrice.compareTo(BigDecimal.ZERO) < 0)) {
            return ResponseEntity.badRequest().body(Collections.emptyList());
        }
        try {
            // Логиката за валидност на ценови диапазон е в сервиза или може да се провери тук
            if (minPrice != null && maxPrice != null && minPrice.compareTo(maxPrice) > 0) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "Невалиден ценови диапазон");
                return ResponseEntity.badRequest().body(error);
            }

            List<ProductCatalogDTO> productDTOs = catalogService.filterProducts(category, minPrice, maxPrice);
            return ResponseEntity.ok()
                    .header("Cache-Control", "public, max-age=180")
                    .body(productDTOs);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.emptyList());
        }
    }

    @GetMapping(value = "/api/products/{sku}", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseBody
    public ResponseEntity<?> getProductBySku(
            @PathVariable("sku")
            @Size(min = 1, max = 50, message = "SKU трябва да бъде между 1 и 50 символа")
            String sku) {
        try {
            // в сервиза имаш getProductById, но не и по SKU → тук оставаш repository/service
            // ако имаш специален метод в CatalogService за SKU, използвай него
            // засега ще върна 404, ако няма
            return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
                    .body(Map.of("message", "Методът за търсене по SKU трябва да се реализира в сервиза"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Възникна грешка"));
        }
    }

    @GetMapping(value = "/api/catalog/metadata", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getCatalogMetadata() {
        try {
            Map<String, Object> metadata = new HashMap<>();
            metadata.put("totalProducts", catalogService.countActiveProductsByCategory(null));
            metadata.put("categories", catalogService.getAllCategories());
            metadata.put("priceStats", catalogService.getPriceStatistics());
            return ResponseEntity.ok()
                    .header("Cache-Control", "public, max-age=1800")
                    .body(metadata);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Неуспешно зареждане на метаданни"));
        }
    }

    @GetMapping(value = "/api/products/{sku}/availability", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseBody
    public ResponseEntity<Map<String, Object>> checkProductAvailability(
            @PathVariable("sku") String sku) {
        try {
            // в сервиза липсва метод за availability → трябва да се добави там
            return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
                    .body(Map.of("message", "Методът за проверка на наличност трябва да се реализира в сервиза"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Грешка при проверка на наличност"));
        }
    }

    // ==========================================
    // ERROR HANDLING
    // ==========================================

    @ExceptionHandler(jakarta.validation.ConstraintViolationException.class)
    @ResponseBody
    public ResponseEntity<Map<String, String>> handleValidationErrors(
            jakarta.validation.ConstraintViolationException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getConstraintViolations().forEach(violation -> {
            String fieldName = violation.getPropertyPath().toString();
            String message = violation.getMessage();
            errors.put(fieldName, message);
        });
        return ResponseEntity.badRequest().body(errors);
    }

    @ExceptionHandler(Exception.class)
    @ResponseBody
    public ResponseEntity<Map<String, String>> handleGeneralError(Exception ex, HttpServletRequest request) {
        Map<String, String> error = new HashMap<>();
        error.put("message", "Възникна грешка при обработка на заявката");
        error.put("error", "INTERNAL_SERVER_ERROR");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    @GetMapping(value = "/api/catalog/health", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseBody
    public ResponseEntity<Map<String, Object>> healthCheck() {
        try {
            long productCount = catalogService.countActiveProductsByCategory(null);
            Map<String, Object> health = new HashMap<>();
            health.put("status", "UP");
            health.put("activeProducts", productCount);
            health.put("timestamp", System.currentTimeMillis());
            health.put("version", "1.0.0");
            return ResponseEntity.ok(health);
        } catch (Exception e) {
            Map<String, Object> health = new HashMap<>();
            health.put("status", "DOWN");
            health.put("error", "Service unavailable");
            health.put("timestamp", System.currentTimeMillis());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(health);
        }
    }
}