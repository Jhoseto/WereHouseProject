
package com.yourco.warehouse.repository;

import com.yourco.warehouse.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    /**
     * Връща общото резервирано количество от user за даден продукт в PENDING/URGENT поръчки
     */
    @Query("SELECT COALESCE(SUM(oi.qty), 0) FROM OrderItem oi " +
            "WHERE oi.order.client.id = :userId " +
            "AND oi.product.id = :productId " +
            "AND oi.order.status IN ('PENDING', 'URGENT')")
    @Transactional(readOnly = true)
    BigDecimal getReservedQuantityByUser(@Param("userId") Long userId, @Param("productId") Long productId);
}
