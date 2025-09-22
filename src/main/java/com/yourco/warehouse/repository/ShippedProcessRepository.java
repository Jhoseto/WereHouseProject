package com.yourco.warehouse.repository;

import com.yourco.warehouse.entity.ShippedProcessEntity;
import com.yourco.warehouse.entity.enums.ShippingSignalStatusEnum;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * SHIPPED PROCESS REPOSITORY - БАЛАНСИРАНО
 * =======================================
 * Основните методи + полезни за бъдеще features
 */
@Repository
public interface ShippedProcessRepository extends JpaRepository<ShippedProcessEntity, Long> {

    // ОСНОВНИ ЗАЯВКИ (Spring Data ги прави автоматично)
    Optional<ShippedProcessEntity> findByOrderId(Long orderId);
    boolean existsByOrderId(Long orderId);
    void deleteByOrderId(Long orderId);

    // PERFORMANCE UPDATES - по-бързи от save() на цялото entity
    @Modifying
    @Query("UPDATE ShippedProcessEntity s SET s.shippedItems = :shippedItems WHERE s.id = :sessionId")
    void updateShippedItems(@Param("sessionId") Long sessionId, @Param("shippedItems") Integer shippedItems);

    @Modifying
    @Query("UPDATE ShippedProcessEntity s SET s.lastHeartbeat = :heartbeat WHERE s.id = :sessionId")
    void updateHeartbeat(@Param("sessionId") Long sessionId, @Param("heartbeat") LocalDateTime heartbeat);

    @Modifying
    @Query("UPDATE ShippedProcessEntity s SET s.status = :status WHERE s.id = :sessionId")
    void updateStatus(@Param("sessionId") Long sessionId, @Param("status") ShippingSignalStatusEnum status);

    // BACKGROUND JOBS - за signal lost detection и cleanup
    @Modifying
    @Query("UPDATE ShippedProcessEntity s SET s.status = 'SIGNAL_LOST' WHERE s.status = 'ACTIVE' AND s.lastHeartbeat < :threshold")
    int markLostSignalSessions(@Param("threshold") LocalDateTime threshold);

    @Modifying
    @Query("DELETE FROM ShippedProcessEntity s WHERE s.status = 'SIGNAL_LOST' AND s.lastHeartbeat < :threshold")
    int deleteOldLostSessions(@Param("threshold") LocalDateTime threshold);

    // MONITORING - за dashboard и statistics
    @Query("SELECT s.orderId, s.shippedItems, s.totalItems FROM ShippedProcessEntity s WHERE s.status = 'ACTIVE'")
    List<Object[]> findActiveSessionProgress();

    @Query("SELECT COUNT(s) FROM ShippedProcessEntity s WHERE s.status = 'ACTIVE'")
    long countActiveSessions();
}
