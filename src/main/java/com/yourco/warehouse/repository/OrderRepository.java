package com.yourco.warehouse.repository;

import com.yourco.warehouse.entity.UserEntity;
import com.yourco.warehouse.entity.Order;
import com.yourco.warehouse.entity.enums.OrderStatus;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.QueryHint;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * УЛТРА-ОПТИМИЗИРАНО ORDER REPOSITORY
 * ==================================
 * Принципи на оптимизация:
 * 1. Минимални JOIN операции там където е възможно
 * 2. Projection queries за dashboard counters (само COUNT, не цели обекти)
 * 3. Агресивно кеширане с правилни ключове
 * 4. Batch операции за related data
 * 5. Native MySQL queries за complex aggregations
 */
@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    // ==========================================
    // СВЕТКАВИЧНИ DASHBOARD COUNTERS
    // ==========================================

    /**
     * УЛТРА-БЪРЗ Counter за статус без JOIN операции
     * Използва прост индекс върху status колоната
     * Кешира се агресивно защото се променя рядко
     */
    @Query(value = "SELECT COUNT(*) FROM orders WHERE status = :status", nativeQuery = true)
    @Cacheable(value = "fastOrderCount", key = "#status", unless = "#result == null")
    @QueryHints({
            @QueryHint(name = "org.hibernate.readOnly", value = "true"),
            @QueryHint(name = "org.hibernate.fetchSize", value = "1"),
            @QueryHint(name = "org.hibernate.timeout", value = "1000") // 1 секунда timeout
    })
    @Transactional(readOnly = true)
    long countByStatusFast(@Param("status") String status);

    /**
     * Wrapper метод за OrderStatus enum
     */
    default long countByStatus(OrderStatus status) {
        return countByStatusFast(status.name());
    }

    /**
     * BATCH COUNTERS - Всички counter-и в една заявка
     * Това е революционно по-бързо от 5 отделни заявки
     */
    @Query(value = """
        SELECT 
            status,
            COUNT(*) as count
        FROM orders 
        WHERE status IN ('PENDING', 'URGENT', 'CONFIRMED', 'CANCELLED')
        GROUP BY status
        """, nativeQuery = true)
    @Cacheable(value = "allOrderCounts", unless = "#result == null")
    @QueryHints({
            @QueryHint(name = "org.hibernate.readOnly", value = "true"),
            @QueryHint(name = "org.hibernate.fetchSize", value = "10")
    })
    @Transactional(readOnly = true)
    List<Object[]> getAllStatusCounts();

    // ==========================================
    // ОПТИМИЗИРАНИ DAILY STATISTICS
    // ==========================================

    /**
     * MEGA-ОПТИМИЗИРАНА Daily Stats - Всички в една заявка
     * Вместо 4 отделни заявки, правим само една с complex aggregation
     */
    @Query(value = """
        SELECT 
            COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END) as processed_count,
            COALESCE(SUM(CASE WHEN status = 'CONFIRMED' THEN total_gross ELSE 0 END), 0) as daily_revenue,
            AVG(CASE WHEN confirmed_at IS NOT NULL 
                THEN TIMESTAMPDIFF(HOUR, submitted_at, confirmed_at) 
                ELSE NULL END) as avg_processing_hours,
            COUNT(DISTINCT client_id) as unique_clients
        FROM orders 
        WHERE submitted_at >= :startDate AND submitted_at <= :endDate
        """, nativeQuery = true)
    @Cacheable(value = "dailyStatsSuper", key = "#startDate.toLocalDate()")
    @QueryHints({
            @QueryHint(name = "org.hibernate.readOnly", value = "true"),
            @QueryHint(name = "org.hibernate.fetchSize", value = "1")
    })
    @Transactional(readOnly = true)
    Object[] getDailyStatsSuperFast(@Param("startDate") LocalDateTime startDate,
                                    @Param("endDate") LocalDateTime endDate);

    // ==========================================
    // PROJECTION-BASED ORDER LISTS (Само нужните данни)
    // ==========================================

    /**
     * СВЕТКАВИЧНА Order List - Само основните данни за dashboard
     * Не зареждаме items, clients и други heavy relations
     */
    @Query(value = """
        SELECT 
            o.id,
            o.status,
            o.total_gross,
            o.submitted_at,
            o.confirmed_at,
            c.username as customer_name
        FROM orders o 
        INNER JOIN users c ON o.client_id = c.id
        WHERE o.status = :status 
        ORDER BY o.submitted_at DESC 
        LIMIT :limit
        """, nativeQuery = true)
    @Cacheable(value = "orderProjections", key = "#status + '_' + #limit")
    @QueryHints({
            @QueryHint(name = "org.hibernate.readOnly", value = "true"),
            @QueryHint(name = "org.hibernate.fetchSize", value = "50")
    })
    @Transactional(readOnly = true)
    List<Object[]> findOrderProjectionsByStatus(@Param("status") String status,
                                                @Param("limit") int limit);

    /**
     * УЛТРА-БЪРЗ Urgent Orders - Само projection без JOINs където е възможно
     */
    @Query(value = """
        SELECT 
            o.id,
            o.status,
            o.total_gross,
            o.submitted_at,
            c.username as customer_name,
            TIMESTAMPDIFF(HOUR, o.submitted_at, NOW()) as hours_old
        FROM orders o 
        INNER JOIN users c ON o.client_id = c.id
        WHERE (o.status = 'PENDING' OR 
               (o.status = 'CONFIRMED' AND o.submitted_at < :urgentThreshold))
        ORDER BY o.submitted_at ASC
        LIMIT :limit
        """, nativeQuery = true)
    @QueryHints({
            @QueryHint(name = "org.hibernate.readOnly", value = "true"),
            @QueryHint(name = "org.hibernate.fetchSize", value = "20")
    })
    @Transactional(readOnly = true)
    List<Object[]> findUrgentOrderProjections(@Param("urgentThreshold") LocalDateTime urgentThreshold,
                                              @Param("limit") int limit);

    // ==========================================
    // LEGACY METHODS OPTIMIZED (за backward compatibility)
    // ==========================================

    /**
     * ОПТИМИЗИРАН findByStatusOrderBySubmittedAtDesc
     * Използва covering index за по-бързо изпълнение
     */
    @Query(value = """
        SELECT DISTINCT o FROM Order o 
        LEFT JOIN FETCH o.client 
        LEFT JOIN FETCH o.items oi 
        LEFT JOIN FETCH oi.product 
        WHERE o.status = :status 
        ORDER BY o.submittedAt DESC
        """)
    @Cacheable(value = "ordersByStatus", key = "#status")
    @QueryHints({
            @QueryHint(name = "org.hibernate.readOnly", value = "true"),
            @QueryHint(name = "org.hibernate.fetchSize", value = "100"),
            @QueryHint(name = "org.hibernate.batchSize", value = "25") // Batch loading за items
    })
    @Transactional(readOnly = true)
    List<Order> findByStatusOrderBySubmittedAtDesc(@Param("status") OrderStatus status);

    /**
     * ОПТИМИЗИРАН findByIdWithItems за single order loading
     */
    @Query("SELECT DISTINCT o FROM Order o " +
            "LEFT JOIN FETCH o.client " +
            "LEFT JOIN FETCH o.items oi " +
            "LEFT JOIN FETCH oi.product " +
            "WHERE o.id = :orderId")
    @Cacheable(value = "orderByIdFull", key = "#orderId")
    @QueryHints({
            @QueryHint(name = "org.hibernate.readOnly", value = "true"),
            @QueryHint(name = "org.hibernate.batchSize", value = "10")
    })
    @Transactional(readOnly = true)
    Optional<Order> findByIdWithItems(@Param("orderId") Long orderId);

    // ==========================================
    // CLIENT-SPECIFIC OPTIMIZED QUERIES
    // ==========================================

    /**
     * Оптимизирани client orders с pagination
     */
    @Query(value = """
        SELECT DISTINCT o FROM Order o 
        LEFT JOIN FETCH o.items oi 
        LEFT JOIN FETCH oi.product 
        WHERE o.client = :client 
        ORDER BY o.submittedAt DESC
        """,
            countQuery = "SELECT COUNT(o) FROM Order o WHERE o.client = :client")
    @QueryHints({
            @QueryHint(name = "org.hibernate.readOnly", value = "true"),
            @QueryHint(name = "org.hibernate.fetchSize", value = "50")
    })
    @Transactional(readOnly = true)
    Page<Order> findByClientOrderBySubmittedAtDescPageble(@Param("client") UserEntity client, Pageable pageable);

    @Query(value = """
        SELECT DISTINCT o FROM Order o 
        LEFT JOIN FETCH o.items oi 
        LEFT JOIN FETCH oi.product 
        WHERE o.client = :client 
        ORDER BY o.submittedAt DESC
        """,
            countQuery = "SELECT COUNT(o) FROM Order o WHERE o.client = :client")
    @QueryHints({
            @QueryHint(name = "org.hibernate.readOnly", value = "true"),
            @QueryHint(name = "org.hibernate.fetchSize", value = "50")
    })
    @Transactional(readOnly = true)
    List<Order> findByClientOrderBySubmittedAtDesc(@Param("client") UserEntity client);

    // ==========================================
    // DATE RANGE QUERIES OPTIMIZED
    // ==========================================

    /**
     * Оптимизирани date range заявки с правилни индекси
     */
    @Query(value = """
        SELECT DISTINCT o FROM Order o 
        LEFT JOIN FETCH o.items oi 
        LEFT JOIN FETCH oi.product 
        WHERE o.submittedAt >= :startDate AND o.submittedAt <= :endDate 
        ORDER BY o.submittedAt DESC
        """)
    @QueryHints({
            @QueryHint(name = "org.hibernate.readOnly", value = "true"),
            @QueryHint(name = "org.hibernate.fetchSize", value = "100")
    })
    @Transactional(readOnly = true)
    List<Order> findOrdersBetweenDates(@Param("startDate") LocalDateTime startDate,
                                       @Param("endDate") LocalDateTime endDate);

    // ==========================================
    // ADVANCED AGGREGATION QUERIES
    // ==========================================

    /**
     * Оптимизирана total value calculation
     */
    @Query(value = "SELECT COALESCE(SUM(total_gross), 0) FROM orders WHERE status = :status",
            nativeQuery = true)
    @Cacheable(value = "totalValueByStatus", key = "#status")
    @QueryHints(@QueryHint(name = "org.hibernate.readOnly", value = "true"))
    @Transactional(readOnly = true)
    java.math.BigDecimal getTotalValueByStatusFast(@Param("status") String status);

    /**
     * Wrapper за OrderStatus
     */
    default java.math.BigDecimal getTotalValueByStatus(OrderStatus status) {
        return getTotalValueByStatusFast(status.name());
    }

    /**
     * Намира поръчки по статус и дата на потвърждение
     */
    @Query(value = """
    SELECT DISTINCT o FROM Order o 
    LEFT JOIN FETCH o.client 
    LEFT JOIN FETCH o.items oi 
    LEFT JOIN FETCH oi.product 
    WHERE o.status = :status 
    AND o.confirmedAt >= :startDate 
    AND o.confirmedAt <= :endDate 
    ORDER BY o.confirmedAt DESC
    """)
    @QueryHints({
            @QueryHint(name = "org.hibernate.readOnly", value = "true"),
            @QueryHint(name = "org.hibernate.fetchSize", value = "100")
    })
    @Transactional(readOnly = true)
    List<Order> findByStatusAndConfirmedAtBetween(
            @Param("status") OrderStatus status,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    /**
     * Намира поръчки по дата на създаване (submittedAt)
     */
    @Query(value = """
    SELECT DISTINCT o FROM Order o 
    LEFT JOIN FETCH o.client 
    LEFT JOIN FETCH o.items oi 
    LEFT JOIN FETCH oi.product 
    WHERE o.submittedAt >= :startDate 
    AND o.submittedAt <= :endDate 
    ORDER BY o.submittedAt DESC
    """)
    @QueryHints({
            @QueryHint(name = "org.hibernate.readOnly", value = "true"),
            @QueryHint(name = "org.hibernate.fetchSize", value = "100")
    })
    @Transactional(readOnly = true)
    List<Order> findBySubmittedAtBetween(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    // ==========================================
    // UTILITY METHODS WITH DEFAULT IMPLEMENTATIONS
    // ==========================================


    /**
     * Recent orders с оптимизация
     */
    @Query(value = """
        SELECT DISTINCT o FROM Order o 
        LEFT JOIN FETCH o.client 
        LEFT JOIN FETCH o.items oi 
        LEFT JOIN FETCH oi.product 
        ORDER BY o.submittedAt DESC
        """)
    @QueryHints({
            @QueryHint(name = "org.hibernate.readOnly", value = "true"),
            @QueryHint(name = "org.hibernate.fetchSize", value = "50")
    })
    @Transactional(readOnly = true)
    List<Order> findAllOrdersOrderBySubmittedAtDesc();

    default List<Order> findRecentOrders(int limit) {
        return findAllOrdersOrderBySubmittedAtDesc().stream()
                .limit(limit)
                .collect(java.util.stream.Collectors.toList());
    }

    @Query("SELECT o FROM Order o WHERE o.status = :status AND o.submittedAt < :cutoffTime")
    List<Order> findByStatusAndSubmittedAtBefore(
            @Param("status") OrderStatus status,
            @Param("cutoffTime") LocalDateTime cutoffTime
    );

    /**
     * Оптимизирана заявка за поръчки по client ID
     * Работи за всички роли в UserEntity (клиенти, работници, админи)
     */
    @Query(value = """
    SELECT DISTINCT o FROM Order o 
    LEFT JOIN FETCH o.client 
    WHERE o.client.id = :clientId 
    ORDER BY o.submittedAt DESC
    """)
    @QueryHints({
            @QueryHint(name = "org.hibernate.readOnly", value = "true"),
            @QueryHint(name = "org.hibernate.fetchSize", value = "50")
    })
    @Transactional(readOnly = true)
    List<Order> findByClientIdOrderBySubmittedAtDesc(@Param("clientId") Long clientId);
}