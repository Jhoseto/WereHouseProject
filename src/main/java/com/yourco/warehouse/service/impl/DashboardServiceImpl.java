package com.yourco.warehouse.service.impl;

import com.yourco.warehouse.dto.*;
import com.yourco.warehouse.entity.Order;
import com.yourco.warehouse.entity.enums.OrderStatus;
import com.yourco.warehouse.mapper.OrderMapper;
import com.yourco.warehouse.repository.OrderRepository;
import com.yourco.warehouse.service.DashboardService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * DASHBOARD SERVICE IMPLEMENTATION WITH DTO SUPPORT
 * =================================================
 */
@Service
@Transactional(readOnly = true)
public class DashboardServiceImpl implements DashboardService {

    private static final Logger log = LoggerFactory.getLogger(DashboardServiceImpl.class);

    private final OrderRepository orderRepository;
    private final OrderMapper orderMapper;

    @Autowired
    public DashboardServiceImpl(OrderRepository orderRepository, OrderMapper orderMapper) {
        this.orderRepository = orderRepository;
        this.orderMapper = orderMapper;
    }

    @Override
    public DashboardDataDTO getDashboardOverview() {
        log.debug("Getting dashboard overview data");

        try {
            DashboardDataDTO data = new DashboardDataDTO();

            // Използваме cached repository методи за оптимална производителност
            data.setSubmittedCount(orderRepository.countByStatus(OrderStatus.SUBMITTED));
            data.setConfirmedCount(orderRepository.countByStatus(OrderStatus.CONFIRMED));
            data.setPickedCount(orderRepository.countByStatus(OrderStatus.PICKED));
            data.setShippedCount(orderRepository.countByStatus(OrderStatus.SHIPPED));
            data.setCancelledCount(orderRepository.countByStatus(OrderStatus.CANCELLED));

            log.info("Dashboard overview loaded: submitted={}, confirmed={}, picked={}, shipped={}, cancelled={}",
                    data.getSubmittedCount(), data.getConfirmedCount(), data.getPickedCount(),
                    data.getShippedCount(), data.getCancelledCount());

            return data;

        } catch (DataAccessException e) {
            log.error("Database error while getting dashboard overview: {}", e.getMessage());
            throw new RuntimeException("Грешка при зареждане на dashboard статистиките", e);
        }
    }

    @Override
    public DailyStatsDTO getDailyStatistics() {
        log.debug("Getting daily statistics");

        try {
            LocalDateTime startOfDay = LocalDateTime.of(LocalDateTime.now().toLocalDate(), LocalTime.MIN);
            LocalDateTime endOfDay = LocalDateTime.of(LocalDateTime.now().toLocalDate(), LocalTime.MAX);

            List<Order> todayOrders = orderRepository.findOrdersBetweenDates(startOfDay, endOfDay);

            DailyStatsDTO stats = new DailyStatsDTO();
            stats.setProcessed(todayOrders.size());

            // Изчисляваме общия приход от завършени поръчки днес
            java.math.BigDecimal totalRevenue = todayOrders.stream()
                    .filter(order -> order.getStatus() == OrderStatus.SHIPPED)
                    .map(Order::getTotalGross)
                    .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
            stats.setRevenue(totalRevenue.toString());

            // Изчисляваме средното време за обработка (опростена версия)
            stats.setAvgTime(calculateAverageProcessingTime(todayOrders));

            // Броим уникалните клиенти днес
            long activeClients = todayOrders.stream()
                    .map(order -> order.getClient().getId())
                    .distinct()
                    .count();
            stats.setActiveClients((int) activeClients);

            log.info("Daily stats loaded: processed={}, revenue={}, activeClients={}",
                    stats.getProcessed(), stats.getRevenue(), stats.getActiveClients());

            return stats;

        } catch (DataAccessException e) {
            log.error("Database error while getting daily statistics: {}", e.getMessage());
            throw new RuntimeException("Грешка при зареждане на дневните статистики", e);
        }
    }

    /**
     * НОВА ВЕРСИЯ: Връща типизиран OrdersListResponseDTO вместо Map<String, Object>
     */
    public OrdersListResponseDTO getOrdersByStatusAsDTO(OrderStatus status, int limit) {
        log.debug("Getting orders by status: {} with limit: {}", status, limit);

        try {
            // Получаваме orders от repository с eager loading
            List<Order> orders = orderRepository.findByStatusOrderBySubmittedAtDesc(status);

            // Ограничаваме резултатите за performance
            List<Order> limitedOrders = orders.stream()
                    .limit(limit)
                    .toList();

            // Ensure all lazy collections are initialized within transaction
            initializeLazyCollections(limitedOrders);

            // Конвертираме към DTO използвайки mapper
            List<OrderDTO> orderDTOs = orderMapper.toDTOList(limitedOrders);

            // Създаваме типизиран response
            OrdersListResponseDTO response = new OrdersListResponseDTO(orderDTOs, status.name());
            response.setHasMore(orders.size() > limit);

            // Log mapping статистика за debugging
            orderMapper.logMappingStats(limitedOrders, "getOrdersByStatus");

            log.info("Loaded {} orders (limited from {}) for status: {}",
                    orderDTOs.size(), orders.size(), status);

            return response;

        } catch (DataAccessException e) {
            log.error("Database error while getting orders by status {}: {}", status, e.getMessage());
            throw new RuntimeException("Грешка при зареждане на поръчките по статус", e);
        }
    }

