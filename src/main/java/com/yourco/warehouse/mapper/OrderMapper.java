package com.yourco.warehouse.mapper;

import com.yourco.warehouse.dto.OrderDTO;
import com.yourco.warehouse.dto.OrderItemDTO;
import com.yourco.warehouse.entity.Order;
import com.yourco.warehouse.entity.OrderItem;
import com.yourco.warehouse.entity.UserEntity;
import com.yourco.warehouse.repository.UserRepository;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;


@Component
public class OrderMapper {

    private final UserRepository userRepository;

    public OrderMapper(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public OrderDTO toDTO(Order order) {
        if (order == null) return null;

        OrderDTO dto = new OrderDTO();

        // Основни полета
        dto.setId(order.getId());
        dto.setStatus(order.getStatus().name());
        dto.setNotes(order.getNotes());
        dto.setSubmittedAt(order.getSubmittedAt());
        dto.setConfirmedAt(order.getConfirmedAt());

        // Финансови данни
        dto.setTotalNet(order.getTotalNet());
        dto.setTotalVat(order.getTotalVat());
        dto.setTotalGross(order.getTotalGross());

        // Client данни
        UserEntity client = order.getClient();
        if (client != null) {
            dto.setClientId(client.getId());
            dto.setClientName(client.getUsername());
            dto.setClientCompany(client.getCompanyName());
            dto.setClientPhone(client.getPhone());
            dto.setClientLocation(client.getLocation());
        }

        // Items данни
        if (order.getItems() != null) {
            List<OrderItemDTO> itemDTOs = order.getItems().stream()
                    .map(this::toItemDTO)
                    .collect(Collectors.toList());
            dto.setItems(itemDTOs);
            dto.setItemsCount(itemDTOs.size());
        } else {
            dto.setItems(Collections.emptyList());
            dto.setItemsCount(0);
        }

        // Calculated полета
        dto.setTimeAgo(formatTimeAgo(order.getSubmittedAt()));

        return dto;
    }

    /**
     * Конвертира OrderItem entity в OrderItemDTO
     *
     * @param orderItem OrderItem entity
     * @return OrderItemDTO готов за JSON сериализация
     */
    public OrderItemDTO toItemDTO(OrderItem orderItem) {
        if (orderItem == null) {
            return null;
        }

        OrderItemDTO dto = new OrderItemDTO();

        // Основни данни за item-а
        dto.setQuantity(orderItem.getQty());
        dto.setUnit(orderItem.getProduct().getUnit());
        dto.setPrice(orderItem.getUnitPrice());
        dto.setAvailableQuantity(orderItem.getProduct().getQuantityAvailable());

        // Изчисляваме total price за този item
        if (orderItem.getQty() != null && orderItem.getUnitPrice() != null) {
            BigDecimal totalPrice = orderItem.getUnitPrice()
                    .multiply(orderItem.getQty());
            dto.setTotalPrice(totalPrice);
        } else {
            dto.setTotalPrice(BigDecimal.ZERO);
        }

        // Product данни - safely handle potential lazy loading
        if (orderItem.getProduct() != null) {
            try {
                dto.setProductId(orderItem.getProduct().getId());
                dto.setProductSku(orderItem.getProduct().getSku());
                dto.setProductName(orderItem.getProduct().getName());

                // Добавяме category mapping
                dto.setCategory(orderItem.getProduct().getCategory());

                // Stock информация
                Integer availableStock = orderItem.getProduct().getQuantityAvailable();
                dto.setAvailableStock(availableStock != null ? availableStock : 0);

                // Проверяваме за stock issues
                boolean hasStockIssue = orderItem.getQty() != null &&
                        availableStock != null &&
                        orderItem.getQty().intValue() > availableStock;
                dto.setHasStockIssue(hasStockIssue);

            } catch (Exception e) {
                // Fallback ако има lazy loading проблеми с product
                dto.setProductId(null);
                dto.setProductSku("N/A");
                dto.setProductName("Продуктът не е достъпен");
                dto.setCategory("Неизвестна"); // ✅ НОВО: fallback за category
                dto.setAvailableStock(0);
                dto.setHasStockIssue(true);
            }
        } else {
            dto.setProductId(null);
            dto.setProductSku("N/A");
            dto.setProductName("Неизвестен продукт");
            dto.setCategory("Неизвестна"); // ✅ НОВО: fallback за category
            dto.setAvailableStock(0);
            dto.setHasStockIssue(true);
        }

        return dto;
    }

    /**
     * Конвертира списък от Order entities в списък от OrderDTOs
     *
     * @param orders списък с Order entities
     * @return списък с OrderDTOs
     */
    public List<OrderDTO> toDTOList(List<Order> orders) {
        if (orders == null || orders.isEmpty()) {
            return Collections.emptyList();
        }

        return orders.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Създава минимален OrderDTO при грешки
     * Използва се като fallback когато пълното конвертиране не е възможно
     *
     * @param order Order entity (може да е частично зареден)
     * @return минимален OrderDTO с основни данни
     */
    public OrderDTO toMinimalDTO(Order order) {
        if (order == null) {
            return null;
        }

        OrderDTO dto = new OrderDTO();

        // Само най-основните данни които винаги са достъпни
        dto.setId(order.getId());
        dto.setStatus(order.getStatus() != null ? order.getStatus().name() : "UNKNOWN");
        dto.setTotalGross(order.getTotalGross() != null ? order.getTotalGross() : BigDecimal.ZERO);
        dto.setSubmittedAt(order.getSubmittedAt());

        // Safe fallback стойности
        dto.setClientId(null);
        dto.setClientName("Грешка при зареждане на данните");
        dto.setItemsCount(0);
        dto.setItems(Collections.emptyList());
        dto.setTimeAgo("Неизвестно");

        return dto;
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    /**
     * Форматира време в user-friendly формат
     * Примери: "5мин", "2ч", "3д"
     *
     * @param submittedAt времето на подаване на поръчката
     * @return форматиран string за показване в UI
     */
    private String formatTimeAgo(LocalDateTime submittedAt) {
        if (submittedAt == null) {
            return "Неизвестно";
        }

        try {
            LocalDateTime now = LocalDateTime.now();

            // Изчисляваме разликата в различни единици
            long minutes = ChronoUnit.MINUTES.between(submittedAt, now);
            long hours = ChronoUnit.HOURS.between(submittedAt, now);
            long days = ChronoUnit.DAYS.between(submittedAt, now);

            // Връщаме най-подходящия формат
            if (minutes < 60) {
                return minutes + "мин";
            } else if (hours < 24) {
                return hours + "ч";
            } else if (days < 30) {
                return days + "д";
            } else {
                // За по-стари поръчки показваме датата
                return submittedAt.format(DateTimeFormatter.ofPattern("dd.MM.yy"));
            }

        } catch (Exception e) {
            return "Неизвестно";
        }
    }

    /**
     * Валидира дали Order entity има всички необходими данни за пълно конвертиране
     * Използва се за диагностика на lazy loading проблеми
     *
     * @param order Order entity за проверка
     * @return true ако всички данни са достъпни
     */
    public boolean isFullyLoaded(Order order) {
        if (order == null) {
            return false;
        }

        try {
            // Опитваме се да достъпим всички lazy-loaded properties
            if (order.getClient() != null) {
                order.getClient().getUsername(); // Trigger lazy loading
            }

            if (order.getItems() != null) {
                order.getItems().size(); // Trigger collection loading

                // Проверяваме и продуктите в items
                for (OrderItem item : order.getItems()) {
                    if (item.getProduct() != null) {
                        item.getProduct().getName(); // Trigger product loading
                    }
                }
            }

            return true;

        } catch (Exception e) {
            // Ако получим lazy initialization exception, данните не са пълни
            return false;
        }
    }

    /**
     * Логва статистика за mapping операция
     * Полезно за debugging и performance monitoring
     *
     * @param orders списък с orders които са били mapped
     * @param operation описание на операцията
     */
    public void logMappingStats(List<Order> orders, String operation) {
        if (orders == null) {
            return;
        }

        int fullyLoaded = 0;
        int partiallyLoaded = 0;

        for (Order order : orders) {
            if (isFullyLoaded(order)) {
                fullyLoaded++;
            } else {
                partiallyLoaded++;
            }
        }

        // В production можем да log-ваме това в metrics системата
        System.out.printf("Mapping %s: %d orders total, %d fully loaded, %d partially loaded%n",
                operation, orders.size(), fullyLoaded, partiallyLoaded);
    }
}