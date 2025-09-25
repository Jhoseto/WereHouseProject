package com.yourco.warehouse.controllers;

import com.yourco.warehouse.dto.ClientDTO;
import com.yourco.warehouse.dto.OrderDTO;
import com.yourco.warehouse.entity.UserEntity;
import com.yourco.warehouse.repository.ShippedProcessRepository;
import com.yourco.warehouse.service.DashboardService;
import com.yourco.warehouse.service.OrderLoadingService;
import com.yourco.warehouse.service.OrderService;
import com.yourco.warehouse.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.Optional;

/**
 * SHIPPED ORDER VIEW CONTROLLER - MVC THYMELEAF
 * =============================================
 * MVC контролер за зареждане на HTML страници за shipping операции
 * Използва Thymeleaf за рендериране на началните данни
 */
@Controller
@RequestMapping("/employer/shipped")
@PreAuthorize("hasRole('ADMIN') or hasRole('EMPLOYER')")
public class OrderLoadingController {

    private static final Logger log = LoggerFactory.getLogger(OrderLoadingController.class);

    private final DashboardService dashboardService;
    private final OrderService orderService;
    private final UserService userService;
    private final OrderLoadingService orderLoadingService;
    private final ShippedProcessRepository shippedProcessRepository;

    @Autowired
    public OrderLoadingController(DashboardService dashboardService, OrderService orderService, UserService userService, OrderLoadingService orderLoadingService, ShippedProcessRepository shippedProcessRepository) {
        this.dashboardService = dashboardService;
        this.orderService = orderService;
        this.userService = userService;
        this.orderLoadingService = orderLoadingService;
        this.shippedProcessRepository = shippedProcessRepository;
    }

    /**
     * Показва shipping страница за конкретна поръчка
     * Зарежда HTML с Thymeleaf и първоначални данни
     */
    @GetMapping("/ordersDetail/{orderId}")
    public String showShippingPage(@PathVariable Long orderId, Model model, CsrfToken csrfToken) {
        try {
            log.debug("Loading shipping page for order: {}", orderId);

            // Зареди order данните чрез сервиса
            Optional<OrderDTO> orderDetails = orderService.getOrderById(orderId);

            if (orderDetails.isEmpty()) {
                model.addAttribute("error", "Поръчката не е намерена или не е готова за изпращане");
                return "redirect:/employer/dashboard?error=order-not-found";
            }

            // Зареди client информацията
            Long clientId = orderDetails.get().getClientId();
            ClientDTO clientInfo = null;
            if (clientId != null) {
                clientInfo = dashboardService.getClientInfo(clientId);
            }

            // Получи текущия потребител ID и username
            Long currentUserId = userService.getCurrentUser().getId();
            String currentUsername = userService.getCurrentUser().getUsername();

            // Подготви данни за Thymeleaf
            model.addAttribute("order", orderDetails.get());
            model.addAttribute("orderId", orderId);
            model.addAttribute("clientInfo", clientInfo);
            model.addAttribute("pageTitle", "Изпращане на поръчка №" + orderId);

            // CSRF данни за JavaScript
            model.addAttribute("csrfToken", csrfToken.getToken());
            model.addAttribute("csrfHeader", csrfToken.getHeaderName());

            // Добавяме authentication данни за JavaScript
            model.addAttribute("currentUserId", currentUserId);
            model.addAttribute("currentUsername", currentUsername);

            if (shippedProcessRepository.findByOrderId(orderId).isPresent()){

                UserEntity loadingEmployer = orderLoadingService.getEmployer(orderId);
                model.addAttribute("loadingEmployer", loadingEmployer);
            };

            return "employer/order-detail-shipped";

        } catch (Exception e) {
            log.error("Error loading shipping page for order {}: {}", orderId, e.getMessage(), e);
            model.addAttribute("error", "Възникна грешка при зареждане на страницата");
            return "error/general";
        }
    }
}