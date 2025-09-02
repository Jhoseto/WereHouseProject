package com.yourco.warehouse.service;

import com.yourco.warehouse.config.CacheConfig;
import com.yourco.warehouse.entity.ProductEntity;
import com.yourco.warehouse.repository.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.Collator;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class CatalogService {

    private static final Logger logger = LoggerFactory.getLogger(CatalogService.class);

    private final ProductRepository productRepository;

    public CatalogService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    // ==========================================
    // MAIN CATALOG METHODS
    // ==========================================

    /**
     * Получава всички активни продукти (кеширано)
     * Основният метод за каталога - светкавично бързо
     */
    @Cacheable(value = CacheConfig.PRODUCTS_CACHE, key = "'all_active'")
    public List<ProductEntity> getAllActiveProducts() {
        try {
            logger.debug("Зареждане на всички активни продукти от база данни");
            List<ProductEntity> products = productRepository.findAllActiveProductsOptimized();
            logger.info("Заредени {} активни продукта", products.size());
            return products;
        } catch (Exception e) {
            logger.error("Грешка при зареждане на всички активни продукти", e);
            throw new RuntimeException("Не могат да се заредят продуктите", e);
        }
    }

    /**
     * Търсене на продукти с кеширане
     */
    @Cacheable(value = CacheConfig.PRODUCTS_CACHE, key = "#query != null ? 'search_' + #query.toLowerCase() : 'all_active'")
    public List<ProductEntity> searchActive(String query) {
        try {
            if (query == null || query.trim().isEmpty()) {
                logger.debug("Празна заявка - връщаме всички продукти");
                return getAllActiveProducts();
            }

            String trimmedQuery = query.trim();
            logger.debug("Търсене на продукти с заявка: '{}'", trimmedQuery);

            List<ProductEntity> results;

            // Ако заявката е точно SKU, търсим директно
            if (trimmedQuery.matches("^[A-Z0-9\\-_]+$") && trimmedQuery.length() <= 20) {
                Optional<ProductEntity> direct = productRepository.findBySkuAndActiveTrue(trimmedQuery.toUpperCase());
                if (direct.isPresent()) {
                    logger.debug("Намерен продукт по точен SKU: {}", trimmedQuery);
                    return List.of(direct.get());
                }
            }

            // Пълно текстово търсене
            results = productRepository.searchActiveProductsOptimized(trimmedQuery);
            logger.debug("Намерени {} продукта за заявка: '{}'", results.size(), trimmedQuery);

            return results;

        } catch (Exception e) {
            logger.error("Грешка при търсене на продукти с заявка: '{}'", query, e);
            return List.of(); // Връщаме празен списък вместо да хвърляме exception
        }
    }

    /**
     * Филтриране на продукти (използва се от JS фронт-енда)
     */
    public List<ProductEntity> filterProducts(String category, BigDecimal minPrice, BigDecimal maxPrice) {
        try {
            logger.debug("Филтриране: category={}, minPrice={}, maxPrice={}", category, minPrice, maxPrice);

            if (category == null && minPrice == null && maxPrice == null) {
                return getAllActiveProducts();
            }

            List<ProductEntity> results = productRepository.findActiveProductsWithFilters(category, minPrice, maxPrice);
            logger.debug("Намерени {} продукта след филтриране", results.size());

            return results;

        } catch (Exception e) {
            logger.error("Грешка при филтриране на продукти", e);
            return List.of();
        }
    }

    /**
     * Сортиране на продукти
     */
    public List<ProductEntity> sortProducts(List<ProductEntity> products, String sortBy) {
        if (products == null || products.isEmpty()) {
            return products;
        }

        try {
            List<ProductEntity> sorted = new ArrayList<>(products);

            switch (sortBy != null ? sortBy : "name") {
                case "name":
                    sorted.sort(Comparator.comparing(p -> p.getName().toLowerCase(),
                            Collator.getInstance(new Locale("bg", "BG"))));
                    break;
                case "name-desc":
                    sorted.sort(Comparator.comparing((ProductEntity p) -> p.getName().toLowerCase(),
                            Collator.getInstance(new Locale("bg", "BG"))).reversed());
                    break;
                case "price":
                    sorted.sort(Comparator.comparing(ProductEntity::getPrice));
                    break;
                case "price-desc":
                    sorted.sort(Comparator.comparing(ProductEntity::getPrice).reversed());
                    break;
                case "category":
                    sorted.sort(Comparator.comparing(p -> p.getCategory() != null ? p.getCategory().toLowerCase() : "",
                            Collator.getInstance(new Locale("bg", "BG"))));
                    break;
                case "sku":
                    sorted.sort(Comparator.comparing(ProductEntity::getSku));
                    break;
                default:
                    logger.warn("Неподдържан метод за сортиране: {}", sortBy);
            }

            logger.debug("Продуктите са сортирани по: {}", sortBy);
            return sorted;

        } catch (Exception e) {
            logger.error("Грешка при сортиране на продукти по: {}", sortBy, e);
            return products; // Връщаме несортирани при грешка
        }
    }

    // ==========================================
    // METADATA METHODS (за филтри)
    // ==========================================

    /**
     * Получава всички категории (кеширано)
     */
    @Cacheable(value = CacheConfig.PRODUCTS_CACHE, key = "'categories'")
    public List<String> getAllCategories() {
        try {
            List<String> categories = productRepository.findAllActiveCategories();
            logger.debug("Заредени {} категории", categories.size());
            return categories;
        } catch (Exception e) {
            logger.error("Грешка при зареждане на категории", e);
            return List.of();
        }
    }

    /**
     * Получава статистика за цени (min, max, average)
     */
    @Cacheable(value = CacheConfig.STATISTICS_CACHE, key = "'price_stats'")
    public Map<String, BigDecimal> getPriceStatistics() {
        try {
            Object[] stats = productRepository.getPriceStatistics();
            Map<String, BigDecimal> result = new HashMap<>();

            if (stats != null && stats.length == 3) {
                result.put("minPrice", (BigDecimal) stats[0]);
                result.put("maxPrice", (BigDecimal) stats[1]);
                result.put("avgPrice", (BigDecimal) stats[2]);
            } else {
                result.put("minPrice", BigDecimal.ZERO);
                result.put("maxPrice", BigDecimal.valueOf(1000));
                result.put("avgPrice", BigDecimal.valueOf(50));
            }

            logger.debug("Статистика за цени: {}", result);
            return result;

        } catch (Exception e) {
            logger.error("Грешка при извличане на статистика за цени", e);
            Map<String, BigDecimal> fallback = new HashMap<>();
            fallback.put("minPrice", BigDecimal.ZERO);
            fallback.put("maxPrice", BigDecimal.valueOf(1000));
            fallback.put("avgPrice", BigDecimal.valueOf(50));
            return fallback;
        }
    }

    /**
     * Статистика по категории
     */
    @Cacheable(value = CacheConfig.STATISTICS_CACHE, key = "'category_stats'")
    public Map<String, Long> getCategoryStatistics() {
        try {
            List<Object[]> stats = productRepository.countProductsByCategory();
            Map<String, Long> result = stats.stream()
                    .collect(Collectors.toMap(
                            row -> (String) row[0],
                            row -> (Long) row[1],
                            (existing, replacement) -> existing,
                            LinkedHashMap::new
                    ));

            logger.debug("Статистика по категории: {}", result);
            return result;

        } catch (Exception e) {
            logger.error("Грешка при извличане на статистика по категории", e);
            return new LinkedHashMap<>();
        }
    }

    // ==========================================
    // SINGLE PRODUCT METHODS
    // ==========================================

    /**
     * Намиране на продукт по SKU
     */
    public Optional<ProductEntity> findProductBySku(String sku) {
        if (sku == null || sku.trim().isEmpty()) {
            return Optional.empty();
        }

        try {
            String cleanSku = sku.trim().toUpperCase();
            Optional<ProductEntity> product = productRepository.findBySkuAndActiveTrue(cleanSku);

            if (product.isPresent()) {
                logger.debug("Намерен продукт с SKU: {}", cleanSku);
            } else {
                logger.debug("Не е намерен продукт с SKU: {}", cleanSku);
            }

            return product;

        } catch (Exception e) {
            logger.error("Грешка при търсене на продукт по SKU: {}", sku, e);
            return Optional.empty();
        }
    }

    /**
     * Проверява дали продукт съществува и е активен
     */
    public boolean isProductAvailable(String sku) {
        if (sku == null || sku.trim().isEmpty()) {
            return false;
        }

        try {
            return productRepository.existsBySkuAndActiveTrue(sku.trim().toUpperCase());
        } catch (Exception e) {
            logger.error("Грешка при проверка на наличност на продукт: {}", sku, e);
            return false;
        }
    }

    // ==========================================
    // STATISTICS METHODS
    // ==========================================

    /**
     * Общ брой активни продукти
     */
    @Cacheable(value = CacheConfig.STATISTICS_CACHE, key = "'active_count'")
    public long countActiveProducts() {
        try {
            long count = productRepository.countByActiveProducts();
            logger.debug("Общ брой активни продукти: {}", count);
            return count;
        } catch (Exception e) {
            logger.error("Грешка при броене на активни продукти", e);
            return 0;
        }
    }

    /**
     * Брой продукти в категория
     */
    public long countActiveProductsByCategory(String category) {
        if (category == null || category.trim().isEmpty()) {
            return countActiveProducts();
        }

        try {
            long count = productRepository.countActiveProductsByCategory(category.trim());
            logger.debug("Брой продукти в категория '{}': {}", category, count);
            return count;
        } catch (Exception e) {
            logger.error("Грешка при броене на продукти в категория: {}", category, e);
            return 0;
        }
    }

    // ==========================================
    // PAGINATED METHODS (за по-голям мащаб)
    // ==========================================

    /**
     * Paginated версия за големи каталози
     */
    public Page<ProductEntity> searchActivePaginated(String query, Pageable pageable) {
        try {
            if (query == null || query.trim().isEmpty()) {
                return productRepository.findByActiveTrueOrderByName(pageable);
            }

            String trimmedQuery = query.trim();
            return productRepository.findByActiveTrueAndNameContainingIgnoreCaseOrderByName(trimmedQuery, pageable);

        } catch (Exception e) {
            logger.error("Грешка при paginaded търсене на продукти с заявка: '{}'", query, e);
            return Page.empty(pageable);
        }
    }

    // ==========================================
    // VALIDATION METHODS
    // ==========================================

    /**
     * Валидация на търсачка
     */
    public String sanitizeSearchQuery(String query) {
        if (query == null) {
            return null;
        }

        String sanitized = query.trim();
        if (sanitized.isEmpty()) {
            return null;
        }

        // Ограничаваме дължината
        if (sanitized.length() > 100) {
            sanitized = sanitized.substring(0, 100);
        }

        // Премахваме опасни символи за SQL injection (въпреки че JPA ги escape-ва)
        sanitized = sanitized.replaceAll("[<>\"'%;()&+]", " ");

        return sanitized.trim().isEmpty() ? null : sanitized;
    }

    /**
     * Валидация на филтри
     */
    public boolean isValidPriceRange(BigDecimal minPrice, BigDecimal maxPrice) {
        if (minPrice == null && maxPrice == null) {
            return true;
        }

        if (minPrice != null && minPrice.compareTo(BigDecimal.ZERO) < 0) {
            return false;
        }

        if (maxPrice != null && maxPrice.compareTo(BigDecimal.ZERO) < 0) {
            return false;
        }

        if (minPrice != null && maxPrice != null && minPrice.compareTo(maxPrice) > 0) {
            return false;
        }

        return true;
    }
}