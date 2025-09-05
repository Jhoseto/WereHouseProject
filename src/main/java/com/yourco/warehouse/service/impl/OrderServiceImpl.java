package com.yourco.warehouse.service.impl;

import com.yourco.warehouse.entity.*;
import com.yourco.warehouse.entity.enums.OrderStatus;
import com.yourco.warehouse.repository.OrderRepository;
import com.yourco.warehouse.repository.OrderItemRepository;
import com.yourco.warehouse.repository.ProductRepository;
import com.yourco.warehouse.repository.UserRepository;
import com.yourco.warehouse.service.CartService;
import com.yourco.warehouse.service.OrderService;
import com.yourco.warehouse.dto.CartItemDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class OrderServiceImpl implements OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderServiceImpl.class);

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final CartService cartService;

    @Autowired
    public OrderServiceImpl(OrderRepository orderRepository,
                            OrderItemRepository orderItemRepository,
                            ProductRepository productRepository,
                            UserRepository userRepository,
                            CartService cartService) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.cartService = cartService;
    }

    @Override
    public Order createOrderFromCart(Long userId, String notes) {
        // 1. Намери потребителя
        UserEntity client = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Потребителят не съществува"));

        // 2. Вземи артикулите от количката
        List<CartItemDTO> cartItems = cartService.getCartItems(userId);
        if (cartItems.isEmpty()) {
            throw new IllegalArgumentException("Количката е празна");
        }

        // 3. Валидирай наличностите
        if (!cartService.validateCartStock(userId)) {
            throw new IllegalArgumentException("Някои артикули няма достатъчно наличност");
        }

        // 4. Резервирай количествата
        if (!cartService.reserveCartItems(userId)) {
            throw new IllegalStateException("Грешка при резервиране на количествата");
        }

        try {
            // 5. Създай поръчката
            Order order = new Order();
            order.setClient(client);
            order.setStatus(OrderStatus.SUBMITTED);
            order.setNotes(notes != null ? notes.trim() : "");
            order.setSubmittedAt(LocalDateTime.now());

            // 6. Добави артикулите
            for (CartItemDTO cartItem : cartItems) {
                ProductEntity product = productRepository.findById(cartItem.getProductId())
                        .orElseThrow(() -> new IllegalStateException("Продукт не е намерен: " + cartItem.getProductId()));

                OrderItem orderItem = new OrderItem();
                orderItem.setProduct(product);
                orderItem.setQty(BigDecimal.valueOf(cartItem.getQuantity()));
                orderItem.setUnitPrice(cartItem.getPricePerUnit());
                order.addItem(orderItem);
            }

            // 7. Изчисли общите суми
            order = recalculateOrderTotals(order);

            // 8. Запази поръчката
            Order savedOrder = orderRepository.save(order);

            // 9. Изчисти количката
            cartService.clearCart(userId);

            log.info("Създадена поръчка #{} за клиент {} с {} артикула",
                    savedOrder.getId(), client.getUsername(), cartItems.size());

            return savedOrder;

        } catch (Exception e) {
            // При грешка освободи резервациите
            try {
                cartService.releaseCartReservations(userId);
            } catch (Exception releaseError) {
                log.error("Грешка при освобождаване на резервации: {}", releaseError.getMessage());
            }
            throw e;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Order> getOrderByIdForClient(Long orderId, Long clientId) {
        Optional<Order> orderOpt = orderRepository.findById(orderId)
                .filter(order -> order.getClient().getId().equals(clientId));

        // Eager load items колекцията ако поръчката съществува
        if (orderOpt.isPresent() && orderOpt.get().getItems() != null) {
            orderOpt.get().getItems().size(); // Принуждава зареждането
        }

        return orderOpt;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Order> getOrdersForClient(Long clientId) {
        UserEntity client = userRepository.findById(clientId)
                .orElseThrow(() -> new IllegalArgumentException("Клиентът не съществува"));

        List<Order> orders = orderRepository.findByClientOrderBySubmittedAtDesc(client);

        // Eager load всички items колекции докато сесията е активна
        for (Order order : orders) {
            if (order.getItems() != null) {
                order.getItems().size(); // Това принуждава Hibernate да зареди колекцията
            }
        }

        return orders;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<Order> getOrdersForClient(Long clientId, Pageable pageable) {
        UserEntity client = userRepository.findById(clientId)
                .orElseThrow(() -> new IllegalArgumentException("Клиентът не съществува"));
        return orderRepository.findByClientOrderBySubmittedAtDesc(client, pageable);
    }

    @Override
    public boolean updateOrderItemQuantity(Long orderId, Long productId, Integer newQuantity, Long clientId) {
        // 1. Намери поръчката
        Order order = getOrderByIdForClient(orderId, clientId)
                .orElseThrow(() -> new IllegalArgumentException("Поръчката не е намерена"));

        // 2. Провери дали може да се редактира
        if (!canEditOrder(order)) {
            throw new IllegalStateException("Поръчката не може да се редактира");
        }

        // 3. Намери артикула в поръчката
        OrderItem orderItem = order.getItems().stream()
                .filter(item -> item.getProduct().getId().equals(productId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Артикулът не е намерен в поръчката"));

        // 4. Валидирай новото количество
        if (newQuantity <= 0) {
            throw new IllegalArgumentException("Количеството трябва да бъде положително");
        }

        ProductEntity product = orderItem.getProduct();
        int currentReserved = orderItem.getQty().intValue();
        int difference = newQuantity - currentReserved;

        // 5. Ако увеличаваме, провери наличност
        if (difference > 0) {
            if (!product.hasAvailableQuantity(difference)) {
                throw new IllegalArgumentException("Няма достатъчно наличност за увеличение с " + difference);
            }
            // Резервирай допълнителното количество
            product.reserveQuantity(difference);
        }
        // 6. Ако намаляваме, освободи излишното
        else if (difference < 0) {
            product.releaseReservation(Math.abs(difference));
        }

        // 7. Обнови артикула
        orderItem.setQty(BigDecimal.valueOf(newQuantity));

        // 8. Запази промените
        productRepository.save(product);
        order = recalculateOrderTotals(order);
        orderRepository.save(order);

        log.info("Обновено количество в поръчка #{}: {} -> {}",
                orderId, currentReserved, newQuantity);

        return true;
    }

    @Override
    public boolean removeOrderItem(Long orderId, Long productId, Long clientId) {
        // 1. Намери поръчката
        Order order = getOrderByIdForClient(orderId, clientId)
                .orElseThrow(() -> new IllegalArgumentException("Поръчката не е намерена"));

        // 2. Провери дали може да се редактира
        if (!canEditOrder(order)) {
            throw new IllegalStateException("Поръчката не може да се редактира");
        }

        // 3. Намери артикула
        OrderItem orderItem = order.getItems().stream()
                .filter(item -> item.getProduct().getId().equals(productId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Артикулът не е намерен в поръчката"));

        // 4. Освободи резервацията
        ProductEntity product = orderItem.getProduct();
        product.releaseReservation(orderItem.getQty().intValue());
        productRepository.save(product);

        // 5. Премахни артикула от поръчката
        order.getItems().remove(orderItem);

        // 6. Провери дали поръчката не е останала празна
        if (order.getItems().isEmpty()) {
            throw new IllegalStateException("Поръчката не може да остане без артикули");
        }

        // 7. Преизчисли и запази
        order = recalculateOrderTotals(order);
        orderRepository.save(order);

        log.info("Премахнат артикул {} от поръчка #{}", product.getSku(), orderId);

        return true;
    }

    @Override
    public boolean canEditOrder(Order order) {
        return order.getStatus() == OrderStatus.SUBMITTED;
    }

    @Override
    public Order recalculateOrderTotals(Order order) {
        BigDecimal totalNet = BigDecimal.ZERO;
        BigDecimal totalVat = BigDecimal.ZERO;

        for (OrderItem item : order.getItems()) {
            BigDecimal itemNet = item.getUnitPrice().multiply(item.getQty()).setScale(2, RoundingMode.HALF_UP);
            BigDecimal itemVat = itemNet.multiply(BigDecimal.valueOf(item.getProduct().getVatRate()))
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

            totalNet = totalNet.add(itemNet);
            totalVat = totalVat.add(itemVat);
        }

        order.setTotalNet(totalNet);
        order.setTotalVat(totalVat);
        order.setTotalGross(totalNet.add(totalVat));

        return order;
    }
}