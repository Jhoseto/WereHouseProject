package com.yourco.warehouse.service.impl;

import com.yourco.warehouse.dto.ProductAdminDTO;
import com.yourco.warehouse.dto.ProductStatsDTO;
import com.yourco.warehouse.entity.InventoryAdjustmentEntity;
import com.yourco.warehouse.entity.ProductEntity;
import com.yourco.warehouse.entity.enums.AdjustmentTypeEnum;
import com.yourco.warehouse.repository.InventoryAdjustmentRepository;
import com.yourco.warehouse.repository.ProductRepository;
import com.yourco.warehouse.service.ProductService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ProductServiceImpl implements ProductService {

    private static final Logger log = LoggerFactory.getLogger(ProductServiceImpl.class);
    private final ProductRepository productRepository;
    private final InventoryAdjustmentRepository inventoryAdjustmentRepository;

    public ProductServiceImpl(ProductRepository productRepository, InventoryAdjustmentRepository inventoryAdjustmentRepository) {
        this.productRepository = productRepository;
        this.inventoryAdjustmentRepository = inventoryAdjustmentRepository;
    }

    // ===== СЪЩЕСТВУВАЩ МЕТОД =====
    @Override
    public long getActiveProductsCount() {
        return productRepository.countByActiveTrue();
    }

    // ===== НОВИ МЕТОДИ =====

    @Override
    @Transactional(readOnly = true)
    public List<ProductAdminDTO> getAllProducts(String search, String category, Boolean active) {
        log.debug("Getting products with filters - search: {}, category: {}, active: {}",
                search, category, active);

        List<ProductEntity> entities;

        // Логика за филтриране - МИНИМАЛЕН КОД, МАКСИМАЛНА ЕФЕКТИВНОСТ
        if (search != null && !search.trim().isEmpty()) {
            // Search в име или SKU
            entities = productRepository.searchActiveProducts(search);
            // Допълнителни филтри ако има
            if (category != null) {
                entities = entities.stream()
                        .filter(p -> category.equals(p.getCategory()))
                        .toList();
            }
            if (active != null) {
                entities = entities.stream()
                        .filter(p -> active.equals(p.isActive()))
                        .toList();
            }
        } else if (category != null || active != null) {
            // Филтриране само по категория/статус
            entities = productRepository.findAll().stream()
                    .filter(p -> (category == null || category.equals(p.getCategory())))
                    .filter(p -> (active == null || active.equals(p.isActive())))
                    .toList();
        } else {
            // Всички продукти
            entities = productRepository.findAll();
        }

        log.debug("Found {} products", entities.size());
        return ProductAdminDTO.from(entities);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductAdminDTO getProductById(Long id) {
        log.debug("Getting product by id: {}", id);

        ProductEntity entity = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Продуктът не е намерен: " + id));

        return ProductAdminDTO.from(entity);
    }

    @Override
    @Transactional
    public ProductAdminDTO createProduct(ProductAdminDTO dto) {
        log.info("Creating new product: {}", dto.getSku());

        if (productRepository.existsBySku(dto.getSku())) {
            throw new IllegalArgumentException("Продукт с SKU '" + dto.getSku() + "' вече съществува");
        }

        ProductEntity entity = dto.toEntity();
        entity.setId(null);
        entity.setCreatedAt(LocalDateTime.now());

        ProductEntity saved = productRepository.save(entity);
        log.info("Product created successfully: {} - {}", saved.getId(), saved.getSku());

        // Създаваме INITIAL adjustment record за началното количество
        if (saved.getQuantityAvailable() != null && saved.getQuantityAvailable() > 0) {
            InventoryAdjustmentEntity initialAdjustment = new InventoryAdjustmentEntity();
            initialAdjustment.setProduct(saved);
            initialAdjustment.setAdjustmentType(AdjustmentTypeEnum.INITIAL);
            initialAdjustment.setQuantityChange(saved.getQuantityAvailable());
            initialAdjustment.setQuantityBefore(0);
            initialAdjustment.setQuantityAfter(saved.getQuantityAvailable());
            initialAdjustment.setReason(null);  // Няма reason при INITIAL
            initialAdjustment.setNote(dto.getDescription());  // Използваме описанието като бележка
            initialAdjustment.setPerformedBy("system");
            initialAdjustment.setPerformedAt(LocalDateTime.now());

            inventoryAdjustmentRepository.save(initialAdjustment);
            log.info("Initial adjustment record created for product {}", saved.getId());
        }

        return ProductAdminDTO.from(saved);
    }

    @Override
    @Transactional
    public ProductAdminDTO updateProduct(Long id, ProductAdminDTO dto) {
        log.info("Updating product: {}", id);

        // Намираме съществуващия
        ProductEntity existing = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Продуктът не е намерен: " + id));

        // Проверка дали SKU се променя и дали новият не е зает
        if (!existing.getSku().equals(dto.getSku())) {
            if (productRepository.existsBySku(dto.getSku())) {
                throw new IllegalArgumentException("Продукт с SKU '" + dto.getSku() + "' вече съществува");
            }
        }

        // Обновяваме полетата
        existing.setSku(dto.getSku());
        existing.setName(dto.getName());
        existing.setUnit(dto.getUnit());
        existing.setPrice(dto.getPrice());
        existing.setVatRate(dto.getVatRate());
        existing.setDescription(dto.getDescription());
        existing.setCategory(dto.getCategory());
        existing.setActive(dto.isActive());

        // ВАЖНО: Обновяваме и количествата
        // В production environment може да искаш да логваш тези промени
        if (dto.getQuantityAvailable() != null) {
            existing.setQuantityAvailable(dto.getQuantityAvailable());
        }
        if (dto.getQuantityReserved() != null) {
            existing.setQuantityReserved(dto.getQuantityReserved());
        }

        // Запазваме
        ProductEntity saved = productRepository.save(existing);
        log.info("Product updated successfully: {}", id);

        return ProductAdminDTO.from(saved);
    }

    @Override
    @Transactional
    public void deactivateProduct(Long id) {
        log.info("Deactivating product: {}", id);

        ProductEntity entity = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Продуктът не е намерен: " + id));

        entity.setActive(false);
        productRepository.save(entity);

        log.info("Product deactivated: {}", id);
    }

    @Override
    @Transactional
    public void activateProduct(Long id) {
        log.info("Activating product: {}", id);

        ProductEntity entity = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Продуктът не е намерен: " + id));

        entity.setActive(true);
        productRepository.save(entity);

        log.info("Product activated: {}", id);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductStatsDTO getProductStats() {
        log.debug("Calculating product statistics");

        long totalProducts = productRepository.count();
        long activeProducts = productRepository.countByActiveTrue();

        // Low stock (actual available <= 10)
        long lowStockCount = productRepository.findAll().stream()
                .filter(p -> p.isActive())
                .filter(p -> {
                    int actual = (p.getQuantityAvailable() != null ? p.getQuantityAvailable() : 0) -
                            (p.getQuantityReserved() != null ? p.getQuantityReserved() : 0);
                    return actual > 0 && actual <= 10;
                })
                .count();

        // Out of stock (actual available <= 0)
        long outOfStockCount = productRepository.findAll().stream()
                .filter(p -> p.isActive())
                .filter(p -> {
                    int actual = (p.getQuantityAvailable() != null ? p.getQuantityAvailable() : 0) -
                            (p.getQuantityReserved() != null ? p.getQuantityReserved() : 0);
                    return actual <= 0;
                })
                .count();

        // Total inventory value
        BigDecimal totalValue = productRepository.findAll().stream()
                .filter(ProductEntity::isActive)
                .map(p -> {
                    int qty = p.getQuantityAvailable() != null ? p.getQuantityAvailable() : 0;
                    BigDecimal price = p.getPrice() != null ? p.getPrice() : BigDecimal.ZERO;
                    return price.multiply(BigDecimal.valueOf(qty));
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Categories count
        long categoriesCount = productRepository.findDistinctCategories().size();

        log.debug("Stats calculated - total: {}, active: {}, lowStock: {}, outOfStock: {}, value: {}, categories: {}",
                totalProducts, activeProducts, lowStockCount, outOfStockCount, totalValue, categoriesCount);

        return new ProductStatsDTO(totalProducts, activeProducts, lowStockCount,
                outOfStockCount, totalValue, categoriesCount);
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> getAllCategories() {
        return productRepository.findDistinctCategories();
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> getAllUnits() {
        return productRepository.findAllActiveUnits();
    }

    @Override
    @Transactional
    public ProductAdminDTO adjustInventory(Long productId, Integer quantity, String type) {
        log.info("Adjusting inventory for product: {}, type: {}, quantity: {}",
                productId, type, quantity);

        ProductEntity entity = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Продуктът не е намерен: " + productId));

        int currentQty = entity.getQuantityAvailable() != null ? entity.getQuantityAvailable() : 0;
        int newQty;

        // Минимална логика за трите типа корекции
        switch (type.toUpperCase()) {
            case "ADD":
                newQty = currentQty + quantity;
                break;
            case "REMOVE":
                newQty = Math.max(0, currentQty - quantity);
                break;
            case "SET":
                newQty = quantity;
                break;
            default:
                throw new IllegalArgumentException("Невалиден тип корекция: " + type);
        }

        entity.setQuantityAvailable(newQty);
        ProductEntity saved = productRepository.save(entity);

        log.info("Inventory adjusted: {} -> {}", currentQty, newQty);
        return ProductAdminDTO.from(saved);
    }
}