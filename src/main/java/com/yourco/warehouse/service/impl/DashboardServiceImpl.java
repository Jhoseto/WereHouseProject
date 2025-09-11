package com.yourco.warehouse.service.impl;

import com.yourco.warehouse.dto.DashboardDTO;
import com.yourco.warehouse.dto.OrderDTO;
import com.yourco.warehouse.entity.Order;
import com.yourco.warehouse.entity.enums.OrderStatus;
import com.yourco.warehouse.mapper.OrderMapper;
import com.yourco.warehouse.repository.OrderRepository;
import com.yourco.warehouse.service.DashboardService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * DASHBOARD SERVICE IMPLEMENTATION
 * =================================
 * Опростена версия с едно унифицирано DTO.
 */
@Service
@Transactional(readOnly = true)
public class DashboardServiceImpl implements DashboardService {

    private static final Logger log = LoggerFactory.getLogger(DashboardServiceImpl.class);

    private final OrderRepository orderRepository;
    private final OrderMapper orderMapper;

    @Autowired
    public DashboardServiceImpl(OrderRepository orderRepository,
                                OrderMapper orderMapper) {
        this.orderRepository = orderRepository;
        this.orderMapper = orderMapper;
    }

    @Override
    public DashboardDTO getFullDashboard() {
        try {
            DashboardDTO dashboard = new DashboardDTO();

            // Основни броячи
            dashboard.setUrgentCount(orderRepository.countByStatus(OrderStatus.SUBMITTED));
            dashboard.setPendingCount(orderRepository.countByStatus(OrderStatus.CONFIRMED));
            dashboard.setCompletedCount(orderRepository.countByStatus(OrderStatus.SHIPPED));
            dashboard.setCancelledCount(orderRepository.countByStatus(OrderStatus.CANCELLED));

            // Hastigent alerts
            dashboard.setHasUrgentAlerts(dashboard.getUrgentCount() > 0);

            // Днешни статистики
            LocalDateTime startOfDay = LocalDateTime.now().with(LocalTime.MIN);
            LocalDateTime endOfDay = LocalDateTime.now().with(LocalTime.MAX);

//            dashboard.setProcessed(getTodayProcessed(startOfDay, endOfDay));
//            dashboard.setRevenue(getTodayRevenue(startOfDay, endOfDay));
//            dashboard.setAvgTime("2.1ч");
//            dashboard.setActiveClients(getTodayClients(startOfDay, endOfDay));

            dashboard.setMessage("Dashboard данните са заредени успешно");
            return dashboard;

        } catch (Exception e) {
            log.error("Грешка при зареждане на dashboard данни", e);
            return new DashboardDTO("Възникна грешка при зареждане на данните");
        }
    }

    @Override
    public DashboardDTO getCounters() {
        try {
            DashboardDTO dashboard = new DashboardDTO();

            dashboard.setUrgentCount(orderRepository.countByStatus(OrderStatus.SUBMITTED));
            dashboard.setPendingCount(orderRepository.countByStatus(OrderStatus.CONFIRMED));
            dashboard.setCompletedCount(orderRepository.countByStatus(OrderStatus.SHIPPED));
            dashboard.setCancelledCount(orderRepository.countByStatus(OrderStatus.CANCELLED));

            dashboard.setHasUrgentAlerts(dashboard.getUrgentCount() > 0);
            dashboard.setMessage("Броячите са обновени");
            return dashboard;

        } catch (Exception e) {
            log.error("Грешка при зареждане на броячи", e);
            return new DashboardDTO("Грешка при обновяване на броячите");
        }
    }

    @Override
    public DashboardDTO getOrdersByStatus(OrderStatus status, int limit) {
        try {
            List<Order> orders = orderRepository.findByStatusOrderBySubmittedAtDesc(status)
                    .stream().limit(limit).toList();

            List<OrderDTO> orderDTOs = orders.stream()
                    .map(orderMapper::toDTO)
                    .toList();

            DashboardDTO dashboard = new DashboardDTO();
            dashboard.setOrders(orderDTOs);
            dashboard.setMessage(String.format("Намерени са %d поръчки със статус %s", orderDTOs.size(), status.name()));

            return dashboard;

        } catch (Exception e) {
            log.error("Грешка при зареждане на поръчки по статус", e);
            return new DashboardDTO("Грешка при зареждане на поръчките");
        }
    }


}