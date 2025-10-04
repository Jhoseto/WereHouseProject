package com.yourco.warehouse.repository;

import com.yourco.warehouse.entity.ProductEntity;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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

    // Изрично добавен за CatalogServiceImpl
    List<ProductEntity> findAllByActiveTrue();

    // Legacy поддръжка (оставяме и този, за да не счупим нищо)
    List<ProductEntity> findByActiveTrue();

    // ==========================================
    // CATALOG OPTIMIZED QUERIES
    // ==========================================

    /**
     * Всички активни продукти с оптимизирано сортиране
     * Кеш/Read-Only подсказки за Hibernate
     */
    @Query("SELECT p FROM ProductEntity p WHERE p.active = true ORDER BY p.name ASC")
    @QueryHints({
            @QueryHint(name = "org.hibernate.readOnly", value = "true"),
            @QueryHint(name = "org.hibernate.fetchSize", value = "100")
    })
    List<ProductEntity> findAllActiveProductsOptimized();

    /**
     * Оптимизирано търсене по име, SKU и описание
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
     * Филтър по категория
     */
    @Query("SELECT p FROM ProductEntity p WHERE p.active = true AND p.category = :category ORDER BY p.name ASC")
    @QueryHints({
            @QueryHint(name = "org.hibernate.readOnly", value = "true")
    })
    List<ProductEntity> findActiveProductsByCategory(@Param("category") String category);

    /**
     * Филтър по ценови диапазон
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
     * Комбинирано филтриране – категория и ценови диапазон
     * Използва се директно от сервиса (НЕ пипай името)
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
     * Категории за dropdown – използва се от сервиса като findDistinctCategories()
     */
    @Query("SELECT DISTINCT p.category FROM ProductEntity p WHERE p.active = true AND p.category IS NOT NULL")
    @QueryHints({
            @QueryHint(name = "org.hibernate.cacheable", value = "true"),
            @QueryHint(name = "org.hibernate.readOnly", value = "true")
    })
    List<String> findDistinctCategories();

    /**
     * Всички units за dropdown (оставяме за UI филтри)
     */
    @Query("SELECT DISTINCT p.unit FROM ProductEntity p WHERE p.active = true AND p.unit IS NOT NULL ORDER BY p.unit")
    @QueryHints({
            @QueryHint(name = "org.hibernate.cacheable", value = "true"),
            @QueryHint(name = "org.hibernate.readOnly", value = "true")
    })
    List<String> findAllActiveUnits();

    // ==========================================
    // STATISTICS QUERIES
    // ==========================================

    @Query("SELECT COUNT(p) FROM ProductEntity p WHERE p.active = true")
    long countByActiveProducts();

    // За да съвпадне с CatalogServiceImpl.countActiveProductsByCategory(...)
    long countByCategoryAndActiveTrue(String category);

    @Query("SELECT p.category, COUNT(p) FROM ProductEntity p WHERE p.active = true AND p.category IS NOT NULL GROUP BY p.category ORDER BY p.category")
    List<Object[]> countProductsByCategory();

    /**
     * Използва се от сервиса за price stats
     * Индексите: [0]=MIN, [1]=MAX, [2]=AVG
     */
    @Query("SELECT MIN(p.price), MAX(p.price), AVG(p.price) FROM ProductEntity p WHERE p.active = true")
    Object[] getPriceStatistics();

    // ==========================================
    // LEGACY SUPPORT (оставени за съвместимост)
    // ==========================================

    Page<ProductEntity> findByActiveTrueOrderByName(Pageable pageable);

    List<ProductEntity> findByActiveTrueAndNameContainingIgnoreCase(String query);
    Page<ProductEntity> findByActiveTrueAndNameContainingIgnoreCaseOrderByName(String query, Pageable pageable);

    long countByActiveTrue();

    /**
     * Legacy search method – използва се от сервиса (НЕ променяй името)
     */
    @Query("SELECT p FROM ProductEntity p WHERE p.active = true AND (LOWER(p.name) " +
            "LIKE LOWER(CONCAT('%', ?1, '%')) OR LOWER(p.sku) LIKE LOWER(CONCAT('%', ?1, '%')))")
    List<ProductEntity> searchActiveProducts(String query);

    /**
     * Продукти с валидна цена (полезно за справки)
     */
    @Query("SELECT p FROM ProductEntity p WHERE p.active = true AND p.price > 0 ORDER BY p.name")
    List<ProductEntity> findActiveProductsWithValidPrice();

    /**
     * Намира продукт с pessimistic lock за безопасни конкурентни резервации
     * Pessimistic lock гарантира че никой друг не може да променя продукта
     * докато нашата транзакция не приключи
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM ProductEntity p WHERE p.id = :id")
    Optional<ProductEntity> findByIdWithLock(@Param("id") Long id);

    /**
     * Batch заявка за намиране на продукти по списък от SKU кодове.
     * Оптимизирана с индекс и batch fetching за светкавична скорост.
     */
    @Query("SELECT p FROM ProductEntity p WHERE p.sku IN :skus")
    List<ProductEntity> findBySkuIn(@Param("skus") List<String> skus);
}
