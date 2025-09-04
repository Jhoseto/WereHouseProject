package com.yourco.warehouse.service.Impl;

import com.yourco.warehouse.config.CacheConfig;
import com.yourco.warehouse.dto.ProductCatalogDTO;
import com.yourco.warehouse.entity.ProductEntity;
import com.yourco.warehouse.repository.ProductRepository;
import com.yourco.warehouse.service.CatalogService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Collator;
import java.util.*;

@Service
public class CatalogServiceImpl implements CatalogService {

    private static final Logger log = LoggerFactory.getLogger(CatalogServiceImpl.class);

    private final ProductRepository productRepository;

    public CatalogServiceImpl(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Cacheable(value = CacheConfig.PRODUCTS_CACHE, key = "'all_active'")
    @Override
    public List<ProductCatalogDTO> getAllActiveProducts() {
        try {
            List<ProductEntity> entities = productRepository.findAllByActiveTrue();
            log.debug("Loaded {} active products", entities.size());
            return ProductCatalogDTO.from(entities);
        } catch (Exception e) {
            log.error("Error fetching active products", e);
            return Collections.emptyList();
        }
    }

    @Cacheable(value = CacheConfig.PRODUCTS_CACHE, key = "'categories'")
    @Override
    public List<String> getAllCategories() {
        try {
            List<String> categories = productRepository.findDistinctCategories();
            categories.removeIf(Objects::isNull);
            categories.sort(Collator.getInstance(new Locale("bg", "BG")));
            return categories;
        } catch (Exception e) {
            log.error("Error fetching categories", e);
            return Collections.emptyList();
        }
    }

    @Cacheable(value = CacheConfig.PRODUCTS_CACHE, key = "#id")
    @Override
    public Optional<ProductCatalogDTO> getProductById(Long id) {
        if (id == null) return Optional.empty();
        return productRepository.findById(id)
                .filter(ProductEntity::isActive)
                .map(ProductCatalogDTO::from);
    }

    @Override
    public List<ProductCatalogDTO> searchActive(String query) {
        if (query == null || query.isBlank()) return Collections.emptyList();

        try {
            String trimmedQuery = sanitizeSearchQuery(query);

            // Direct SKU match (case-insensitive)
            Optional<ProductEntity> direct = productRepository.findBySkuAndActiveTrue(trimmedQuery.toUpperCase());
            if (direct.isPresent()) {
                return List.of(ProductCatalogDTO.from(direct.get()));
            }

            List<ProductEntity> results = productRepository.searchActiveProducts(trimmedQuery);
            log.debug("Search for '{}' returned {} results", trimmedQuery, results.size());
            return ProductCatalogDTO.from(results);
        } catch (Exception e) {
            log.error("Error searching products with query '{}': {}", query, e.getMessage());
            return Collections.emptyList();
        }
    }

    @Override
    public List<ProductCatalogDTO> filterProducts(String category, BigDecimal minPrice, BigDecimal maxPrice) {
        try {
            String normalizedCategory = (category != null && !category.trim().isEmpty()) ?
                    category.trim() : null;
            List<ProductEntity> results = productRepository.findActiveProductsWithFilters(normalizedCategory, minPrice, maxPrice);
            return ProductCatalogDTO.from(results);
        } catch (Exception e) {
            log.error("Error filtering products", e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<ProductCatalogDTO> sortProducts(List<ProductCatalogDTO> products, String sortBy) {
        if (products == null || products.isEmpty()) return Collections.emptyList();

        List<ProductCatalogDTO> sorted = new ArrayList<>(products);
        Collator bgCollator = Collator.getInstance(new Locale("bg", "BG"));

        switch (sortBy) {
            case "price":
                sorted.sort(Comparator.comparing(ProductCatalogDTO::getPrice));
                break;
            case "price-desc":
                sorted.sort(Comparator.comparing(ProductCatalogDTO::getPrice).reversed());
                break;
            case "name":
                sorted.sort(Comparator.comparing(ProductCatalogDTO::getName, bgCollator));
                break;
            case "name-desc":
                sorted.sort(Comparator.comparing(ProductCatalogDTO::getName, bgCollator).reversed());
                break;
            default:
                log.warn("Unknown sort option '{}'. Returning unsorted list.", sortBy);
        }
        return sorted;
    }

    @Override
    public long countActiveProductsByCategory(String category) {
        try {
            if (category == null || category.isBlank()) {
                return productRepository.countByActiveTrue();
            }
            return productRepository.countByCategoryAndActiveTrue(category);
        } catch (Exception e) {
            log.error("Error counting products by category", e);
            return 0;
        }
    }

    @Cacheable(value = CacheConfig.STATISTICS_CACHE, key = "'price_stats'")
    @Override
    public Map<String, BigDecimal> getPriceStatistics() {
        try {
            Object[] stats = productRepository.getPriceStatistics();
            BigDecimal min = (stats != null && stats.length > 0 && stats[0] != null) ? (BigDecimal) stats[0] : BigDecimal.ZERO;
            BigDecimal max = (stats != null && stats.length > 1 && stats[1] != null) ? (BigDecimal) stats[1] : BigDecimal.ZERO;
            BigDecimal avg = (stats != null && stats.length > 2 && stats[2] != null) ?
                    ((BigDecimal) stats[2]).setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

            Map<String, BigDecimal> result = new HashMap<>();
            result.put("min", min);
            result.put("max", max);
            result.put("avg", avg);
            return result;
        } catch (Exception e) {
            log.error("Error getting price statistics", e);
            Map<String, BigDecimal> fallback = new HashMap<>();
            fallback.put("min", BigDecimal.ZERO);
            fallback.put("max", BigDecimal.ZERO);
            fallback.put("avg", BigDecimal.ZERO);
            return fallback;
        }
    }

    // Helper method за sanitizing на search query
    private String sanitizeSearchQuery(String query) {
        if (query == null) return "";
        return query.trim()
                .replaceAll("[<>\"'%;()&+]", "") // Remove dangerous chars
                .substring(0, Math.min(query.length(), 100)); // Limit length
    }
}