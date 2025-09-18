package com.yourco.warehouse.service.impl;

import com.yourco.warehouse.repository.ProductRepository;
import com.yourco.warehouse.service.ProductService;
import org.springframework.stereotype.Service;


@Service
public class ProductServiceImpl implements ProductService {


    private final ProductRepository productRepository;

    public ProductServiceImpl(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Override
    public long getActiveProductsCount() {
        return productRepository.findAll().size();
    }
}
