package com.yourco.warehouse.service;

import com.yourco.warehouse.dto.InventoryAdjustmentDTO;
import com.yourco.warehouse.dto.ProductAdminDTO;
import java.util.List;

public interface InventoryAdjustmentService {

    /**
     * Създава нова inventory корекция и обновява количествата на продукта
     * @param dto данните за корекцията
     * @param username потребителското име на който прави корекцията
     * @return обновения продукт след корекцията
     */
    ProductAdminDTO createAdjustment(InventoryAdjustmentDTO dto, String username);

    /**
     * Получава историята на корекциите за конкретен продукт
     */
    List<InventoryAdjustmentDTO> getAdjustmentHistory(Long productId);

    /**
     * Получава последните N корекции за всички продукти
     */
    List<InventoryAdjustmentDTO> getRecentAdjustments(int limit);

    /**
     * Получава всички корекции (за reports таба)
     */
    List<InventoryAdjustmentDTO> getAllAdjustments();
}