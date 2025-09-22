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
        dto.setShippedAt(order.getShippedAt());
        dto.setShippingNotes(order.getShippingNotes());

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

            // Изчисляване на totalItems, loadedItems, remainingItems, completionPercentage, isFullyLoaded
            int totalItems = itemDTOs.stream()
                    .mapToInt(item -> item.getQuantity() != null ? item.getQuantity().intValue() : 0)
                    .sum();
            int loadedItems = itemDTOs.stream()
                    .mapToInt(item -> item.getLoaded() != null && item.getLoaded() ? item.getQuantity().intValue() : 0)
                    .sum();
            dto.setTotalItems(totalItems);
            dto.setLoadedItems(loadedItems);
            dto.setRemainingItems(totalItems - loadedItems);
            dto.setCompletionPercentage(totalItems > 0 ? (double) loadedItems / totalItems * 100 : 0.0);
            dto.setIsFullyLoaded(loadedItems == totalItems);
        } else {
            dto.setItems(Collections.emptyList());
            dto.setItemsCount(0);
            dto.setTotalItems(0);
            dto.setLoadedItems(0);
            dto.setRemainingItems(0);
            dto.setCompletionPercentage(0.0);
            dto.setIsFullyLoaded(false);
        }

        // Calculated поле
        dto.setTimeAgo(formatTimeAgo(order.getSubmittedAt()));

        return dto;
    }

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
                dto.setCategory(orderItem.getProduct().getCategory());
                Integer availableStock = orderItem.getProduct().getQuantityAvailable();
                dto.setAvailableStock(availableStock != null ? availableStock : 0);
                boolean hasStockIssue = orderItem.getQty() != null &&
                        availableStock != null &&
                        orderItem.getQty().intValue() > availableStock;
                dto.setHasStockIssue(hasStockIssue);
            } catch (Exception e) {
                dto.setProductId(null);
                dto.setProductSku("N/A");
                dto.setProductName("Продуктът не е достъпен");
                dto.setCategory("Неизвестна");
                dto.setAvailableStock(0);
                dto.setHasStockIssue(true);
            }
        } else {
            dto.setProductId(null);
            dto.setProductSku("N/A");
            dto.setProductName("Неизвестен продукт");
            dto.setCategory("Неизвестна");
            dto.setAvailableStock(0);
            dto.setHasStockIssue(true);
        }

        return dto;
    }

    public List<OrderDTO> toDTOList(List<Order> orders) {
        if (orders == null || orders.isEmpty()) {
            return Collections.emptyList();
        }

        return orders.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public OrderDTO toMinimalDTO(Order order) {
        if (order == null) {
            return null;
        }

        OrderDTO dto = new OrderDTO();
        dto.setId(order.getId());
        dto.setStatus(order.getStatus() != null ? order.getStatus().name() : "UNKNOWN");
        dto.setTotalGross(order.getTotalGross() != null ? order.getTotalGross() : BigDecimal.ZERO);
        dto.setSubmittedAt(order.getSubmittedAt());
        dto.setClientId(null);
        dto.setClientName("Грешка при зареждане на данните");
        dto.setItemsCount(0);
        dto.setItems(Collections.emptyList());
        dto.setTimeAgo("Неизвестно");
        return dto;
    }

    private String formatTimeAgo(LocalDateTime submittedAt) {
        if (submittedAt == null) {
            return "Неизвестно";
        }

        try {
            LocalDateTime now = LocalDateTime.now();
            long minutes = ChronoUnit.MINUTES.between(submittedAt, now);
            long hours = ChronoUnit.HOURS.between(submittedAt, now);
            long days = ChronoUnit.DAYS.between(submittedAt, now);

            if (minutes < 60) {
                return minutes + "мин";
            } else if (hours < 24) {
                return hours + "ч";
            } else if (days < 30) {
                return days + "д";
            } else {
                return submittedAt.format(DateTimeFormatter.ofPattern("dd.MM.yy"));
            }
        } catch (Exception e) {
            return "Неизвестно";
        }
    }

    public boolean isFullyLoaded(Order order) {
        if (order == null) {
            return false;
        }

        try {
            if (order.getClient() != null) {
                order.getClient().getUsername();
            }
            if (order.getItems() != null) {
                order.getItems().size();
                for (OrderItem item : order.getItems()) {
                    if (item.getProduct() != null) {
                        item.getProduct().getName();
                    }
                }
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

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

        System.out.printf("Mapping %s: %d orders total, %d fully loaded, %d partially loaded%n",
                operation, orders.size(), fullyLoaded, partiallyLoaded);
    }
}