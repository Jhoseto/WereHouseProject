package com.yourco.warehouse.service.impl;

import com.yourco.warehouse.entity.Order;
import com.yourco.warehouse.entity.ShippedProcessEntity;
import com.yourco.warehouse.entity.enums.OrderStatus;
import com.yourco.warehouse.repository.OrderRepository;
import com.yourco.warehouse.repository.ShippedProcessRepository;
import com.yourco.warehouse.service.OrderShippingService;
import com.yourco.warehouse.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * ORDER SHIPPING SERVICE - IMPLEMENTATION
 * =======================================
 * Използва всички performance методи от repository
 */
@Service
@Transactional
public class OrderShippingServiceImpl implements OrderShippingService {

    private static final Logger log = LoggerFactory.getLogger(OrderShippingServiceImpl.class);

    private final OrderRepository orderRepository;
    private final ShippedProcessRepository shippedProcessRepository;
    private final UserService userService;

    @Autowired
    public OrderShippingServiceImpl(OrderRepository orderRepository,
                                    ShippedProcessRepository shippedProcessRepository, UserService userService) {
        this.orderRepository = orderRepository;
        this.shippedProcessRepository = shippedProcessRepository;
        this.userService = userService;
    }

    @Override
    public Map<String, Object> startShipping(Long orderId, String truckNumber, Long employeeId, String employeeUsername) {
        log.debug("Starting shipping for order {} with truck {} by employee {}", orderId, truckNumber, employeeId);

        // Проверка дали вече има активна сесия
        if (shippedProcessRepository.existsByOrderId(orderId)) {
            throw new RuntimeException("Поръчката вече се товари от друг служител");
        }

        // Намери поръчката
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Поръчката не е намерена"));

        // Проверка дали поръчката е CONFIRMED
        if (!OrderStatus.CONFIRMED.equals(order.getStatus())) {
            throw new RuntimeException("Поръчката не е готова за товарене");
        }

        // Създай shipping session
        int totalItems = order.getItems() != null ? order.getItems().size() : 0;
        ShippedProcessEntity session = new ShippedProcessEntity(orderId, totalItems);
        session = shippedProcessRepository.save(session);

        // Обнови Order с shipping данни
        order.setShippingByEmployeeId(employeeId);
        order.setTruckNumber(truckNumber);
        order.setShippingStartedAt(LocalDateTime.now());
        orderRepository.save(order);

        log.info("Shipping started for order {} with session {}", orderId, session.getId());

        return Map.of(
                "success", true,
                "sessionId", session.getId(),
                "totalItems", totalItems,
                "message", "Товарене стартирано успешно"
        );
    }

    @Override
    public Map<String, Object> toggleItem(Long sessionId, Long itemId) {
        log.debug("Toggling item {} in session {}", itemId, sessionId);

        // Намери сесията
        ShippedProcessEntity session = shippedProcessRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Активна сесия не е намерена"));

        // Toggle логика
        boolean wasMaxed = session.getShippedItems().equals(session.getTotalItems());
        int newShippedItems;

        if (wasMaxed) {
            // Ако е било 100%, намаляваме
            newShippedItems = session.getShippedItems() - 1;
        } else {
            // Иначе увеличаваме
            newShippedItems = session.getShippedItems() + 1;
        }

        // PERFORMANCE: Използваме updateShippedItems() вместо save()
        shippedProcessRepository.updateShippedItems(sessionId, newShippedItems);

        // Обнови heartbeat
        shippedProcessRepository.updateHeartbeat(sessionId, LocalDateTime.now());

        boolean isNowLoaded = !wasMaxed;
        log.debug("Item toggled to {} for session {}", isNowLoaded ? "loaded" : "unloaded", sessionId);

        return Map.of(
                "success", true,
                "isLoaded", isNowLoaded,
                "shippedItems", newShippedItems,
                "totalItems", session.getTotalItems(),
                "message", "Статус обновен успешно"
        );
    }

