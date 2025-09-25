package com.yourco.warehouse.service.impl;

import com.yourco.warehouse.entity.Order;
import com.yourco.warehouse.entity.ShippedProcessEntity;
import com.yourco.warehouse.entity.UserEntity;
import com.yourco.warehouse.entity.enums.OrderStatus;
import com.yourco.warehouse.repository.OrderRepository;
import com.yourco.warehouse.repository.ShippedProcessRepository;
import com.yourco.warehouse.repository.UserRepository;
import com.yourco.warehouse.service.OrderLoadingService;
import com.yourco.warehouse.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * ORDER LOADING SERVICE - ENTERPRISE IMPLEMENTATION
 * ================================================
 * Тази имплементация осигурява строг контрол върху процеса на товарене
 * чрез username-based authorization модел. Само служителят който започва
 * товарене може да прави промени - останалите могат само да наблюдават.
 */
@Service
@Transactional
public class OrderLoadingServiceImpl implements OrderLoadingService {

    private static final Logger log = LoggerFactory.getLogger(OrderLoadingServiceImpl.class);

    private final OrderRepository orderRepository;
    private final ShippedProcessRepository shippedProcessRepository;
    private final UserService userService;
    private final UserRepository userRepository;

    @Autowired
    public OrderLoadingServiceImpl(OrderRepository orderRepository,
                                   ShippedProcessRepository shippedProcessRepository,
                                   UserService userService, UserRepository userRepository) {
        this.orderRepository = orderRepository;
        this.shippedProcessRepository = shippedProcessRepository;
        this.userService = userService;
        this.userRepository = userRepository;
    }

