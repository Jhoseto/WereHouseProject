package com.yourco.warehouse.repository;

import com.yourco.warehouse.entity.ProductEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<ProductEntity, Long> {
    Optional<ProductEntity> findBySku(String sku);
    Optional<ProductEntity> findBySkuAndActiveTrue(String sku);

    List<ProductEntity> findByActiveTrueAndNameContainingIgnoreCase(String query);
    Page<ProductEntity> findByActiveTrueAndNameContainingIgnoreCaseOrderByName(String query, Pageable pageable);

    List<ProductEntity> findByActiveTrue();
    Page<ProductEntity> findByActiveTrueOrderByName(Pageable pageable);

    long countByActiveTrue();

    @Query("SELECT COUNT(p) FROM ProductEntity p WHERE p.active = true")
    long countByActiveProducts();

    @Query("SELECT p FROM ProductEntity p WHERE p.active = true AND (p.name LIKE %?1% OR p.sku LIKE %?1%)")
    List<ProductEntity> searchActiveProducts(String query);

    @Query("SELECT p FROM ProductEntity p WHERE p.active = true AND p.price > 0 ORDER BY p.name")
    List<ProductEntity> findActiveProductsWithValidPrice();

    @Query("SELECT DISTINCT p.unit FROM ProductEntity p WHERE p.active = true ORDER BY p.unit")
    List<String> findAllActiveUnits();
}