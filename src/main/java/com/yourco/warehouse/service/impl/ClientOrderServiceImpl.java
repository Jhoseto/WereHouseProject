package com.yourco.warehouse.service.impl;

import com.yourco.warehouse.dto.OrderDTO;
import com.yourco.warehouse.entity.*;
import com.yourco.warehouse.entity.enums.OrderStatus;
import com.yourco.warehouse.mapper.OrderMapper;
import com.yourco.warehouse.repository.OrderRepository;
import com.yourco.warehouse.repository.OrderItemRepository;
import com.yourco.warehouse.repository.ProductRepository;
import com.yourco.warehouse.repository.UserRepository;
import com.yourco.warehouse.service.*;
import com.yourco.warehouse.dto.CartItemDTO;
import jakarta.persistence.EntityManager;
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
import java.util.*;

@Service
@Transactional
public class ClientOrderServiceImpl implements ClientOrderService {

    private static final Logger log = LoggerFactory.getLogger(ClientOrderServiceImpl.class);

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final CartService cartService;
    private final OrderMapper orderMapper;
    private final DashboardBroadcastService broadcastService;
    private final InventoryBroadcastService inventoryBroadcastService;
    private final ProductService productService;
    private final DashboardBroadcastService dashboardBroadcastService;

    @Autowired
    public ClientOrderServiceImpl(OrderRepository orderRepository,
                                  OrderItemRepository orderItemRepository,
                                  ProductRepository productRepository,
                                  UserRepository userRepository,
                                  CartService cartService,
                                  OrderMapper orderMapper,
                                  DashboardBroadcastService broadcastService,
                                  InventoryBroadcastService inventoryBroadcastService,
                                  ProductService productService,
                                  DashboardBroadcastService dashboardBroadcastService) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.cartService = cartService;
        this.orderMapper = orderMapper;
        this.broadcastService = broadcastService;
        this.inventoryBroadcastService = inventoryBroadcastService;
        this.productService = productService;
        this.dashboardBroadcastService = dashboardBroadcastService;
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
            order.setStatus(OrderStatus.PENDING);
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

