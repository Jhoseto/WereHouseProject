package com.yourco.warehouse.repository;

import com.yourco.warehouse.entity.InventoryAdjustmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface InventoryAdjustmentRepository extends JpaRepository<InventoryAdjustmentEntity, Long> {

    /**
     * Намери всички корекции за конкретен продукт, сортирани по дата (най-нови първи)
     */
    List<InventoryAdjustmentEntity> findByProductIdOrderByPerformedAtDesc(Long productId);

    /**
     * Намери последните N корекции за всички продукти
     */
    @Query("SELECT a FROM InventoryAdjustmentEntity a ORDER BY a.performedAt DESC")
    List<InventoryAdjustmentEntity> findRecentAdjustments(org.springframework.data.domain.Pageable pageable);

    /**
     * Намери корекции в определен период
     */
    @Query("SELECT a FROM InventoryAdjustmentEntity a WHERE a.performedAt BETWEEN :startDate AND :endDate ORDER BY a.performedAt DESC")
    List<InventoryAdjustmentEntity> findByDateRange(@Param("startDate") LocalDateTime startDate,
                                              @Param("endDate") LocalDateTime endDate);

    /**
     * Намери корекции направени от конкретен потребител
     */
    List<InventoryAdjustmentEntity> findByPerformedByOrderByPerformedAtDesc(String performedBy);
}