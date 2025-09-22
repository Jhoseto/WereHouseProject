package com.yourco.warehouse.service.impl;

import com.yourco.warehouse.dto.DashboardDTO;
import com.yourco.warehouse.entity.Order;
import com.yourco.warehouse.entity.enums.OrderStatus;
import com.yourco.warehouse.mapper.OrderMapper;
import com.yourco.warehouse.repository.OrderRepository;
import com.yourco.warehouse.service.DashboardService;
import com.yourco.warehouse.service.OrderShippingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class OrderShippingServiceImpl implements OrderShippingService {

    private static final Logger log = LoggerFactory.getLogger(OrderShippingServiceImpl.class);

    private final OrderRepository orderRepository;
    private final OrderMapper orderMapper;
    private final DashboardService dashboardService;

    @Autowired
    public OrderShippingServiceImpl(OrderRepository orderRepository,
                                    OrderMapper orderMapper,
                                    DashboardService dashboardService) {
        this.orderRepository = orderRepository;
        this.orderMapper = orderMapper;
        this.dashboardService = dashboardService;
    }

    @Override
    public DashboardDTO loadShippingOrderData(Long orderId) {
        try {
            log.debug("Loading shipping data for order: {}", orderId);

            // Използваме съществуващия метод от DashboardService
            DashboardDTO orderDetails = dashboardService.getOrderDetails(orderId);

            if (!orderDetails.getSuccess()) {
                return orderDetails;
            }

            // Допълнителна валидация за shipping
            DashboardDTO validation = validateOrderForShipping(orderId);
            if (!validation.getSuccess()) {
                return validation;
            }

            // Обогатяваме response-а с shipping-specific данни
            orderDetails.setMessage("Данните за shipping са заредени успешно");

            return orderDetails;

        } catch (Exception e) {
            log.error("Грешка при зареждане на shipping данни за поръчка {}", orderId, e);
            return new DashboardDTO("Грешка при зареждане на shipping данните: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public DashboardDTO confirmOrderShipping(Long orderId, String truckNumber, String shippingNote) {
        try {
            log.debug("Confirming shipping for order: {} with truck: {}", orderId, truckNumber);

            Optional<Order> orderOpt = orderRepository.findById(orderId);
            if (orderOpt.isEmpty()) {
                return new DashboardDTO("Поръчката не е намерена");
            }

            Order order = orderOpt.get();

            // Проверка на статуса - само CONFIRMED поръчки могат да се ship-ват
            if (order.getStatus() != OrderStatus.CONFIRMED) {
                return new DashboardDTO("Поръчката трябва да е потвърдена преди изпращане. Текущ статус: " + order.getStatus());
            }

            // Валидация на truck number
            if (truckNumber == null || truckNumber.trim().isEmpty()) {
                return new DashboardDTO("Номерът на камиона е задължителен");
            }

            // Променяме статуса към SHIPPED
            order.setStatus(OrderStatus.SHIPPED);
            order.setShippedAt(LocalDateTime.now());

            // Compose shipping notes
            StringBuilder finalNote = new StringBuilder();
            finalNote.append("Изпратена с камион: ").append(truckNumber.trim());

            if (shippingNote != null && !shippingNote.trim().isEmpty()) {
                finalNote.append("\nБележка: ").append(shippingNote.trim());
            }

            order.setShippingNotes(finalNote.toString());

            // Запазваме промените
            orderRepository.save(order);

            log.info("Order {} successfully shipped with truck {}", orderId, truckNumber);

            DashboardDTO response = new DashboardDTO();
            response.setSuccess(true);
            response.setMessage("Поръчката е успешно маркирана като изпратена");

            return response;

        } catch (Exception e) {
            log.error("Грешка при потвърждаване на изпращане за поръчка {}", orderId, e);
            return new DashboardDTO("Грешка при изпращане: " + e.getMessage());
        }
    }

    @Override
    public DashboardDTO validateOrderForShipping(Long orderId) {
        try {
            Optional<Order> orderOpt = orderRepository.findById(orderId);
            if (orderOpt.isEmpty()) {
                return new DashboardDTO("Поръчката не е намерена");
            }

            Order order = orderOpt.get();

            // Проверка на статуса
            if (order.getStatus() != OrderStatus.CONFIRMED) {
                DashboardDTO response = new DashboardDTO("Поръчката не е готова за изпращане. Статус: " + order.getStatus());
                response.setSuccess(false);
                return response;
            }

            // Проверка дали има items
            if (order.getItems() == null || order.getItems().isEmpty()) {
                DashboardDTO response = new DashboardDTO("Поръчката няма артикули за изпращане");
                response.setSuccess(false);
                return response;
            }

            DashboardDTO response = new DashboardDTO();
            response.setSuccess(true);
            response.setMessage("Поръчката е готова за изпращане");

            return response;

        } catch (Exception e) {
            log.error("Грешка при валидация за shipping на поръчка {}", orderId, e);
            DashboardDTO response = new DashboardDTO("Грешка при валидация: " + e.getMessage());
            response.setSuccess(false);
            return response;
        }
    }
}