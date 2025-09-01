
package com.yourco.warehouse.repository;

import com.yourco.warehouse.domain.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findBySku(String sku);
    List<Product> findByActiveTrueAndNameContainingIgnoreCase(String q);
    List<Product> findByActiveTrue();
}
