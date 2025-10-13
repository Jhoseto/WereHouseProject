package com.yourco.warehouse.repository;


import com.yourco.warehouse.entity.PurchasePriceHistoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * Repository за история на доставни цени.
 * Всички методи използват индексите за максимална скорост.
 */
@Repository
public interface PurchasePriceHistoryRepository extends JpaRepository<PurchasePriceHistoryEntity, Long> {

    /**
     * Взима цялата история на доставни цени за даден продукт, сортирана по дата.
     * Използва композитния индекс idx_product_date за светкавична заявка.
     */
    List<PurchasePriceHistoryEntity> findByProductIdOrderByPurchaseDateDesc(Long productId);

    /**
     * Взима последните N записа за даден продукт.
     * Пак използва композитния индекс и прави LIMIT в SQL заявката.
     * Перфектно за показване на скорошна история без да товарим базата.
     */
    List<PurchasePriceHistoryEntity> findTop5ByProductIdOrderByPurchaseDateDesc(Long productId);

    /**
     * Взима последната доставна цена за продукт.
     * Това е критична заявка защото я използваме често за сравнение.
     * Индексът прави тази заявка моментална дори за продукти с хиляди история записи.
     */
    PurchasePriceHistoryEntity findFirstByProductIdOrderByPurchaseDateDesc(Long productId);

    /**
     * Custom JPQL query за batch заявка на последните цени за множество продукти.
     * импортираме много артикули и искаме да видим
     * последните им цени с една заявка вместо N отделни заявки.
     * Използва IN clause което е много по-бързо от цикъл с отделни заявки.
     */
    @Query("SELECT pph FROM PurchasePriceHistoryEntity pph WHERE pph.product.id IN :productIds " +
            "AND pph.purchaseDate = (SELECT MAX(pph2.purchaseDate) FROM PurchasePriceHistoryEntity pph2 " +
            "WHERE pph2.product.id = pph.product.id)")
    List<PurchasePriceHistoryEntity> findLatestPricesForProducts(@Param("productIds") List<Long> productIds);

    /**
     * Взима всички price history записи от конкретен импорт.
     * Използва индекса idx_import_event за бърза заявка.
     */
    List<PurchasePriceHistoryEntity> findByImportEventId(Long importEventId);

    /**
     * Намира price history за продукт след определена дата
     */
    @Query("SELECT ph FROM PurchasePriceHistoryEntity ph WHERE ph.product.id = :productId AND ph.purchaseDate >= :startDate ORDER BY ph.purchaseDate DESC")
    List<PurchasePriceHistoryEntity> findByProductIdAndDateAfter(@Param("productId") Long productId, @Param("startDate") LocalDate startDate);

    /**
     * Намира всички уникални доставчици
     */
    @Query("SELECT DISTINCT ph.supplierName FROM PurchasePriceHistoryEntity ph WHERE ph.supplierName IS NOT NULL ORDER BY ph.supplierName")
    List<String> findDistinctSuppliers();
}