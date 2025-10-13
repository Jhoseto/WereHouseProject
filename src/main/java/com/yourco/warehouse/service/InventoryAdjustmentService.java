package com.yourco.warehouse.service;

import com.yourco.warehouse.dto.InventoryAdjustmentDTO;
import com.yourco.warehouse.dto.ProductAdminDTO;
import com.yourco.warehouse.dto.importSystem.ImportEventDTO;

import java.util.List;
import java.util.Map;

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

    /**
     * Получава смесена история от adjustments и import events сортирана по дата
     * Използва се за History таба в inventory management
     */
    Map<String, Object> getMixedHistory();

    /**
     * Получава детайли за конкретен import event с всички артикули
     * Използва се за детайлната страница на импорт
     * @param importEventId ID на импорт събитието
     * @return ImportEventDTO с всички данни и изчислени статистики
     */
    ImportEventDTO getImportEventDetails(Long importEventId);

    /**
     * Получава списък с всички import events за навигационния dropdown
     * Връща компактна информация без артикулите за бърза навигация
     */
    List<ImportEventDTO> getImportEventsForNavigation();
}