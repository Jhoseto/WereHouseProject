package com.yourco.warehouse.controller.admin;

import com.yourco.warehouse.dto.InventoryAdjustmentDTO;
import com.yourco.warehouse.dto.ProductAdminDTO;
import com.yourco.warehouse.dto.ProductStatsDTO;
import com.yourco.warehouse.service.InventoryBroadcastService;
import com.yourco.warehouse.service.ProductService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
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
    private final InventoryBroadcastService broadcastService;

    public InventoryController(ProductService productService,
                               InventoryBroadcastService broadcastService) {
        this.productService = productService;
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

    // ==========================================
    // INVENTORY ADJUSTMENTS
    // ==========================================

    /**
     * POST /admin/inventory/adjustments - Корекция на наличности
     */
    @PostMapping("/adjustments")
    public ResponseEntity<Map<String, Object>> adjustInventory(
            @Valid @RequestBody InventoryAdjustmentDTO dto) {

        log.info("POST /admin/inventory/adjustments - Product: {}, Type: {}, Qty: {}",
                dto.getProductId(), dto.getAdjustmentType(), dto.getQuantity());

        try {
            // Правим корекцията
            ProductAdminDTO updated = productService.adjustInventory(
                    dto.getProductId(),
                    dto.getQuantity(),
                    dto.getAdjustmentType()
            );

            // Попълваме допълнителна информация за adjustment DTO
            dto.setId(System.currentTimeMillis()); // Temporary ID за frontend
            dto.setProductSku(updated.getSku());
            dto.setProductName(updated.getName());
            dto.setNewQuantity(updated.getQuantityAvailable());
            dto.setPerformedAt(LocalDateTime.now());
            // dto.setPerformedBy трябва да се вземе от Authentication, но за простота ще пропуснем

            // Broadcast промените
            broadcastService.broadcastProductUpdate(updated, "adjusted");
            broadcastService.broadcastInventoryAdjustment(dto);
            broadcastService.broadcastStatsUpdate(productService.getProductStats());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Наличността е коригирана успешно",
                    "product", updated,
                    "adjustment", dto
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
}