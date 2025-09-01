package com.yourco.warehouse.repository;

import com.yourco.warehouse.entity.Client;
import com.yourco.warehouse.entity.Order;
import com.yourco.warehouse.entity.enums.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByClientOrderBySubmittedAtDesc(Client client);
    Page<Order> findByClientOrderBySubmittedAtDesc(Client client, Pageable pageable);

    List<Order> findByStatusOrderBySubmittedAtDesc(OrderStatus status);
    Page<Order> findByStatusOrderBySubmittedAtDesc(OrderStatus status, Pageable pageable);

    Page<Order> findAllByOrderBySubmittedAtDesc(Pageable pageable);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.status = ?1")
    long countByStatus(OrderStatus status);

    @Query("SELECT o FROM Order o WHERE o.submittedAt >= ?1 AND o.submittedAt <= ?2 ORDER BY o.submittedAt DESC")
    List<Order> findOrdersBetweenDates(LocalDateTime startDate, LocalDateTime endDate);

    @Query("SELECT SUM(o.totalGross) FROM Order o WHERE o.status = ?1")
    java.math.BigDecimal getTotalValueByStatus(OrderStatus status);
}