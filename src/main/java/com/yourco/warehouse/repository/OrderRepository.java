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
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.QueryHint;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    @Query("SELECT DISTINCT o FROM Order o LEFT JOIN FETCH o.items oi LEFT JOIN FETCH oi.product WHERE o.client = :client ORDER BY o.submittedAt DESC")
    @QueryHints({
            @QueryHint(name = "org.hibernate.cacheable", value = "true"),
            @QueryHint(name = "org.hibernate.readOnly", value = "true")
    })
    @Transactional(readOnly = true)
    List<Order> findByClientOrderBySubmittedAtDesc(@Param("client") UserEntity client);

    @Query(value = "SELECT DISTINCT o FROM Order o LEFT JOIN FETCH o.items oi LEFT JOIN FETCH oi.product WHERE o.client = :client",
            countQuery = "SELECT COUNT(o) FROM Order o WHERE o.client = :client")
    @QueryHints(@QueryHint(name = "org.hibernate.readOnly", value = "true"))
    @Transactional(readOnly = true)
    Page<Order> findByClientOrderBySubmittedAtDesc(@Param("client") UserEntity client, Pageable pageable);

    @Query("SELECT DISTINCT o FROM Order o " +
            "LEFT JOIN FETCH o.client " +
            "LEFT JOIN FETCH o.items oi " +
            "LEFT JOIN FETCH oi.product " +
            "WHERE o.status = :status " +
            "ORDER BY o.submittedAt DESC")
    @Cacheable(value = "ordersByStatus", key = "#status")
    @QueryHints(@QueryHint(name = "org.hibernate.readOnly", value = "true"))
    @Transactional(readOnly = true)
    List<Order> findByStatusOrderBySubmittedAtDesc(@Param("status") OrderStatus status);

    @Query("SELECT DISTINCT o FROM Order o LEFT JOIN FETCH o.items oi LEFT JOIN FETCH oi.product WHERE o.id = :orderId")
    @Cacheable(value = "orderById", key = "#orderId")
    @QueryHints(@QueryHint(name = "org.hibernate.readOnly", value = "true"))
    @Transactional(readOnly = true)
    Optional<Order> findByIdWithItems(@Param("orderId") Long orderId);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.status = :status")
    @Cacheable(value = "orderCount", key = "#status")
    @QueryHints(@QueryHint(name = "org.hibernate.readOnly", value = "true"))
    @Transactional(readOnly = true)
    long countByStatus(@Param("status") OrderStatus status);

    @Query("SELECT DISTINCT o FROM Order o LEFT JOIN FETCH o.items oi LEFT JOIN FETCH oi.product WHERE o.submittedAt >= :startDate AND o.submittedAt <= :endDate ORDER BY o.submittedAt DESC")
    @QueryHints(@QueryHint(name = "org.hibernate.readOnly", value = "true"))
    @Transactional(readOnly = true)
    List<Order> findOrdersBetweenDates(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    @Query("SELECT COALESCE(SUM(o.totalGross), 0) FROM Order o WHERE o.status = :status")
    @Cacheable(value = "orderTotal", key = "#status")
    @QueryHints(@QueryHint(name = "org.hibernate.readOnly", value = "true"))
    @Transactional(readOnly = true)
    java.math.BigDecimal getTotalValueByStatus(@Param("status") OrderStatus status);

    @Query("SELECT DISTINCT o FROM Order o LEFT JOIN FETCH o.items oi LEFT JOIN FETCH oi.product WHERE o.id = :orderId")
    Optional<Order> findByIdWithItemsForUpdate(@Param("orderId") Long orderId);
}