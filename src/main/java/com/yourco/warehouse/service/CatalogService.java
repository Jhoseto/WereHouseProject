
package com.yourco.warehouse.service;

import com.yourco.warehouse.domain.entity.Product;
import com.yourco.warehouse.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CatalogService {
    private final ProductRepository productRepository;

    public CatalogService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public List<Product> searchActive(String q){
        if(q == null || q.isBlank()){
            return productRepository.findByActiveTrue();
        }
        return productRepository.findByActiveTrueAndNameContainingIgnoreCase(q.trim());
    }
}