    /**
     * НОВА ВЕРСИЯ: Връща DashboardOverviewResponseDTO вместо Map<String, Object>
     */
    public DashboardOverviewResponseDTO getDashboardOverviewAsDTO() {
        log.debug("Getting dashboard overview as DTO");

        try {
            DashboardDataDTO dashboardData = getDashboardOverview();
            DailyStatsDTO dailyStats = getDailyStatistics();

            DashboardOverviewResponseDTO response = new DashboardOverviewResponseDTO(dashboardData, dailyStats);

            log.info("Dashboard overview DTO created successfully");
            return response;

        } catch (Exception e) {
            log.error("Error getting dashboard overview DTO: {}", e.getMessage());
            throw new RuntimeException("Грешка при създаване на dashboard overview", e);
        }
    }


    public OrderDTO convertOrderToDTO(Order order) {
        log.debug("Converting order {} to DTO", order != null ? order.getId() : "null");

        try {
            return orderMapper.toDTO(order);
        } catch (Exception e) {
            log.error("Error converting order {} to DTO: {}",
                    order != null ? order.getId() : "null", e.getMessage());
            // Връщаме minimal DTO при грешки
            return orderMapper.toMinimalDTO(order);
        }
    }

    @Override
    @Transactional // Write transaction за статус промени
    public boolean confirmOrder(Long orderId) {
        log.info("Confirming order: {}", orderId);

        try {
            java.util.Optional<Order> orderOpt = orderRepository.findById(orderId);
            if (orderOpt.isEmpty()) {
                throw new IllegalArgumentException("Поръчка с ID " + orderId + " не съществува");
            }

            Order order = orderOpt.get();

            if (!isValidStatusTransition(order.getStatus(), OrderStatus.CONFIRMED)) {
                throw new IllegalStateException("Невалидна статус промяна от " +
                        order.getStatus() + " към CONFIRMED");
            }

            order.setStatus(OrderStatus.CONFIRMED);
            order.setConfirmedAt(LocalDateTime.now());

            orderRepository.save(order);

            log.info("Order {} confirmed successfully", orderId);
            return true;

        } catch (DataAccessException e) {
            log.error("Database error while confirming order {}: {}", orderId, e.getMessage());
            throw new RuntimeException("Грешка при потвърждаване на поръчката", e);
        }
    }

    @Override
    @Transactional
    public boolean startPickingOrder(Long orderId) {
        log.info("Starting picking for order: {}", orderId);

        try {
            java.util.Optional<Order> orderOpt = orderRepository.findById(orderId);
            if (orderOpt.isEmpty()) {
                throw new IllegalArgumentException("Поръчка с ID " + orderId + " не съществува");
            }

            Order order = orderOpt.get();

            if (!isValidStatusTransition(order.getStatus(), OrderStatus.PICKED)) {
                throw new IllegalStateException("Невалидна статус промяна от " +
                        order.getStatus() + " към PICKED");
            }

            order.setStatus(OrderStatus.PICKED);
            orderRepository.save(order);

            log.info("Picking started for order {}", orderId);
            return true;

        } catch (DataAccessException e) {
            log.error("Database error while starting picking for order {}: {}", orderId, e.getMessage());
            throw new RuntimeException("Грешка при започване на пикинга", e);
        }
    }

    @Override
    @Transactional
    public boolean completeOrder(Long orderId) {
        log.info("Completing order: {}", orderId);

        try {
            java.util.Optional<Order> orderOpt = orderRepository.findById(orderId);
            if (orderOpt.isEmpty()) {
                throw new IllegalArgumentException("Поръчка с ID " + orderId + " не съществува");
            }

            Order order = orderOpt.get();

            if (!isValidStatusTransition(order.getStatus(), OrderStatus.SHIPPED)) {
                throw new IllegalStateException("Невалидна статус промяна от " +
                        order.getStatus() + " към SHIPPED");
            }

            order.setStatus(OrderStatus.SHIPPED);
            orderRepository.save(order);

            log.info("Order {} completed successfully", orderId);
            return true;

        } catch (DataAccessException e) {
            log.error("Database error while completing order {}: {}", orderId, e.getMessage());
            throw new RuntimeException("Грешка при завършване на поръчката", e);
        }
    }

