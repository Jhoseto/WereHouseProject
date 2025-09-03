package com.yourco.warehouse.service;

import com.yourco.warehouse.config.CacheConfig;
import com.yourco.warehouse.dto.ProductCatalogDTO;
import org.springframework.cache.annotation.Cacheable;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface CatalogService {

    List<ProductCatalogDTO> getAllActiveProducts();

    List<String> getAllCategories();

    Optional<ProductCatalogDTO> getProductById(Long id);

    List<ProductCatalogDTO> searchActive(String query);

    List<ProductCatalogDTO> filterProducts(String category, BigDecimal minPrice, BigDecimal maxPrice);

    List<ProductCatalogDTO> sortProducts(List<ProductCatalogDTO> products, String sortBy);

    long countActiveProductsByCategory(String category);

    @Cacheable(value = CacheConfig.STATISTICS_CACHE, key = "'price_stats'")
    Map<String, BigDecimal> getPriceStatistics();
}
