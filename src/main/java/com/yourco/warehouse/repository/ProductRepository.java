package com.yourco.warehouse.repository;

import com.yourco.warehouse.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findBySku(String sku);
    Optional<Product> findBySkuAndActiveTrue(String sku);

    List<Product> findByActiveTrueAndNameContainingIgnoreCase(String query);
    Page<Product> findByActiveTrueAndNameContainingIgnoreCaseOrderByName(String query, Pageable pageable);

    List<Product> findByActiveTrue();
    Page<Product> findByActiveTrueOrderByName(Pageable pageable);

    long countByActiveTrue();

    @Query("SELECT COUNT(p) FROM Product p WHERE p.active = true")
    long countByActiveProducts();

    @Query("SELECT p FROM Product p WHERE p.active = true AND (p.name LIKE %?1% OR p.sku LIKE %?1%)")
    List<Product> searchActiveProducts(String query);

    @Query("SELECT p FROM Product p WHERE p.active = true AND p.price > 0 ORDER BY p.name")
    List<Product> findActiveProductsWithValidPrice();

    @Query("SELECT DISTINCT p.unit FROM Product p WHERE p.active = true ORDER BY p.unit")
    List<String> findAllActiveUnits();
}