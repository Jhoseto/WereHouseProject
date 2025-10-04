package com.yourco.warehouse.controllers;

import com.yourco.warehouse.dto.InventoryAdjustmentDTO;
import com.yourco.warehouse.dto.ProductAdminDTO;
import com.yourco.warehouse.dto.ProductStatsDTO;
import com.yourco.warehouse.service.InventoryAdjustmentService;
import com.yourco.warehouse.service.InventoryBroadcastService;
import com.yourco.warehouse.service.ProductService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST Controller за admin inventory management
 * МИНИМАЛЕН КОД - всяка операция е максимално опростена
 */
@RestController
@RequestMapping("/admin/inventory")
@PreAuthorize("hasRole('ADMIN')")
public class InventoryController {

    private static final Logger log = LoggerFactory.getLogger(InventoryController.class);

    private final ProductService productService;
    private final InventoryAdjustmentService adjustmentService;
    private final InventoryBroadcastService broadcastService;

    public InventoryController(ProductService productService,
                               InventoryAdjustmentService adjustmentService,
                               InventoryBroadcastService broadcastService) {
        this.productService = productService;
        this.adjustmentService = adjustmentService;
        this.broadcastService = broadcastService;
    }

    // ==========================================
    // PRODUCTS CRUD
    // ==========================================

