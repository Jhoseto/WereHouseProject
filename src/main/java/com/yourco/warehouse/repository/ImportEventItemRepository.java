package com.yourco.warehouse.repository;

import com.yourco.warehouse.entity.ImportEventItemEntity;
import com.yourco.warehouse.entity.enums.ImportActionTypeEnum;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository за импорт евент items.
 * Оптимизиран за детайлни заявки на импорт данни.
 */
@Repository
public interface ImportEventItemRepository extends JpaRepository<ImportEventItemEntity, Long> {

    /**
     * Взима всички items за даден импорт евент.
     * Използва индекса idx_import_event за светкавична заявка.
     * Това е основната заявка за показване на детайли за импорт.
     */
    List<ImportEventItemEntity> findByImportEventId(Long importEventId);

    /**
     * Взима всички импорти в които участва даден продукт сортирани по дата.
     * Използва индекса idx_product за бърза заявка.
     * Полезно за показване на импорт историята на конкретен продукт.
     */
    @Query("SELECT iei FROM ImportEventItemEntity iei " +
            "JOIN FETCH iei.importEvent ie " +
            "WHERE iei.product.id = :productId " +
            "ORDER BY ie.uploadedAt DESC")
    List<ImportEventItemEntity> findByProductIdWithImportEventOrderByDateDesc(@Param("productId") Long productId);

    /**
     * Взима импорт items по тип действие за даден импорт.
     * Използва композитен search по двата индекса.
     */
    List<ImportEventItemEntity> findByImportEventIdAndActionType(Long importEventId, ImportActionTypeEnum actionType);

    /**
     * Брои новосъздадените артикули в импорт.
     * COUNT заявката е оптимизирана от базата данни и използва индекса.
     */
    @Query("SELECT COUNT(iei) FROM ImportEventItemEntity iei " +
            "WHERE iei.importEvent.id = :importEventId AND iei.actionType = 'CREATED'")
    Long countNewItemsInImport(@Param("importEventId") Long importEventId);

    /**
     * Batch заявка за извличане на items за множество импорти наведнъж.
     * Оптимизация за показване на агрегирана информация.
     */
    @Query("SELECT iei FROM ImportEventItemEntity iei " +
            "WHERE iei.importEvent.id IN :importEventIds")
    List<ImportEventItemEntity> findByImportEventIds(@Param("importEventIds") List<Long> importEventIds);
}