            // ✅ 10. НОВО - Broadcast новата поръчка към всички dashboard-ове
            try {
                Map<String, Object> orderData = new HashMap<>();
                orderData.put("orderId", savedOrder.getId());
                orderData.put("clientName", client.getUsername());
                orderData.put("status", savedOrder.getStatus().name());
                orderData.put("itemsCount", savedOrder.getItems().size());
                orderData.put("totalGross", savedOrder.getTotalGross());
                orderData.put("submittedAt", savedOrder.getSubmittedAt());
                orderData.put("isUrgent", savedOrder.getStatus() == OrderStatus.URGENT);

                broadcastService.broadcastNewOrder(savedOrder.getId(), orderData);

                // ✅ изчислява counters-ите
                Long urgentCount = orderRepository.countByStatus(OrderStatus.URGENT);
                Long pendingCount = orderRepository.countByStatus(OrderStatus.PENDING);
                Long confirmedCount = orderRepository.countByStatus(OrderStatus.CONFIRMED);
                Long shippedCount = orderRepository.countByStatus(OrderStatus.SHIPPED);
                Long cancelledCount = orderRepository.countByStatus(OrderStatus.CANCELLED);

                broadcastService.broadcastCounterUpdate(urgentCount, pendingCount, confirmedCount, shippedCount, cancelledCount);

            } catch (Exception e) {
                log.warn("Failed to broadcast new order {}: {}", savedOrder.getId(), e.getMessage());
                // Продължаваме - поръчката е създадена успешно
            }

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
        return orderRepository.findByIdWithItems(orderId)
                .filter(order -> order.getClient().getId().equals(clientId));
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
        return orderRepository.findByClientOrderBySubmittedAtDescPageble(client, pageable);
    }

    // В ClientClientOrderServiceImpl.java

    @Override
    @Transactional
    public boolean updateOrderItemQuantity(Long orderId, Long productId, Integer newQuantity, Long clientId) {

        Order order = getOrderByIdForClient(orderId, clientId)
                .orElseThrow(() -> new IllegalArgumentException("Поръчката не е намерена"));

        if (!canEditOrder(order)) {
            throw new IllegalStateException("Поръчката не може да се редактира");
        }

        OrderItem orderItem = order.getItems().stream()
                .filter(item -> item.getProduct().getId().equals(productId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Артикулът не е намерен в поръчката"));

        ProductEntity product = productRepository.findByIdWithLock(productId)
                .orElseThrow(() -> new IllegalArgumentException("Продуктът не съществува"));

        int currentReserved = orderItem.getQty().intValue();
        int difference = newQuantity - currentReserved;

        if (difference == 0) {
            return false;
        }

        if (difference > 0) {
            if (!product.hasAvailableQuantity(difference)) {
                int maxPossible = currentReserved + product.getQuantityAvailable();
                throw new IllegalStateException(
                        String.format("Няма достатъчно наличност. Максимално възможно: %d", maxPossible));
            }
            product.reserveQuantity(difference);
        } else {
            // Намаляваме количеството - освобождаваме резервация
            product.releaseReservation(Math.abs(difference));
        }

        orderItem.setQty(BigDecimal.valueOf(newQuantity));

        productRepository.save(product);
        orderRepository.save(order);

        return true;
    }


    @Override
    @Transactional
    public boolean removeOrderItem(Long orderId, Long productId, Long clientId) {
        Order order = getOrderByIdForClient(orderId, clientId)
                .orElseThrow(() -> new IllegalArgumentException("Поръчката не е намерена"));

        if (!canEditOrder(order)) {
            throw new IllegalStateException("Поръчката не може да се редактира");
        }

        OrderItem orderItem = order.getItems().stream()
                .filter(item -> item.getProduct().getId().equals(productId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Артикулът не е намерен в поръчката"));

        // ✅ ПОПРАВКА: Зареди product с lock
        ProductEntity product = productRepository.findByIdWithLock(productId)
                .orElseThrow(() -> new IllegalArgumentException("Продуктът не е намерен"));

        product.releaseReservation(orderItem.getQty().intValue());
        productRepository.save(product);

        order.getItems().remove(orderItem);

        if (order.getItems().isEmpty()) {
            throw new IllegalStateException("Поръчката не може да остане без артикули");
        }

        order = recalculateOrderTotals(order);
        orderRepository.save(order);

        return true;
    }


    @Override
    @Transactional
    public boolean canEditOrder(Order order) {
        return order.getStatus() == OrderStatus.PENDING;
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



    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> updateOrderBatch(Long orderId, Map<Long, Integer> itemUpdates, Long clientId) {
        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> warnings = new ArrayList<>();
        List<Map<String, Object>> errors = new ArrayList<>();
        List<String> updatedItems = new ArrayList<>();

        try {
            // 1. Намери поръчката БЕЗ readOnly
            Optional<Order> orderOpt = orderRepository.findById(orderId);
            if (orderOpt.isEmpty()) {
                result.put("success", false);
                result.put("message", "Поръчката не е намерена");
                return result;
            }

            Order order = orderOpt.get();

            // Провери дали принадлежи на клиента
            if (!order.getClient().getId().equals(clientId)) {
                result.put("success", false);
                result.put("message", "Поръчката не е намерена");
                return result;
            }

            // 2. Провери дали може да се редактира
            if (!canEditOrder(order)) {
                result.put("success", false);
                result.put("message", "Поръчката не може да се редактира в текущото ѝ състояние");
                return result;
            }

            // 3. Валидация - поръчката не може да остане празна
            if (itemUpdates == null || itemUpdates.isEmpty()) {
                result.put("success", false);
                result.put("message", "Поръчката не може да остане без артикули");
                return result;
            }

            // 4. Създай map на съществуващите артикули
            Map<Long, OrderItem> existingItems = new HashMap<>();
            for (OrderItem item : order.getItems()) {
                existingItems.put(item.getProduct().getId(), item);
            }

            // 5. Обработи премахванията (артикули които не са в новия списък)
            List<OrderItem> itemsToRemove = new ArrayList<>();

            for (OrderItem item : new ArrayList<>(order.getItems())) {
                if (!itemUpdates.containsKey(item.getProduct().getId())) {
                    // ✅ ПОПРАВКА: Зареди product с lock
                    Long productId = item.getProduct().getId();
                    ProductEntity product = productRepository.findByIdWithLock(productId)
                            .orElseThrow(() -> new IllegalStateException("Продукт не е намерен"));

                    product.releaseReservation(item.getQty().intValue());
                    productRepository.save(product);
                    itemsToRemove.add(item);
                }
            }

            // 6. Премахни артикулите от поръчката
            for (OrderItem itemToRemove : itemsToRemove) {
                order.getItems().remove(itemToRemove);
                orderItemRepository.delete(itemToRemove);
            }

            // 7. Обработи обновяванията на количествата
            for (Map.Entry<Long, Integer> entry : itemUpdates.entrySet()) {
                Long productId = entry.getKey();
                Integer newQuantity = entry.getValue();

                // Валидация на количеството
                if (newQuantity == null || newQuantity <= 0) {
                    Map<String, Object> error = new HashMap<>();
                    error.put("message", "Невалидно количество за продукт с ID " + productId);
                    error.put("productId", productId);
                    errors.add(error);
                    continue;
                }

                OrderItem orderItem = existingItems.get(productId);
                if (orderItem == null) {
                    Map<String, Object> error = new HashMap<>();
                    error.put("message", "Продуктът с ID " + productId + " не е намерен в поръчката");
                    error.put("productId", productId);
                    errors.add(error);
                    continue;
                }

                ProductEntity product = orderItem.getProduct();
                int currentReserved = orderItem.getQty().intValue();
                int difference = newQuantity - currentReserved;

                // Проверка на наличност ако увеличаваме
                if (difference > 0) {
                    int maxOrderable = getMaxOrderableQuantity(clientId, product);

                    if (currentReserved + difference > maxOrderable) {
                        // Не можем да увеличим толкова
                        int maxPossible = maxOrderable;

                        Map<String, Object> warning = new HashMap<>();
                        warning.put("message", String.format("Продуктът '%s' няма достатъчна наличност. Заявени: %d, максимум: %d (налични в склада: %d)",
                                product.getName(), currentReserved + difference, maxPossible, product.getQuantityAvailable()));
                        warning.put("productId", productId);
                        warning.put("productName", product.getName());
                        warning.put("requestedQuantity", currentReserved + difference);
                        warning.put("availableQuantity", product.getQuantityAvailable());
                        warning.put("finalQuantity", maxPossible);
                        warnings.add(warning);

                        // Използвай максималното възможно количество
                        newQuantity = maxPossible;
                        difference = newQuantity - currentReserved;
                    }

                    if (difference > 0) {
                        product.reserveQuantity(difference);
                        productRepository.save(product);
                    }
                } else if (difference < 0) {
                    // Намаляваме - освободи излишното
                    product.releaseReservation(Math.abs(difference));
                    productRepository.save(product);
                }

                // Обнови количеството
                orderItem.setQty(BigDecimal.valueOf(newQuantity));
                updatedItems.add(product.getName() + " (нова бройка: " + newQuantity + ")");
            }

            // 8. Преизчисли общите суми
            order = recalculateOrderTotals(order);

            // 9. Запази поръчката
            orderRepository.save(order);

            // 10. Подготви резултата
            result.put("success", true);
            result.put("message", "Поръчката е обновена успешно");
            result.put("updatedItems", updatedItems);

            if (!warnings.isEmpty()) {
                result.put("warnings", warnings);
            }

            if (!errors.isEmpty()) {
                result.put("errors", errors);
            }

            // 11. Добави новите общи суми
            Map<String, Object> totals = new HashMap<>();
            totals.put("totalNet", order.getTotalNet());
            totals.put("totalVat", order.getTotalVat());
            totals.put("totalGross", order.getTotalGross());
            result.put("totals", totals);

        } catch (IllegalArgumentException | IllegalStateException e) {
            result.put("success", false);
            result.put("message", e.getMessage());
            log.warn("Валидационна грешка при batch обновяване на поръчка {}: {}", orderId, e.getMessage());
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Възникна грешка при обновяването на поръчката");
            log.error("Грешка при batch обновяване на поръчка {}: {}", orderId, e.getMessage(), e);
        }

        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<OrderDTO> getOrderById(Long id) {
        return orderRepository.findByIdWithItems(id)
                .map(orderMapper::toDTO);
    }



    @Override
    @Transactional
    public Map<String, Object> cancelPendingOrder(Long orderId, Long clientId) {
        Map<String, Object> result = new HashMap<>();

        try {
            // 1. Намери поръчката
            Order order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new IllegalArgumentException("Поръчката не е намерена"));

            // 2. Провери дали принадлежи на клиента
            if (!order.getClient().getId().equals(clientId)) {
                result.put("success", false);
                result.put("message", "Поръчката не е намерена");
                return result;
            }

            // 3. Провери дали е PENDING
            if (!order.getStatus().equals(OrderStatus.PENDING)) {
                result.put("success", false);
                result.put("message", "Можете да откажете само поръчки в статус PENDING");
                return result;
            }

            // 4. Запази списък с productId и quantities ПРЕДИ да изтриеш нещо
            Map<Long, Integer> reservationsToRelease = new HashMap<>();
            for (OrderItem item : order.getItems()) {
                reservationsToRelease.put(item.getProduct().getId(), item.getQty().intValue());
            }

            // 5. ПЪРВО: Изтрий order items
            List<OrderItem> itemsToDelete = new ArrayList<>(order.getItems());
            order.getItems().clear();
            orderItemRepository.deleteAll(itemsToDelete);
            orderItemRepository.flush();

            // 6. ВТОРО: Изтрий order
            orderRepository.delete(order);
            orderRepository.flush();

            // 7. ТРЕТО: СЕГА освободи резервациите (след като order и items са изтрити)
            for (Map.Entry<Long, Integer> entry : reservationsToRelease.entrySet()) {
                Long productId = entry.getKey();
                Integer quantity = entry.getValue();

                ProductEntity product = productRepository.findByIdWithLock(productId)
                        .orElseThrow(() -> new IllegalStateException("Продукт не е намерен"));

                product.releaseReservation(quantity);
                productRepository.saveAndFlush(product);
            }

            result.put("success", true);
            result.put("message", "Поръчката е отказана успешно и изтрита");

            return result;

        } catch (Exception e) {
            log.error("Error cancelling order {}: {}", orderId, e.getMessage(), e);
            result.put("success", false);
            result.put("message", "Грешка при отказване на поръчката: " + e.getMessage());
            return result;
        }
    }


    /**
     * Изчислява максималното количество което user може да поръча
     */
    private int getMaxOrderableQuantity(Long userId, ProductEntity product) {
        int available = product.getQuantityAvailable();
        BigDecimal reserved = orderItemRepository.getReservedQuantityByUser(userId, product.getId());
        return available + reserved.intValue();
    }
}