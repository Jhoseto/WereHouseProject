
package com.yourco.warehouse.repository;

import com.yourco.warehouse.domain.entity.Client;
import com.yourco.warehouse.domain.entity.Order;
import com.yourco.warehouse.domain.enums.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByClientOrderBySubmittedAtDesc(Client client);
    List<Order> findByStatusOrderBySubmittedAtDesc(OrderStatus status);
}
