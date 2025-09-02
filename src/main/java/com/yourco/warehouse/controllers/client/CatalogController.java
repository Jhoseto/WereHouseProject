package com.yourco.warehouse.controllers.client;

import com.yourco.warehouse.dto.CatalogResponseDTO;
import com.yourco.warehouse.dto.ProductCatalogDTO;
import com.yourco.warehouse.entity.ProductEntity;
import com.yourco.warehouse.service.CatalogService;
import com.yourco.warehouse.utils.RequestUtils;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Controller
@RequestMapping
@Validated
public class CatalogController {

    private static final Logger logger = LoggerFactory.getLogger(CatalogController.class);

    private final CatalogService catalogService;

    @Autowired
    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    // ==========================================
    // HTML TEMPLATE ENDPOINTS
    // ==========================================

    /**
     * Главна страница на каталога
     * Връща HTML template за interactive catalog
     */
    @GetMapping("/catalog")
    public String catalog(Model model, Authentication auth, HttpServletRequest request) {
        try {
            String username = auth != null ? auth.getName() : "anonymous";
            String ipAddress = RequestUtils.getClientIpAddress(request);
            String userAgent = request.getHeader("User-Agent");

            logger.info("Каталог достъпен от потребител: {}, IP: {}", username, ipAddress);

            // Добавяме основни атрибути за template-а
            model.addAttribute("pageTitle", "Каталог продукти");
            model.addAttribute("username", username);
            model.addAttribute("isAuthenticated", auth != null && auth.isAuthenticated());

            // JavaScript frontend ще зареди данните асинхронно
            return "client/catalog";

        } catch (Exception e) {
            logger.error("Грешка при зареждане на каталог template", e);
            model.addAttribute("error", "Възникна грешка при зареждане на каталога");
            return "error/general";
        }
    }

    // ==========================================
    // JSON API ENDPOINTS
    // ==========================================