    @Override
    public Map<String, Object> completeShipping(Long sessionId) {
        log.debug("Completing shipping for session {}", sessionId);

        // Намери сесията
        ShippedProcessEntity session = shippedProcessRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Активна сесия не е намерена"));

        // Проверка дали всички артикули са заредени
        if (!session.getShippedItems().equals(session.getTotalItems())) {
            throw new RuntimeException("Не всички артикули са маркирани като заредени");
        }

        // Намери поръчката
        Order order = orderRepository.findById(session.getOrderId())
                .orElseThrow(() -> new RuntimeException("Поръчката не е намерена"));

        // Изчисли продължителност
        LocalDateTime startTime = session.getStartedAt();
        LocalDateTime endTime = LocalDateTime.now();
        long durationSeconds = Duration.between(startTime, endTime).getSeconds();

        // Обнови Order със SHIPPED статус
        order.setStatus(OrderStatus.SHIPPED);
        order.setShippedAt(endTime);
        order.setShippingDurationSeconds((int) durationSeconds);
        orderRepository.save(order);

        // Изтрий временната сесия
        shippedProcessRepository.deleteByOrderId(session.getOrderId());

        log.info("Shipping completed for order {} in {} seconds", session.getOrderId(), durationSeconds);

        return Map.of(
                "success", true,
                "orderId", session.getOrderId(),
                "totalDuration", durationSeconds,
                "message", "Товарене завършено успешно"
        );
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getShippingStatus(Long orderId) {
        log.debug("Getting shipping status for order {}", orderId);

        Optional<ShippedProcessEntity> sessionOpt = shippedProcessRepository.findByOrderId(orderId);

        if (sessionOpt.isEmpty()) {
            return Map.of("hasActiveSession", false);
        }

        ShippedProcessEntity session = sessionOpt.get();

        // Намери Order за допълнителни данни
        Order order = orderRepository.findById(orderId).orElse(null);

        return Map.of(
                "hasActiveSession", true,
                "session", Map.of(
                        "id", session.getId(),
                        "orderId", session.getOrderId(),
                        "totalItems", session.getTotalItems(),
                        "shippedItems", session.getShippedItems(),
                        "startedAt", session.getStartedAt(),
                        "lastHeartbeat", session.getLastHeartbeat(),
                        "status", session.getStatus(),
                        "employeeId", order != null ? order.getShippingByEmployeeId() : null,
                        "username", order != null ? userService.getCurrentUser().getUsername(): "Неизвестен",
                        "truckNumber", order != null ? order.getTruckNumber() : "Неизвестен"
                )
        );
    }

    @Override
    public void updateHeartbeat(Long sessionId) {
        log.trace("Updating heartbeat for session {}", sessionId);

        try {
            // PERFORMANCE: Използваме updateHeartbeat() вместо save()
            shippedProcessRepository.updateHeartbeat(sessionId, LocalDateTime.now());
        } catch (Exception e) {
            log.warn("Failed to update heartbeat for session {}: {}", sessionId, e.getMessage());
            // Не хвърляме exception за heartbeat - не е критично
        }
    }

    @Override
    public int detectLostSignalSessions(int thresholdMinutes) {
        log.debug("Detecting lost signal sessions with threshold {} minutes", thresholdMinutes);

        LocalDateTime threshold = LocalDateTime.now().minusMinutes(thresholdMinutes);

        // BULK OPERATION: Използваме markLostSignalSessions()
        int affectedSessions = shippedProcessRepository.markLostSignalSessions(threshold);

        if (affectedSessions > 0) {
            log.warn("Marked {} sessions as SIGNAL_LOST", affectedSessions);
        }

        return affectedSessions;
    }

    @Override
    public int cleanupOldLostSessions(int maxAgeHours) {
        log.debug("Cleaning up lost sessions older than {} hours", maxAgeHours);

        LocalDateTime threshold = LocalDateTime.now().minusHours(maxAgeHours);

        // BULK OPERATION: Използваме deleteOldLostSessions()
        int deletedSessions = shippedProcessRepository.deleteOldLostSessions(threshold);

        if (deletedSessions > 0) {
            log.info("Cleaned up {} old lost sessions", deletedSessions);
        }

        return deletedSessions;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getActiveSessionsProgress() {
        log.debug("Getting active sessions progress");

        // MONITORING: Използваме findActiveSessionProgress()
        List<Object[]> rawData = shippedProcessRepository.findActiveSessionProgress();

        return rawData.stream()
                .map(row -> {
                    Map<String, Object> result = new java.util.HashMap<>();
                    result.put("orderId", (Long) row[0]);
                    result.put("shippedItems", (Integer) row[1]);
                    result.put("totalItems", (Integer) row[2]);
                    result.put("completionPercentage", calculatePercentage((Integer) row[1], (Integer) row[2]));
                    return result;
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public long getActiveSessionsCount() {
        log.debug("Getting active sessions count");

        // STATISTICS: Използваме countActiveSessions()
        return shippedProcessRepository.countActiveSessions();
    }

    // Utility method
    private int calculatePercentage(Integer shipped, Integer total) {
        if (total == null || total == 0) return 0;
        if (shipped == null) shipped = 0;
        return Math.round((float) shipped / total * 100);
    }
}