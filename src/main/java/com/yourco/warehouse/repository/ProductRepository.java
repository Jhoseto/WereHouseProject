package com.yourco.warehouse.repository;

import com.yourco.warehouse.entity.ProductEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.QueryHint;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<ProductEntity, Long> {

    // ==========================================
    // BASIC PRODUCT QUERIES
    // ==========================================

    Optional<ProductEntity> findBySku(String sku);
    Optional<ProductEntity> findBySkuAndActiveTrue(String sku);

    boolean existsBySku(String sku);
    boolean existsBySkuAndActiveTrue(String sku);

    // ==========================================
    // CATALOG OPTIMIZED QUERIES
    // ==========================================

    /**
     * Получава всички активни продукти с оптимизирано сортиране
     * Кешира се на ниво Service
     */
    @Query("SELECT p FROM ProductEntity p WHERE p.active = true ORDER BY p.name ASC")
    @QueryHints({
            @QueryHint(name = "org.hibernate.readOnly", value = "true"),
            @QueryHint(name = "org.hibernate.fetchSize", value = "100")
    })
    List<ProductEntity> findAllActiveProductsOptimized();

    /**
     * Търсене по име и SKU - оптимизирано за каталог
     */
    @Query("SELECT p FROM ProductEntity p WHERE p.active = true AND " +
            "(LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(p.sku) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(p.description) LIKE LOWER(CONCAT('%', :query, '%'))) " +
            "ORDER BY " +
            "CASE WHEN LOWER(p.name) LIKE LOWER(CONCAT(:query, '%')) THEN 1 " +
            "     WHEN LOWER(p.sku) LIKE LOWER(CONCAT(:query, '%')) THEN 2 " +
            "     WHEN LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) THEN 3 " +
            "     ELSE 4 END, " +
            "p.name ASC")
    @QueryHints({
            @QueryHint(name = "org.hibernate.readOnly", value = "true")
    })
    List<ProductEntity> searchActiveProductsOptimized(@Param("query") String query);

    /**
     * Филтриране по категория
     */
    @Query("SELECT p FROM ProductEntity p WHERE p.active = true AND p.category = :category ORDER BY p.name ASC")
    @QueryHints({
            @QueryHint(name = "org.hibernate.readOnly", value = "true")
    })
    List<ProductEntity> findActiveProductsByCategory(@Param("category") String category);

    /**
     * Филтриране по ценови диапазон
     */
    @Query("SELECT p FROM ProductEntity p WHERE p.active = true AND " +
            "p.price >= :minPrice AND p.price <= :maxPrice ORDER BY p.price ASC")
    @QueryHints({
            @QueryHint(name = "org.hibernate.readOnly", value = "true")
    })
    List<ProductEntity> findActiveProductsByPriceRange(
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice
    );

    /**
     * Комбинирано филтриране - категория и ценови диапазон
     */
    @Query("SELECT p FROM ProductEntity p WHERE p.active = true AND " +
            "(:category IS NULL OR p.category = :category) AND " +
            "(:minPrice IS NULL OR p.price >= :minPrice) AND " +
            "(:maxPrice IS NULL OR p.price <= :maxPrice) " +
            "ORDER BY p.name ASC")
    @QueryHints({
            @QueryHint(name = "org.hibernate.readOnly", value = "true")
    })
    List<ProductEntity> findActiveProductsWithFilters(
            @Param("category") String category,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice
    );

    /**
     * Получава всички категории за филтър dropdown
     */
    @Query("SELECT DISTINCT p.category FROM ProductEntity p WHERE p.active = true AND p.category IS NOT NULL ORDER BY p.category")
    @QueryHints({
            @QueryHint(name = "org.hibernate.cacheable", value = "true")
    })
    List<String> findAllActiveCategories();

    /**
     * Получава всички units за филтър dropdown
     */
    @Query("SELECT DISTINCT p.unit FROM ProductEntity p WHERE p.active = true AND p.unit IS NOT NULL ORDER BY p.unit")
    @QueryHints({
            @QueryHint(name = "org.hibernate.cacheable", value = "true")
    })
    List<String> findAllActiveUnits();

    // ==========================================
    // STATISTICS QUERIES
    // ==========================================

    @Query("SELECT COUNT(p) FROM ProductEntity p WHERE p.active = true")
    long countByActiveProducts();

    @Query("SELECT COUNT(p) FROM ProductEntity p WHERE p.active = true AND p.category = :category")
    long countActiveProductsByCategory(@Param("category") String category);

    @Query("SELECT p.category, COUNT(p) FROM ProductEntity p WHERE p.active = true AND p.category IS NOT NULL GROUP BY p.category ORDER BY p.category")
    List<Object[]> countProductsByCategory();

    @Query("SELECT MIN(p.price), MAX(p.price), AVG(p.price) FROM ProductEntity p WHERE p.active = true")
    Object[] getPriceStatistics();

    // ==========================================
    // LEGACY SUPPORT (за съвместимост)
    // ==========================================

    List<ProductEntity> findByActiveTrue();
    Page<ProductEntity> findByActiveTrueOrderByName(Pageable pageable);

    List<ProductEntity> findByActiveTrueAndNameContainingIgnoreCase(String query);
    Page<ProductEntity> findByActiveTrueAndNameContainingIgnoreCaseOrderByName(String query, Pageable pageable);

    long countByActiveTrue();

    /**
     * Legacy search method
     */
    @Query("SELECT p FROM ProductEntity p WHERE p.active = true AND (p.name LIKE %?1% OR p.sku LIKE %?1%)")
    List<ProductEntity> searchActiveProducts(String query);

    /**
     * Legacy method за валидни цени
     */
    @Query("SELECT p FROM ProductEntity p WHERE p.active = true AND p.price > 0 ORDER BY p.name")
    List<ProductEntity> findActiveProductsWithValidPrice();
}