    @Override
    @Transactional
    public boolean rejectOrder(Long orderId, String reason) {
        log.info("Rejecting order: {} with reason: {}", orderId, reason);

        try {
            java.util.Optional<Order> orderOpt = orderRepository.findById(orderId);
            if (orderOpt.isEmpty()) {
                throw new IllegalArgumentException("Поръчка с ID " + orderId + " не съществува");
            }

            Order order = orderOpt.get();

            if (!isValidStatusTransition(order.getStatus(), OrderStatus.CANCELLED)) {
                throw new IllegalStateException("Невалидна статус промяна от " +
                        order.getStatus() + " към CANCELLED");
            }

            order.setStatus(OrderStatus.CANCELLED);

            // Добавяме причината към бележките
            String currentNotes = order.getNotes() != null ? order.getNotes() : "";
            String rejectionNote = "ОТКАЗАНО: " + reason;
            order.setNotes(currentNotes.isEmpty() ? rejectionNote : currentNotes + "\n" + rejectionNote);

            orderRepository.save(order);

            log.info("Order {} rejected successfully", orderId);
            return true;

        } catch (DataAccessException e) {
            log.error("Database error while rejecting order {}: {}", orderId, e.getMessage());
            throw new RuntimeException("Грешка при отказване на поръчката", e);
        }
    }

    @Override
    public boolean isValidStatusTransition(OrderStatus fromStatus, OrderStatus toStatus) {
        // Allow any transition to CANCELLED
        if (toStatus == OrderStatus.CANCELLED) {
            return true;
        }

        // Define valid transitions based on business rules
        return switch (fromStatus) {
            case DRAFT -> toStatus == OrderStatus.SUBMITTED;
            case SUBMITTED -> toStatus == OrderStatus.CONFIRMED;
            case CONFIRMED -> toStatus == OrderStatus.PICKED;
            case PICKED -> toStatus == OrderStatus.SHIPPED;
            case SHIPPED, CANCELLED -> false; // Final states
        };
    }

    @Override
    @Transactional
    public boolean updateOrderItemQuantity(Long orderId, String productSku, Integer newQuantity) {
        log.info("Updating quantity for order: {}, product: {}, quantity: {}",
                orderId, productSku, newQuantity);

        log.warn("updateOrderItemQuantity not fully implemented yet");
        return false;
    }

    @Override
    @Transactional
    public boolean approveOrderItem(Long orderId, String productSku) {
        log.info("Approving item for order: {}, product: {}", orderId, productSku);

        log.warn("approveOrderItem not fully implemented yet");
        return false;
    }

    @Override
    @Transactional
    public boolean rejectOrderItem(Long orderId, String productSku, String reason) {
        log.info("Rejecting item for order: {}, product: {}, reason: {}",
                orderId, productSku, reason);

        log.warn("rejectOrderItem not fully implemented yet");
        return false;
    }

    @Override
    public Order getOrderDetails(Long orderId) {
        log.debug("Getting order details for: {}", orderId);

        try {
            java.util.Optional<Order> orderOpt = orderRepository.findByIdWithItems(orderId);

            if (orderOpt.isPresent()) {
                Order order = orderOpt.get();
                initializeLazyCollections(java.util.List.of(order));
                return order;
            }

            return null;

        } catch (DataAccessException e) {
            log.error("Database error while getting order details for {}: {}", orderId, e.getMessage());
            throw new RuntimeException("Грешка при зареждане на детайлите на поръчката", e);
        }
    }

    /**
     * НОВА ВЕРСИЯ: Връща OrderDTO вместо Order entity
     */
    public OrderDTO getOrderDetailsAsDTO(Long orderId) {
        log.debug("Getting order details as DTO for: {}", orderId);

        Order order = getOrderDetails(orderId);
        return order != null ? orderMapper.toDTO(order) : null;
    }

    @Override
    public boolean hasUrgentOrders() {
        try {
            long urgentCount = orderRepository.countByStatus(OrderStatus.SUBMITTED);
            return urgentCount > 0;
        } catch (DataAccessException e) {
            log.error("Database error while checking urgent orders: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public java.util.Map<String, Object> getPerformanceMetrics() {
        log.debug("Getting performance metrics");

        try {
            java.util.Map<String, Object> metrics = new java.util.HashMap<>();

            metrics.put("totalOrders", orderRepository.count());
            metrics.put("urgentOrders", orderRepository.countByStatus(OrderStatus.SUBMITTED));
            metrics.put("completedOrders", orderRepository.countByStatus(OrderStatus.SHIPPED));
            metrics.put("timestamp", LocalDateTime.now());

            return metrics;

        } catch (DataAccessException e) {
            log.error("Database error while getting performance metrics: {}", e.getMessage());
            return java.util.Collections.emptyMap();
        }
    }

    // ==========================================
    // PRIVATE HELPER METHODS
    // ==========================================

    /**
     * Инициализира lazy collections в рамките на активната транзакция
     */
    private void initializeLazyCollections(List<Order> orders) {
        for (Order order : orders) {
            try {
                if (order.getItems() != null) {
                    order.getItems().size();

                    for (com.yourco.warehouse.entity.OrderItem item : order.getItems()) {
                        if (item.getProduct() != null) {
                            item.getProduct().getName();
                        }
                    }
                }

                if (order.getClient() != null) {
                    order.getClient().getUsername();
                }

            } catch (Exception e) {
                log.warn("Error initializing lazy collections for order {}: {}",
                        order.getId(), e.getMessage());
            }
        }
    }

    /**
     * Изчислява средното време за обработка на поръчки
     */
    private String calculateAverageProcessingTime(List<Order> orders) {
        return "2.3ч"; // Placeholder - може да се направи по-софистицирано
    }
}