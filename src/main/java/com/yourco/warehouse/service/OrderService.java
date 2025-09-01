
package com.yourco.warehouse.service;

import com.yourco.warehouse.domain.entity.*;
import com.yourco.warehouse.domain.enums.OrderStatus;
import com.yourco.warehouse.repository.OrderRepository;
import com.yourco.warehouse.repository.ProductRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class OrderService {
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    public OrderService(OrderRepository orderRepository, ProductRepository productRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
    }

    public List<Order> listForClient(Client client){
        return orderRepository.findByClientOrderBySubmittedAtDesc(client);
    }

    public List<Order> listByStatus(OrderStatus status){ return orderRepository.findByStatusOrderBySubmittedAtDesc(status); }

    @Transactional
    public Order submitCart(Client client, Map<String, CartItem> cartItems, String notes){
        if(cartItems == null || cartItems.isEmpty()){
            throw new IllegalArgumentException("Кошницата е празна.");
        }
        Order o = new Order();
        o.setClient(client);
        o.setStatus(OrderStatus.SUBMITTED);
        o.setSubmittedAt(LocalDateTime.now());
        o.setNotes(notes);

        BigDecimal totalNet = BigDecimal.ZERO;
        for (CartItem ci : cartItems.values()){
            Product p = productRepository.findBySku(ci.getSku())
                    .orElseThrow(() -> new IllegalArgumentException("Несъществуващ SKU: " + ci.getSku()));
            OrderItem oi = new OrderItem();
            oi.setProduct(p);
            oi.setQty(ci.getQty());
            oi.setUnitPrice(p.getPrice());
            oi.setNote(ci.getNote());
            o.addItem(oi);
            totalNet = totalNet.add(p.getPrice().multiply(ci.getQty()));
        }
        o.setTotalNet(totalNet);
        BigDecimal vat = totalNet.multiply(new BigDecimal("0.20")); // 20% ДДС за MVP
        o.setTotalVat(vat);
        o.setTotalGross(totalNet.add(vat));
        return orderRepository.save(o);
    }

    @Transactional
    public Order confirmOrder(Order o){
        o.setStatus(OrderStatus.CONFIRMED);
        o.setConfirmedAt(LocalDateTime.now());
        return orderRepository.save(o);
    }

    // DTO за елемент в кошница (service-level)
    public static class CartItem {
        private final String sku;
        private final BigDecimal qty;
        private final String note;

        public CartItem(String sku, BigDecimal qty, String note) {
            this.sku = sku; this.qty = qty; this.note = note;
        }
        public String getSku() { return sku; }
        public BigDecimal getQty() { return qty; }
        public String getNote() { return note; }
    }
}
