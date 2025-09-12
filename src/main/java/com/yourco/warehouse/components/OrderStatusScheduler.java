package com.yourco.warehouse.components;

import com.yourco.warehouse.entity.Order;
import com.yourco.warehouse.entity.enums.OrderStatus;
import com.yourco.warehouse.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Component
public class OrderStatusScheduler {


    private final OrderRepository orderRepository;

    @Autowired
    public OrderStatusScheduler(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    // Изпълнява се всеки час
    @Scheduled(fixedRate = 3600000) // 1 час = 3600000 милисекунди
    public void promotePendingToUrgent() {
        LocalDateTime twelveHoursAgo = LocalDateTime.now().minusHours(12);

        List<Order> pendingOrders = orderRepository
                .findByStatusAndSubmittedAtBefore(OrderStatus.PENDING, twelveHoursAgo);

        for (Order order : pendingOrders) {
            order.setStatus(OrderStatus.URGENT);
            orderRepository.save(order);
            System.out.println("Поръчка "+order.getId()+" е станала URGENT поради изтекло време "+ order.getId());
        }
    }
}
