package com.yourco.warehouse.service;

import com.yourco.warehouse.entity.*;
import com.yourco.warehouse.entity.enums.OrderStatus;
import com.yourco.warehouse.repository.OrderRepository;
import com.yourco.warehouse.repository.ProductRepository;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class OrderService {
    private static final Logger logger = LoggerFactory.getLogger(OrderService.class);

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final AuditService auditService;

    public OrderService(OrderRepository orderRepository, ProductRepository productRepository, AuditService auditService) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.auditService = auditService;
    }

    public List<Order> listForClient(Client client){
        return orderRepository.findByClientOrderBySubmittedAtDesc(client);
    }

    public Page<Order> listForClientPaginated(Client client, Pageable pageable){
        return orderRepository.findByClientOrderBySubmittedAtDesc(client, pageable);
    }

    public List<Order> listByStatus(OrderStatus status){
        return orderRepository.findByStatusOrderBySubmittedAtDesc(status);
    }

    public Page<Order> listByStatusPaginated(OrderStatus status, Pageable pageable){
        return orderRepository.findByStatusOrderBySubmittedAtDesc(status, pageable);
    }

    public Page<Order> listAllPaginated(Pageable pageable) {
        return orderRepository.findAllByOrderBySubmittedAtDesc(pageable);
    }

    @Transactional
    public Order submitCart(Client client, Map<String, CartItem> cartItems, String notes, String userAgent, String ipAddress){
        if(cartItems == null || cartItems.isEmpty()){
            throw new IllegalArgumentException("Кошницата е празна.");
        }

        logger.info("Създаване на нова заявка за клиент: {}", client.getName());

        Order o = new Order();
        o.setClient(client);
        o.setStatus(OrderStatus.SUBMITTED);
        o.setSubmittedAt(LocalDateTime.now());
        o.setNotes(notes);

        BigDecimal totalNet = BigDecimal.ZERO;
        BigDecimal totalVat = BigDecimal.ZERO;

        for (CartItem ci : cartItems.values()){
            Product p = productRepository.findBySku(ci.getSku())
                    .orElseThrow(() -> new IllegalArgumentException("Несъществуващ SKU: " + ci.getSku()));

            if (!p.isActive()) {
                throw new IllegalArgumentException("Продуктът не е активен: " + ci.getSku());
            }

            if (ci.getQty().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Невалидно количество за продукт: " + ci.getSku());
            }

            OrderItem oi = new OrderItem();
            oi.setProduct(p);
            oi.setQty(ci.getQty());
            oi.setUnitPrice(p.getPrice());
            oi.setNote(ci.getNote());
            o.addItem(oi);

            // Правилно изчисление на ДДС за всеки продукт
            BigDecimal itemNet = p.getPrice().multiply(ci.getQty());
            BigDecimal vatRate = new BigDecimal(p.getVatRate()).divide(new BigDecimal("100"));
            BigDecimal itemVat = itemNet.multiply(vatRate);

            totalNet = totalNet.add(itemNet);
            totalVat = totalVat.add(itemVat);
        }

        // Закръгляване до 2 знака
        totalNet = totalNet.setScale(2, RoundingMode.HALF_UP);
        totalVat = totalVat.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalGross = totalNet.add(totalVat).setScale(2, RoundingMode.HALF_UP);

        o.setTotalNet(totalNet);
        o.setTotalVat(totalVat);
        o.setTotalGross(totalGross);

        Order saved = orderRepository.save(o);

        // Audit log
        auditService.logOrderSubmitted(saved, userAgent, ipAddress);

        logger.info("Създадена заявка #{} за клиент: {} на стойност: {} лв",
                saved.getId(), client.getName(), totalGross);

        return saved;
    }

    @Transactional
    public Order confirmOrder(Order o, String confirmedBy, String userAgent, String ipAddress){
        if (o.getStatus() != OrderStatus.SUBMITTED) {
            throw new IllegalStateException("Може да се потвърждават само заявки със статус SUBMITTED");
        }

        o.setStatus(OrderStatus.CONFIRMED);
        o.setConfirmedAt(LocalDateTime.now());
        Order saved = orderRepository.save(o);

        // Audit log
        auditService.logOrderConfirmed(saved, confirmedBy, userAgent, ipAddress);

        logger.info("Потвърдена заявка #{} от {}", saved.getId(), confirmedBy);

        return saved;
    }

    @Transactional
    public Order cancelOrder(Order o, String reason, String cancelledBy, String userAgent, String ipAddress) {
        if (o.getStatus() == OrderStatus.SHIPPED || o.getStatus() == OrderStatus.CANCELLED) {
            throw new IllegalStateException("Не може да се отмени заявка със статус " + o.getStatus());
        }

        o.setStatus(OrderStatus.CANCELLED);
        o.setNotes(o.getNotes() + "\n[ОТМЕНЕНА] " + reason);
        Order saved = orderRepository.save(o);

        // Audit log
        auditService.logOrderCancelled(saved, reason, cancelledBy, userAgent, ipAddress);

        logger.info("Отменена заявка #{} от {} с причина: {}", saved.getId(), cancelledBy, reason);

        return saved;
    }

    public boolean canUserAccessOrder(Order order, User user) {
        if (user.getRole().name().equals("ADMIN")) {
            return true;
        }

        if (user.getRole().name().equals("CLIENT") && user.getClient() != null) {
            return order.getClient().getId().equals(user.getClient().getId());
        }

        return false;
    }

    // DTO за елемент в кошница (service-level)
    public static class CartItem {
        private final String sku;
        private final BigDecimal qty;
        private final String note;

        public CartItem(String sku, BigDecimal qty, String note) {
            if (sku == null || sku.trim().isEmpty()) {
                throw new IllegalArgumentException("SKU не може да бъде празно");
            }
            if (qty == null || qty.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Количеството трябва да бъде положително число");
            }

            this.sku = sku.trim();
            this.qty = qty;
            this.note = note != null ? note.trim() : "";
        }

        public String getSku() { return sku; }
        public BigDecimal getQty() { return qty; }
        public String getNote() { return note; }
    }
}