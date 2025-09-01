package com.yourco.warehouse.service;

import com.yourco.warehouse.entity.Product;
import com.yourco.warehouse.repository.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CatalogService {

    private static final Logger logger = LoggerFactory.getLogger(CatalogService.class);

    private final ProductRepository productRepository;

    public CatalogService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Cacheable(value = "products", key = "#query ?: 'all'", unless = "#result.isEmpty()")
    public List<Product> searchActive(String query) {
        try {
            if (query == null || query.isBlank()) {
                logger.debug("Зареждане на всички активни продукти");
                return productRepository.findByActiveTrue();
            }

            String trimmedQuery = query.trim();
            logger.debug("Търсене на продукти с заявка: '{}'", trimmedQuery);

            List<Product> results = productRepository.findByActiveTrueAndNameContainingIgnoreCase(trimmedQuery);

            // Ако няма резултати по име, опитваме се по SKU
            if (results.isEmpty()) {
                logger.debug("Няма резултати по име, търсене по SKU: '{}'", trimmedQuery);
                Optional<Product> productBySku = productRepository.findBySkuAndActiveTrue(trimmedQuery.toUpperCase());
                if (productBySku.isPresent()) {
                    results = List.of(productBySku.get());
                }
            }

            logger.debug("Намерени {} продукта за заявка: '{}'", results.size(), trimmedQuery);
            return results;

        } catch (Exception e) {
            logger.error("Грешка при търсене на продукти с заявка: '{}'", query, e);
            return List.of(); // Връщаме празен списък вместо да хвърляме exception
        }
    }

    public Page<Product> searchActivePaginated(String query, Pageable pageable) {
        try {
            if (query == null || query.isBlank()) {
                return productRepository.findByActiveTrueOrderByName(pageable);
            }

            String trimmedQuery = query.trim();
            return productRepository.findByActiveTrueAndNameContainingIgnoreCaseOrderByName(trimmedQuery, pageable);

        } catch (Exception e) {
            logger.error("Грешка при paginaged търсене на продукти с заявка: '{}'", query, e);
            return Page.empty(pageable);
        }
    }

    public Optional<Product> findProductBySku(String sku) {
        if (sku == null || sku.trim().isEmpty()) {
            return Optional.empty();
        }

        return productRepository.findBySkuAndActiveTrue(sku.trim().toUpperCase());
    }

    public List<Product> getAllActiveProducts() {
        return productRepository.findByActiveTrue();
    }

    public long countActiveProducts() {
        return productRepository.countByActiveTrue();
    }
}