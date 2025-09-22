package com.yourco.warehouse.controllers;

import com.yourco.warehouse.dto.OrderDTO;
import com.yourco.warehouse.dto.ClientDTO;
import com.yourco.warehouse.service.DashboardService;
import com.yourco.warehouse.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.Optional;

@Controller
public class OrderShippingController {

    private final OrderService orderService;
    private final DashboardService dashboardService;

    @Autowired
    public OrderShippingController(OrderService orderService,
                                   DashboardService dashboardService) {
        this.orderService = orderService;
        this.dashboardService = dashboardService;
    }

    @GetMapping("employer/shipped/ordersDetail/{id}")
    public String getOrderDetails(@PathVariable Long id, Model model) {
        // Взимаме DTO-то от сервиза
        Optional<OrderDTO> order = orderService.getOrderById(id);

        if (order.isEmpty()) {
            // Ако няма такъв order → връщаме грешка/404
            return "redirect:/employer/dashboard?error=data-unavailable";
        }

        // Пълна клиентска информация с една линия код
        ClientDTO clientInfo = dashboardService.getClientInfo(order.get().getClientId());
        model.addAttribute("clientInfo", clientInfo);

        // Добавяме в модела
        model.addAttribute("order", order);

        // Връщаме Thymeleaf template-а (примерно order-details.html)
        return "employer/order-detail-shipped";
    }
}