    /**
     * API: Всички активни продукти (основният endpoint)
     * GET /api/products - светкавично бърз за frontend
     */
    @GetMapping(value = "/api/products", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseBody
    public ResponseEntity<List<ProductCatalogDTO>> getAllProducts(Authentication auth,
                                                                  HttpServletRequest request) {
        try {
            String username = auth != null ? auth.getName() : "anonymous";
            logger.debug("API заявка за всички продукти от потребител: {}", username);

            // Използваме кешираната версия от service
            List<ProductEntity> products = catalogService.getAllActiveProducts();
            List<ProductCatalogDTO> productDTOs = ProductCatalogDTO.from(products);

            logger.info("API връща {} продукта на потребител: {}", productDTOs.size(), username);

            return ResponseEntity.ok()
                    .header("Cache-Control", "public, max-age=300") // 5 минути кеш
                    .body(productDTOs);

        } catch (Exception e) {
            logger.error("Грешка при API заявка за продукти", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * API: Търсене на продукти
     * GET /api/products/search?q=...
     */
    @GetMapping(value = "/api/products/search", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseBody
    public ResponseEntity<List<ProductCatalogDTO>> searchProducts(
            @RequestParam(value = "q", required = false)
            @Size(max = 100, message = "Заявката не може да бъде по-дълга от 100 символа")
            String query,
            Authentication auth) {

        try {
            String username = auth != null ? auth.getName() : "anonymous";
            logger.debug("API търсене: '{}' от потребител: {}", query, username);

            // Sanitize заявката
            String sanitizedQuery = catalogService.sanitizeSearchQuery(query);

            List<ProductEntity> products = catalogService.searchActive(sanitizedQuery);
            List<ProductCatalogDTO> productDTOs = ProductCatalogDTO.from(products);

            logger.info("API търсене '{}' връща {} резултата", sanitizedQuery, productDTOs.size());

            return ResponseEntity.ok()
                    .header("Cache-Control", "public, max-age=60") // 1 минута кеш за търсене
                    .body(productDTOs);

        } catch (Exception e) {
            logger.error("Грешка при API търсене: {}", query, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * API: Филтриране на продукти
     * GET /api/products/filter?category=...&minPrice=...&maxPrice=...
     */
    @GetMapping(value = "/api/products/filter", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseBody
    public ResponseEntity<List<ProductCatalogDTO>> filterProducts(
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "minPrice", required = false)
            @DecimalMin(value = "0.0", message = "Минималната цена трябва да бъде положителна")
            BigDecimal minPrice,
            @RequestParam(value = "maxPrice", required = false)
            @DecimalMin(value = "0.0", message = "Максималната цена трябва да бъде положителна")
            BigDecimal maxPrice,
            Authentication auth) {

        try {
            String username = auth != null ? auth.getName() : "anonymous";
            logger.debug("API филтриране: category={}, minPrice={}, maxPrice={} от потребител: {}",
                    category, minPrice, maxPrice, username);

            // Валидация на ценовия диапазон
            if (!catalogService.isValidPriceRange(minPrice, maxPrice)) {
                logger.warn("Невалиден ценови диапазон: {} - {}", minPrice, maxPrice);
                return ResponseEntity.badRequest().build();
            }

            List<ProductEntity> products = catalogService.filterProducts(category, minPrice, maxPrice);
            List<ProductCatalogDTO> productDTOs = ProductCatalogDTO.from(products);

            logger.info("API филтриране връща {} продукта", productDTOs.size());

            return ResponseEntity.ok()
                    .header("Cache-Control", "public, max-age=180") // 3 минути кеш
                    .body(productDTOs);

        } catch (Exception e) {
            logger.error("Грешка при API филтриране", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * API: Продукт по SKU
     * GET /api/products/{sku}
     */
    @GetMapping(value = "/api/products/{sku}", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseBody
    public ResponseEntity<ProductCatalogDTO> getProductBySku(
            @PathVariable("sku")
            @Size(min = 1, max = 50, message = "SKU трябва да бъде между 1 и 50 символа")
            String sku,
            Authentication auth) {

        try {
            String username = auth != null ? auth.getName() : "anonymous";
            logger.debug("API заявка за продукт: {} от потребител: {}", sku, username);

            Optional<ProductEntity> productOpt = catalogService.findProductBySku(sku);

            if (productOpt.isEmpty()) {
                logger.info("Продукт с SKU '{}' не е намерен", sku);
                return ResponseEntity.notFound().build();
            }

            ProductCatalogDTO productDTO = ProductCatalogDTO.from(productOpt.get());
            logger.debug("API връща продукт: {}", sku);

            return ResponseEntity.ok()
                    .header("Cache-Control", "public, max-age=600") // 10 минути кеш за единичен продукт
                    .body(productDTO);

        } catch (Exception e) {
            logger.error("Грешка при API заявка за продукт: {}", sku, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * API: Метаданни на каталога (категории, статистики)
     * GET /api/catalog/metadata
     */
    @GetMapping(value = "/api/catalog/metadata", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getCatalogMetadata(Authentication auth) {
        try {
            String username = auth != null ? auth.getName() : "anonymous";
            logger.debug("API заявка за метаданни от потребител: {}", username);

            Map<String, Object> metadata = new HashMap<>();
            metadata.put("totalProducts", catalogService.countActiveProducts());
            metadata.put("categories", catalogService.getAllCategories());
            metadata.put("categoryStats", catalogService.getCategoryStatistics());
            metadata.put("priceStats", catalogService.getPriceStatistics());

            logger.debug("API връща метаданни на каталога");

            return ResponseEntity.ok()
                    .header("Cache-Control", "public, max-age=1800") // 30 минути кеш за метаданни
                    .body(metadata);

        } catch (Exception e) {
            logger.error("Грешка при API заявка за метаданни", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * API: Проверка на наличност на продукт
     * GET /api/products/{sku}/availability
     */
    @GetMapping(value = "/api/products/{sku}/availability", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseBody
    public ResponseEntity<Map<String, Object>> checkProductAvailability(
            @PathVariable("sku") String sku,
            Authentication auth) {

        try {
            String username = auth != null ? auth.getName() : "anonymous";
            logger.debug("API проверка на наличност: {} от потребител: {}", sku, username);

            boolean available = catalogService.isProductAvailable(sku);

            Map<String, Object> result = new HashMap<>();
            result.put("sku", sku);
            result.put("available", available);
            result.put("timestamp", System.currentTimeMillis());

            logger.debug("API наличност за '{}': {}", sku, available);

            return ResponseEntity.ok()
                    .header("Cache-Control", "public, max-age=60") // 1 минута кеш за наличност
                    .body(result);

        } catch (Exception e) {
            logger.error("Грешка при API проверка на наличност: {}", sku, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ==========================================
    // ERROR HANDLING
    // ==========================================

    /**
     * Handling на validation грешки
     */
    @ExceptionHandler(jakarta.validation.ConstraintViolationException.class)
    @ResponseBody
    public ResponseEntity<Map<String, String>> handleValidationErrors(
            jakarta.validation.ConstraintViolationException ex) {

        logger.warn("Validation грешка в каталог API: {}", ex.getMessage());

        Map<String, String> errors = new HashMap<>();
        ex.getConstraintViolations().forEach(violation -> {
            String fieldName = violation.getPropertyPath().toString();
            String message = violation.getMessage();
            errors.put(fieldName, message);
        });

        return ResponseEntity.badRequest().body(errors);
    }

    /**
     * General exception handler
     */
    @ExceptionHandler(Exception.class)
    @ResponseBody
    public ResponseEntity<Map<String, String>> handleGeneralError(Exception ex, HttpServletRequest request) {
        String endpoint = request.getRequestURI();
        logger.error("Неочаквана грешка в каталог endpoint: {}", endpoint, ex);

        Map<String, String> error = new HashMap<>();
        error.put("message", "Възникна грешка при обработка на заявката");
        error.put("error", "INTERNAL_SERVER_ERROR");

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    /**
     * Health check за каталог API
     */
    @GetMapping(value = "/api/catalog/health", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseBody
    public ResponseEntity<Map<String, Object>> healthCheck() {
        try {
            long productCount = catalogService.countActiveProducts();

            Map<String, Object> health = new HashMap<>();
            health.put("status", "UP");
            health.put("activeProducts", productCount);
            health.put("timestamp", System.currentTimeMillis());
            health.put("version", "1.0.0");

            return ResponseEntity.ok(health);

        } catch (Exception e) {
            logger.error("Грешка при health check", e);

            Map<String, Object> health = new HashMap<>();
            health.put("status", "DOWN");
            health.put("error", "Service unavailable");
            health.put("timestamp", System.currentTimeMillis());

            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(health);
        }
    }
}