    /**
     * GET /admin/inventory/products - Всички продукти с optional филтри
     * Query params: search, category, active
     */
    @GetMapping("/products")
    public ResponseEntity<Map<String, Object>> getAllProducts(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Boolean active) {

        log.info("GET /admin/inventory/products - search: {}, category: {}, active: {}",
                search, category, active);

        try {
            List<ProductAdminDTO> products = productService.getAllProducts(search, category, active);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("products", products);
            response.put("count", products.size());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting products", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Грешка при зареждане на продукти"));
        }
    }

    /**
     * GET /admin/inventory/products/{id} - Детайли за един продукт
     */
    @GetMapping("/products/{id}")
    public ResponseEntity<Map<String, Object>> getProduct(@PathVariable Long id) {
        log.info("GET /admin/inventory/products/{}", id);

        try {
            ProductAdminDTO product = productService.getProductById(id);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "product", product
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            log.error("Error getting product", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Грешка при зареждане на продукт"));
        }
    }

    /**
     * POST /admin/inventory/products - Създаване на нов продукт
     */
    @PostMapping("/products")
    public ResponseEntity<Map<String, Object>> createProduct(@Valid @RequestBody ProductAdminDTO dto) {
        log.info("POST /admin/inventory/products - Creating: {}", dto.getSku());

        try {
            ProductAdminDTO created = productService.createProduct(dto);

            // Broadcast промяната към всички admin clients
            broadcastService.broadcastProductUpdate(created, "created");

            // Broadcast обновени статистики
            broadcastService.broadcastStatsUpdate(productService.getProductStats());

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Map.of(
                            "success", true,
                            "message", "Продуктът е създаден успешно",
                            "product", created
                    ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            log.error("Error creating product", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Грешка при създаване на продукт"));
        }
    }

    /**
     * PUT /admin/inventory/products/{id} - Редакция на продукт
     */
    @PutMapping("/products/{id}")
    public ResponseEntity<Map<String, Object>> updateProduct(
            @PathVariable Long id,
            @Valid @RequestBody ProductAdminDTO dto) {

        log.info("PUT /admin/inventory/products/{} - Updating", id);

        try {
            ProductAdminDTO updated = productService.updateProduct(id, dto);

            // Broadcast промяната
            broadcastService.broadcastProductUpdate(updated, "updated");
            broadcastService.broadcastStatsUpdate(productService.getProductStats());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Продуктът е обновен успешно",
                    "product", updated
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            log.error("Error updating product", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Грешка при обновяване на продукт"));
        }
    }

    /**
     * DELETE /admin/inventory/products/{id} - Деактивиране (soft delete)
     */
    @DeleteMapping("/products/{id}")
    public ResponseEntity<Map<String, Object>> deleteProduct(@PathVariable Long id) {
        log.info("DELETE /admin/inventory/products/{} - Deactivating", id);

        try {
            productService.deactivateProduct(id);

            // Broadcast промяната
            ProductAdminDTO product = productService.getProductById(id);
            broadcastService.broadcastProductUpdate(product, "deleted");
            broadcastService.broadcastStatsUpdate(productService.getProductStats());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Продуктът е деактивиран успешно"
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            log.error("Error deactivating product", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Грешка при деактивиране на продукт"));
        }
    }

    /**
     * POST /admin/inventory/adjustments - Корекция на наличности
     */
    @PostMapping("/adjustments")
    public ResponseEntity<Map<String, Object>> adjustInventory(
            @Valid @RequestBody InventoryAdjustmentDTO dto,
            Authentication authentication) {

        String username = authentication != null ? authentication.getName() : "system";

        log.info("POST /admin/inventory/adjustments - Product: {}, Type: {}, Qty: {} by {}",
                dto.getProductId(), dto.getAdjustmentType(), dto.getQuantity(), username);

        try {
            // Правим корекцията
            ProductAdminDTO updated = adjustmentService.createAdjustment(dto, username);

            // Зареждаме пълната adjustment информация
            List<InventoryAdjustmentDTO> history = adjustmentService.getAdjustmentHistory(dto.getProductId());
            InventoryAdjustmentDTO createdAdjustment = history.isEmpty() ? null : history.get(0);

            // Broadcast промените
            broadcastService.broadcastProductUpdate(updated, "adjusted");
            if (createdAdjustment != null) {
                broadcastService.broadcastInventoryAdjustment(createdAdjustment);
            }
            broadcastService.broadcastStatsUpdate(productService.getProductStats());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Наличността е коригирана успешно",
                    "product", updated,
                    "adjustment", createdAdjustment != null ? createdAdjustment : dto
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            log.error("Error adjusting inventory", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Грешка при корекция на наличности"));
        }
    }

    /**
     * GET /admin/inventory/adjustments - История на всички корекции
     */
    @GetMapping("/adjustments")
    public ResponseEntity<Map<String, Object>> getAllAdjustments() {
        log.debug("GET /admin/inventory/adjustments - Getting all adjustments");

        try {
            List<InventoryAdjustmentDTO> adjustments = adjustmentService.getAllAdjustments();

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "adjustments", adjustments,
                    "count", adjustments.size()
            ));
        } catch (Exception e) {
            log.error("Error getting adjustments", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Грешка при зареждане на корекции"));
        }
    }

    /**
     * GET /admin/inventory/adjustments/product/{id} - История за конкретен продукт
     */
    @GetMapping("/adjustments/product/{productId}")
    public ResponseEntity<Map<String, Object>> getProductAdjustments(@PathVariable Long productId) {
        log.debug("GET /admin/inventory/adjustments/product/{}", productId);

        try {
            List<InventoryAdjustmentDTO> history = adjustmentService.getAdjustmentHistory(productId);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "adjustments", history,
                    "count", history.size()
            ));
        } catch (Exception e) {
            log.error("Error getting product adjustments", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Грешка при зареждане на история"));
        }
    }

    // ==========================================
    // STATISTICS & METADATA
    // ==========================================

    /**
     * GET /admin/inventory/stats - Статистики за KPI cards
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        log.debug("GET /admin/inventory/stats");

        try {
            ProductStatsDTO stats = productService.getProductStats();

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "stats", stats
            ));
        } catch (Exception e) {
            log.error("Error getting stats", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Грешка при зареждане на статистики"));
        }
    }

    /**
     * GET /admin/inventory/categories - Всички категории
     */
    @GetMapping("/categories")
    public ResponseEntity<Map<String, Object>> getCategories() {
        log.debug("GET /admin/inventory/categories");

        try {
            List<String> categories = productService.getAllCategories();

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "categories", categories
            ));
        } catch (Exception e) {
            log.error("Error getting categories", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Грешка при зареждане на категории"));
        }
    }

    /**
     * GET /admin/inventory/units - Всички мерни единици
     */
    @GetMapping("/units")
    public ResponseEntity<Map<String, Object>> getUnits() {
        log.debug("GET /admin/inventory/units");

        try {
            List<String> units = productService.getAllUnits();

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "units", units
            ));
        } catch (Exception e) {
            log.error("Error getting units", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Грешка при зареждане на мерни единици"));
        }
    }


    /**
     * ═══════════════════════════════════════════════════════════
     * EXCEPTION HANDLER - САМО ЗА INVENTORY CONTROLLER
     * ═══════════════════════════════════════════════════════════
     * Хваща всички възможни грешки и ги превръща в JSON responses
     * с ясни съобщения на български за потребителя
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleInventoryErrors(Exception ex) {

        String message;
        HttpStatus status = HttpStatus.BAD_REQUEST;

        // Определяме типа грешка и формираме подходящо съобщение
        if (ex instanceof MethodArgumentNotValidException validationEx) {
            // Validation грешки - вземаме първата и я превеждаме
            message = validationEx.getBindingResult().getFieldErrors().stream()
                    .findFirst()
                    .map(error -> switch (error.getField()) {
                        case "sku" -> "SKU кодът е задължителен и не може да бъде празен";
                        case "name" -> "Името на продукта е задължително";
                        case "price" -> "Невалидна цена - трябва да бъде положително число";
                        case "vatRate" -> "ДДС процентът трябва да бъде между 0 и 100";
                        case "quantityAvailable" -> "Количеството не може да бъде отрицателно";
                        case "category" -> "Категорията е задължителна";
                        case "unit" -> "Мерната единица е задължителна";
                        default -> error.getDefaultMessage();
                    })
                    .orElse("Невалидни данни - проверете попълнените полета");

        } else if (ex instanceof DataIntegrityViolationException) {
            // Database constraint violations - обикновено дублиран SKU
            String errorMsg = ex.getMessage().toLowerCase();
            if (errorMsg.contains("duplicate") || errorMsg.contains("unique")) {
                message = "Продукт с този SKU вече съществува в системата";
            } else if (errorMsg.contains("foreign key")) {
                message = "Този продукт не може да бъде изтрит - използва се в други записи";
            } else {
                message = "Грешка при запазване - проверете дали всички данни са валидни";
            }

        } else if (ex instanceof IllegalArgumentException) {
            // Бизнес логика грешки - директно използваме съобщението от service
            message = ex.getMessage();

        } else if (ex.getMessage() != null && ex.getMessage().contains("not found")) {
            // Entity not found
            message = "Търсеният продукт не е намерен - възможно е да е изтрит";
            status = HttpStatus.NOT_FOUND;

        } else if (ex.getMessage() != null && ex.getMessage().contains("optimistic")) {
            // Concurrent modification
            message = "Друг потребител е променил този продукт - моля опреснете страницата";
            status = HttpStatus.CONFLICT;

        } else {
            // Непредвидена грешка - логваме детайлите но не ги показваме на потребителя
            log.error("Неочаквана грешка в инвентар модула: {}", ex.getMessage(), ex);
            message = "Възникна техническа грешка - моля опитайте отново или се свържете с поддръжката";
            status = HttpStatus.INTERNAL_SERVER_ERROR;
        }

        // Винаги връщаме JSON с ясно съобщение
        return ResponseEntity.status(status)
                .body(Map.of(
                        "success", false,
                        "message", message
                ));
    }
}