    @Override
    public Map<String, Object> startLoading(Long orderId, String truckNumber) {
        try {
            // Проверка дали вече има активна session за тази поръчка
            if (shippedProcessRepository.existsByOrderId(orderId)) {
                throw new RuntimeException("Поръчката вече се товари от друг служител");
            }

            // Намери поръчката и валидирай статуса
            Order order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new RuntimeException("Поръчката не е намерена"));

            if (!OrderStatus.CONFIRMED.equals(order.getStatus())) {
                throw new RuntimeException("Поръчката не е готова за товарене");
            }

            // Вземи текущия служител и неговото username
            UserEntity currentEmployee = userService.getCurrentUser();
            String employeeUsername = currentEmployee.getUsername();
            Long employeeId = currentEmployee.getId();

            // Създай shipping session с username на служителя
            int totalItems = order.getItems() != null ? order.getItems().size() : 0;
            ShippedProcessEntity session = new ShippedProcessEntity(orderId, totalItems, employeeUsername);
            session = shippedProcessRepository.save(session);

            // Обнови Order entity с данни за товаренето
            order.setShippingByEmployeeId(employeeId);
            order.setTruckNumber(truckNumber);
            order.setShippingStartedAt(LocalDateTime.now());
            orderRepository.save(order);

            return Map.of(
                    "success", true,
                    "sessionId", session.getId(),
                    "totalItems", totalItems,
                    "employeeUsername", employeeUsername,
                    "message", "Товарене стартирано успешно"
            );

        } catch (Exception e) {
            log.error("Грешка при стартиране на товарене за поръчка {}: {}", orderId, e.getMessage());
            throw e;
        }
    }

    @Override
    public Map<String, Object> toggleItem(Long sessionId, Long itemId) {
        try {
            // Намери активната session
            ShippedProcessEntity session = shippedProcessRepository.findById(sessionId)
                    .orElseThrow(() -> new RuntimeException("Активна session не е намерена"));

            // КРИТИЧНА AUTHORIZATION ПРОВЕРКА
            // Само служителят който е започнал товаренето може да прави промени
            String currentUsername = userService.getCurrentUser().getUsername();
            if (!session.getEmployeeUsername().equals(currentUsername)) {
                throw new RuntimeException("Само " + session.getEmployeeUsername() + " може да маркира артикули в тази поръчка");
            }

            // Toggle логика - ако е 100% връщаме един назад, иначе добавяме един
            boolean wasMaxed = session.getShippedItems().equals(session.getTotalItems());
            int newShippedItems = wasMaxed ? session.getShippedItems() - 1 : session.getShippedItems() + 1;

            // Обнови shipped items и heartbeat в една операция
            shippedProcessRepository.updateShippedItems(sessionId, newShippedItems);
            shippedProcessRepository.updateHeartbeat(sessionId, LocalDateTime.now());

            return Map.of(
                    "success", true,
                    "isLoaded", !wasMaxed,
                    "shippedItems", newShippedItems,
                    "totalItems", session.getTotalItems(),
                    "message", "Статус обновен успешно"
            );

        } catch (Exception e) {
            log.error("Грешка при toggle на артикул {} в session {}: {}", itemId, sessionId, e.getMessage());
            throw e;
        }
    }

    @Override
    public Map<String, Object> completeLoading(Long sessionId) {
        try {
            // Намери активната session
            ShippedProcessEntity session = shippedProcessRepository.findById(sessionId)
                    .orElseThrow(() -> new RuntimeException("Активна session не е намерена"));

            // AUTHORIZATION ПРОВЕРКА - само активният служител може да завърши
            String currentUsername = userService.getCurrentUser().getUsername();
            if (!session.getEmployeeUsername().equals(currentUsername)) {
                throw new RuntimeException("Само " + session.getEmployeeUsername() + " може да завърши товаренето");
            }

            // Проверка дали всички артикули са заредени
            if (!session.getShippedItems().equals(session.getTotalItems())) {
                throw new RuntimeException("Не всички артикули са маркирани като заредени");
            }

            // Намери поръчката за финализиране
            Order order = orderRepository.findById(session.getOrderId())
                    .orElseThrow(() -> new RuntimeException("Поръчката не е намерена"));

            // Изчисли времето за товарене
            LocalDateTime startTime = session.getStartedAt();
            LocalDateTime endTime = LocalDateTime.now();
            long durationSeconds = Duration.between(startTime, endTime).getSeconds();

            // Финализирай поръчката като SHIPPED
            order.setStatus(OrderStatus.SHIPPED);
            order.setShippedAt(endTime);
            order.setShippingDurationSeconds((int) durationSeconds);
            orderRepository.save(order);

            // Изчисти временната session - товаренето е завършено
            shippedProcessRepository.deleteByOrderId(session.getOrderId());

            return Map.of(
                    "success", true,
                    "orderId", session.getOrderId(),
                    "totalDuration", durationSeconds,
                    "message", "Товарене завършено успешно"
            );

        } catch (Exception e) {
            log.error("Грешка при завършване на товарене за session {}: {}", sessionId, e.getMessage());
            throw e;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getLoadingStatus(Long orderId) {
        Optional<ShippedProcessEntity> sessionOpt = shippedProcessRepository.findByOrderId(orderId);

        if (sessionOpt.isEmpty()) {
            return Map.of("hasActiveSession", false);
        }

        ShippedProcessEntity session = sessionOpt.get();
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
                        "employeeUsername", session.getEmployeeUsername(),
                        "truckNumber", order != null ? order.getTruckNumber() : "Неизвестен"
                )
        );
    }

    @Override
    public void updateHeartbeat(Long sessionId) {
        try {
            shippedProcessRepository.updateHeartbeat(sessionId, LocalDateTime.now());
        } catch (Exception e) {
            log.error("Грешка при обновяване на heartbeat за session {}: {}", sessionId, e.getMessage());
        }
    }

    @Override
    public int detectLostConnectionSessions(int thresholdMinutes) {
        try {
            LocalDateTime threshold = LocalDateTime.now().minusMinutes(thresholdMinutes);
            return shippedProcessRepository.markLostSignalSessions(threshold);
        } catch (Exception e) {
            log.error("Грешка при откриване на загубени sessions: {}", e.getMessage());
            return 0;
        }
    }

    @Override
    public int cleanupAbandonedSessions(int maxAgeHours) {
        try {
            LocalDateTime threshold = LocalDateTime.now().minusHours(maxAgeHours);
            return shippedProcessRepository.deleteOldLostSessions(threshold);
        } catch (Exception e) {
            log.error("Грешка при изчистване на стари sessions: {}", e.getMessage());
            return 0;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getActiveLoadingProgress() {
        try {
            List<Object[]> rawData = shippedProcessRepository.findActiveSessionProgress();

            return rawData.stream()
                    .map(row -> {
                        Integer shipped = (Integer) row[1];
                        Integer total = (Integer) row[2];
                        int percentage = (total != null && total > 0) ? Math.round((float) shipped / total * 100) : 0;

                        // Използваме HashMap за избягване на generic type inference проблеми
                        Map<String, Object> result = new HashMap<>();
                        result.put("orderId", (Long) row[0]);
                        result.put("shippedItems", shipped != null ? shipped : 0);
                        result.put("totalItems", total != null ? total : 0);
                        result.put("completionPercentage", percentage);
                        return result;
                    })
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Грешка при получаване на прогрес данни: {}", e.getMessage());
            return List.of();
        }
    }

    @Override
    @Transactional(readOnly = true)
    public long getActiveLoadingSessionsCount() {
        try {
            return shippedProcessRepository.countActiveSessions();
        } catch (Exception e) {
            log.error("Грешка при броене на активни sessions: {}", e.getMessage());
            return 0;
        }
    }

    @Override
    public UserEntity getEmployer(Long orderId) {
        Optional<ShippedProcessEntity> currentOrder = shippedProcessRepository.findByOrderId(orderId);
        UserEntity employer = new UserEntity();

        if (currentOrder.isPresent()) {
           Optional<UserEntity> employerOpt = userRepository.findByUsername(currentOrder.get().getEmployeeUsername());
            if (employerOpt.isPresent()){
                employer = employerOpt.get();
                return employer;
            }
        }
        return null;
    }
}