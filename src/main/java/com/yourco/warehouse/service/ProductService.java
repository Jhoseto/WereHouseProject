package com.yourco.warehouse.service;

import com.yourco.warehouse.dto.ProductAdminDTO;
import com.yourco.warehouse.dto.ProductStatsDTO;

import java.util.List;

public interface ProductService {

    long getActiveProductsCount();


    /**
     * Получава всички продукти (активни и неактивни) с опционални филтри
     */
    List<ProductAdminDTO> getAllProducts(String search, String category, Boolean active);

    /**
     * Получава продукт по ID
     */
    ProductAdminDTO getProductById(Long id);

    /**
     * Създава нов продукт
     */
    ProductAdminDTO createProduct(ProductAdminDTO dto);

    /**
     * Обновява съществуващ продукт
     */
    ProductAdminDTO updateProduct(Long id, ProductAdminDTO dto);

    /**
     * Деактивира продукт (soft delete)
     */
    void deactivateProduct(Long id);

    /**
     * Активира продукт
     */
    void activateProduct(Long id);

    /**
     * Получава статистики за inventory
     */
    ProductStatsDTO getProductStats();

    /**
     * Получава всички категории (за dropdown)
     */
    List<String> getAllCategories();

    /**
     * Получава всички мерни единици (за dropdown)
     */
    List<String> getAllUnits();

    /**
     * Коригира наличността на продукт
     */
    ProductAdminDTO adjustInventory(Long productId, Integer quantity, String type);
}
