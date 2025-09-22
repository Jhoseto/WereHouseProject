package com.yourco.warehouse.service.impl;

import com.yourco.warehouse.dto.DashboardDTO;
import com.yourco.warehouse.dto.OrderDTO;
import com.yourco.warehouse.entity.Order;
import com.yourco.warehouse.entity.enums.OrderStatus;
import com.yourco.warehouse.mapper.OrderMapper;
import com.yourco.warehouse.repository.OrderRepository;
import com.yourco.warehouse.service.OrderShippingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * ORDER SHIPPING SERVICE IMPLEMENTATION
 * Следва същия pattern като DashboardServiceImpl
 */

@Service
public class OrderShippingServiceImpl implements OrderShippingService {

    // Constructor injection както в DashboardServiceImpl
    private final OrderRepository orderRepository;
    private final OrderMapper orderMapper;


    @Autowired
    public OrderShippingServiceImpl(OrderRepository orderRepository,
                                    OrderMapper orderMapper) {
        this.orderRepository = orderRepository;
        this.orderMapper = orderMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardDTO getOrderDetails(Long orderId) {
        try {

            Optional<Order> orderOpt = orderRepository.findByIdWithItems(orderId);
            if (orderOpt.isEmpty()) {
                return new DashboardDTO("Поръчката не е намерена");
            }

            Order order = orderOpt.get();
            OrderDTO orderDTO = orderMapper.toDTO(order);

            DashboardDTO response = new DashboardDTO();
            response.setSuccess(true);
            response.setOrder(orderDTO);
            response.setMessage("Shipping детайлите са заредени успешно");

            return response;

        } catch (Exception e) {
            return new DashboardDTO("Грешка при зареждане на shipping детайлите: " + e.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardDTO getShippingProgress(Long orderId) {
        try {

            Optional<Order> orderOpt = orderRepository.findById(orderId);
            if (orderOpt.isEmpty()) {
                return new DashboardDTO("Поръчката не е намерена");
            }

            Order order = orderOpt.get();

            DashboardDTO response = new DashboardDTO();
            response.setSuccess(true);

            // Създаваме shipping progress данни
            Map<String, Object> progress = new HashMap<>();
            progress.put("orderId", orderId);
            progress.put("currentStatus", order.getStatus().name());
            progress.put("processedAt", order.getProcessedAt());
            progress.put("shippedAt", order.getShippedAt());
            progress.put("currentStep", determineShippingStep(order));
            progress.put("completionPercentage", calculateCompletionPercentage(order));
            progress.put("timestamp", LocalDateTime.now());

            response.setShippingProgress(progress);
            response.setMessage("Shipping progress зареден успешно");

            return response;

        } catch (Exception e) {
            return new DashboardDTO("Грешка при зареждане на прогреса: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public DashboardDTO updateItemLoadingStatus(Long orderId, Long itemId, Boolean isLoaded, String notes) {
        try {

            Optional<Order> orderOpt = orderRepository.findById(orderId);
            if (orderOpt.isEmpty()) {
                return new DashboardDTO("Поръчката не е намерена");
            }

            Order order = orderOpt.get();
            String currentNotes = order.getShippingNotes() != null ? order.getShippingNotes() : "";
            String newNote = String.format("Item %d %s at %s", itemId,
                    isLoaded ? "loaded" : "unloaded", LocalDateTime.now());
            if (notes != null && !notes.trim().isEmpty()) {
                newNote += " - " + notes;
            }

            order.setShippingNotes(currentNotes + "\n" + newNote);
            orderRepository.save(order);

            DashboardDTO response = new DashboardDTO();
            response.setSuccess(true);
            response.setMessage("Item loading status обновен успешно");

            return response;

        } catch (Exception e) {
            return new DashboardDTO("Грешка при обновяване на статуса на артикула: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public DashboardDTO batchUpdateItemsLoadingStatus(Long orderId, List<Map<String, Object>> itemUpdates) {
        try {

            Optional<Order> orderOpt = orderRepository.findById(orderId);
            if (orderOpt.isEmpty()) {
                return new DashboardDTO("Поръчката не е намерена");
            }

            Order order = orderOpt.get();
            StringBuilder batchNotes = new StringBuilder();
            batchNotes.append("Batch update at ").append(LocalDateTime.now()).append(":\n");

            for (Map<String, Object> update : itemUpdates) {
                Long itemId = Long.valueOf(update.get("itemId").toString());
                Boolean isLoaded = (Boolean) update.get("isLoaded");
                String notes = (String) update.get("notes");

                batchNotes.append(String.format("- Item %d: %s", itemId, isLoaded ? "loaded" : "unloaded"));
                if (notes != null && !notes.trim().isEmpty()) {
                    batchNotes.append(" (").append(notes).append(")");
                }
                batchNotes.append("\n");
            }

            String currentNotes = order.getShippingNotes() != null ? order.getShippingNotes() : "";
            order.setShippingNotes(currentNotes + "\n" + batchNotes.toString());
            orderRepository.save(order);

            DashboardDTO response = new DashboardDTO();
            response.setSuccess(true);
            response.setMessage("Items loading status обновен успешно в batch режим");

            return response;

        } catch (Exception e) {
            return new DashboardDTO("Грешка при batch обновяване на артикулите: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public DashboardDTO markOrderAsShipped(Long orderId, String shippingNotes) {
        try {

            Optional<Order> orderOpt = orderRepository.findById(orderId);
            if (orderOpt.isEmpty()) {
                return new DashboardDTO("Поръчката не е намерена");
            }

            Order order = orderOpt.get();

            if (order.getStatus() != OrderStatus.CONFIRMED) {
                return new DashboardDTO("Поръчката трябва да бъде потвърдена преди да може да се изпрати");
            }

            order.setStatus(OrderStatus.SHIPPED);
            order.setShippedAt(LocalDateTime.now());

            if (shippingNotes != null && !shippingNotes.trim().isEmpty()) {
                String currentNotes = order.getShippingNotes() != null ? order.getShippingNotes() : "";
                order.setShippingNotes(currentNotes + "\nFinal shipping note: " + shippingNotes);
            }

            orderRepository.save(order);

            DashboardDTO response = new DashboardDTO();
            response.setSuccess(true);
            response.setMessage("Поръчката е успешно маркирана като изпратена");

            return response;

        } catch (Exception e) {
            log.error("Грешка при маркиране на поръчка {} като изпратена", orderId, e);
            return new DashboardDTO("Грешка при маркиране като изпратена: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public DashboardDTO cancelShipping(Long orderId, String reason) {
        try {

            if (reason == null || reason.trim().isEmpty()) {
                return new DashboardDTO("Причината за отмяна е задължителна");
            }

            Optional<Order> orderOpt = orderRepository.findById(orderId);
            if (orderOpt.isEmpty()) {
                return new DashboardDTO("Поръчката не е намерена");
            }

            Order order = orderOpt.get();
            String currentNotes = order.getShippingNotes() != null ? order.getShippingNotes() : "";
            String cancellationNote = String.format("\nShipping cancelled at %s: %s", LocalDateTime.now(), reason);
            order.setShippingNotes(currentNotes + cancellationNote);

            orderRepository.save(order);

            DashboardDTO response = new DashboardDTO();
            response.setSuccess(true);
            response.setMessage("Shipping процесът е отменен: " + reason);

            return response;

        } catch (Exception e) {
            return new DashboardDTO("Грешка при отмяна на shipping-а: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public DashboardDTO addShippingNote(Long orderId, String note) {
        try {

            if (note == null || note.trim().isEmpty()) {
                return new DashboardDTO("Бележката не може да бъде празна");
            }

            Optional<Order> orderOpt = orderRepository.findById(orderId);
            if (orderOpt.isEmpty()) {
                return new DashboardDTO("Поръчката не е намерена");
            }

            Order order = orderOpt.get();
            String currentNotes = order.getShippingNotes() != null ? order.getShippingNotes() : "";
            String timestampedNote = String.format("\n[%s] %s", LocalDateTime.now(), note);
            order.setShippingNotes(currentNotes + timestampedNote);

            orderRepository.save(order);

            DashboardDTO response = new DashboardDTO();
            response.setSuccess(true);
            response.setMessage("Shipping бележката е добавена успешно");

            return response;

        } catch (Exception e) {
            return new DashboardDTO("Грешка при добавяне на бележката: " + e.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardDTO validateOrderForShipping(Long orderId) {
        try {

            Optional<Order> orderOpt = orderRepository.findByIdWithItems(orderId);
            if (orderOpt.isEmpty()) {
                return new DashboardDTO("Поръчката не е намерена");
            }

            Order order = orderOpt.get();
            List<String> validationErrors = new ArrayList<>();

            if (order.getStatus() != OrderStatus.CONFIRMED) {
                validationErrors.add("Поръчката трябва да бъде потвърдена преди изпращане");
            }

            if (order.getItems() == null || order.getItems().isEmpty()) {
                validationErrors.add("Поръчката няма артикули");
            }

            DashboardDTO response = new DashboardDTO();
            response.setSuccess(validationErrors.isEmpty());

            if (validationErrors.isEmpty()) {
                response.setMessage("Поръчката е валидна за изпращане");
            } else {
                response.setMessage("Validation грешки: " + String.join(", ", validationErrors));
            }

            return response;

        } catch (Exception e) {
            return new DashboardDTO("Грешка при валидация: " + e.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardDTO getShippingStatistics(String timeframe) {
        try {

            DashboardDTO response = new DashboardDTO();
            response.setSuccess(true);

            // Basic statistics - може да се разшири
            Map<String, Object> stats = new HashMap<>();
            stats.put("timeframe", timeframe);
            stats.put("totalShipped", 0);
            stats.put("totalPending", 0);
            stats.put("timestamp", LocalDateTime.now());

            response.setShippingStats(stats);
            response.setMessage("Shipping статистиките са заредени");

            return response;

        } catch (Exception e) {
            return new DashboardDTO("Грешка при зареждане на статистиките: " + e.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardDTO getOrdersReadyForShipping(Integer limit, Integer offset) {
        try {

            // Търсим CONFIRMED поръчки които са готови за изпращане
            List<Order> readyOrders = orderRepository.findByStatusOrderBySubmittedAtDesc(OrderStatus.CONFIRMED)
                    .stream()
                    .skip(offset != null ? offset : 0)
                    .limit(limit != null ? limit : 20)
                    .toList();

            List<OrderDTO> orderDTOs = readyOrders.stream()
                    .map(orderMapper::toDTO)
                    .toList();

            DashboardDTO response = new DashboardDTO();
            response.setSuccess(true);
            response.setOrders(orderDTOs);
            response.setMessage(String.format("Намерени са %d поръчки готови за изпращане", orderDTOs.size()));

            return response;

        } catch (Exception e) {
            return new DashboardDTO("Грешка при зареждане на готовите поръчки: " + e.getMessage());
        }
    }

    // ==========================================
    // HELPER METHODS
    // ==========================================

    private String determineShippingStep(Order order) {
        if (order.getShippedAt() != null) {
            return "shipped";
        } else if (order.getProcessedAt() != null) {
            return "loading";
        } else if (order.getStatus() == OrderStatus.CONFIRMED) {
            return "preparation";
        } else {
            return "pending";
        }
    }

    private Integer calculateCompletionPercentage(Order order) {
        if (order.getShippedAt() != null) {
            return 100;
        } else if (order.getProcessedAt() != null) {
            return 75;
        } else if (order.getStatus() == OrderStatus.CONFIRMED) {
            return 50;
        } else {
            return 0;
        }
    }
}