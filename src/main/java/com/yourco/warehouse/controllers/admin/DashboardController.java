package com.yourco.warehouse.controllers.admin;

import com.yourco.warehouse.entity.enums.OrderStatus;
import com.yourco.warehouse.repository.OrderRepository;
import com.yourco.warehouse.service.OrderService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.math.BigDecimal;

@Controller
@RequestMapping("/admin")
public class DashboardController {
    private final OrderService orderService;
    private final OrderRepository orderRepository;

    public DashboardController(OrderService orderService, OrderRepository orderRepository) {
        this.orderService = orderService;
        this.orderRepository = orderRepository;
    }

    @GetMapping("")
    public String dashboard(Model model) {
        // Основни статистики
        long submittedCount = orderRepository.countByStatus(OrderStatus.SUBMITTED);
        long confirmedCount = orderRepository.countByStatus(OrderStatus.CONFIRMED);
        long shippedCount = orderRepository.countByStatus(OrderStatus.SHIPPED);
        long cancelledCount = orderRepository.countByStatus(OrderStatus.CANCELLED);
        long totalOrders = submittedCount + confirmedCount + shippedCount + cancelledCount;

        model.addAttribute("submittedCount", submittedCount);
        model.addAttribute("confirmedCount", confirmedCount);
        model.addAttribute("shippedCount", shippedCount);
        model.addAttribute("cancelledCount", cancelledCount);
        model.addAttribute("totalOrders", totalOrders);

        // Финансови статистики
        BigDecimal submittedValue = orderRepository.getTotalValueByStatus(OrderStatus.SUBMITTED);
        BigDecimal confirmedValue = orderRepository.getTotalValueByStatus(OrderStatus.CONFIRMED);
        BigDecimal shippedValue = orderRepository.getTotalValueByStatus(OrderStatus.SHIPPED);

        model.addAttribute("submittedValue", submittedValue != null ? submittedValue : BigDecimal.ZERO);
        model.addAttribute("confirmedValue", confirmedValue != null ? confirmedValue : BigDecimal.ZERO);
        model.addAttribute("shippedValue", shippedValue != null ? shippedValue : BigDecimal.ZERO);

        BigDecimal totalValue = BigDecimal.ZERO;
        if (submittedValue != null) totalValue = totalValue.add(submittedValue);
        if (confirmedValue != null) totalValue = totalValue.add(confirmedValue);
        if (shippedValue != null) totalValue = totalValue.add(shippedValue);

        model.addAttribute("totalValue", totalValue);

        // Последни заявки за бързо действие
        model.addAttribute("recentSubmitted",
                orderService.listByStatus(OrderStatus.SUBMITTED).stream().limit(5).toList());

        return "admin/dashboard";
    }
}