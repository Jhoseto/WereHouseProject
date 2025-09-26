package com.yourco.warehouse.controllers;

import com.yourco.warehouse.dto.ClientDTO;
import com.yourco.warehouse.dto.OrderDTO;
import com.yourco.warehouse.entity.UserEntity;
import com.yourco.warehouse.entity.enums.UserStatus;
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
 * ORDER LOADING CONTROLLER - REFACTORED
 * =====================================
 * Зарежда директно HTML интерфейса за товарене с всички данни
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
     * REFACTORED: Директно зареждане на интерфейса за товарене
     * Показва страницата с всички данни веднага, без отделни етапи
     */
    @GetMapping("/ordersDetail/{orderId}")
    public String showShippingPage(@PathVariable Long orderId, Model model, CsrfToken csrfToken) {
        try {
            log.info("Loading refactored shipping interface for order: {}", orderId);

            // ==========================================
            // 1. ВАЛИДАЦИЯ НА ПОРЪЧКАТА
            // ==========================================
            Optional<OrderDTO> orderDetails = orderService.getOrderById(orderId);
            if (orderDetails.isEmpty()) {
                log.warn("Order not found: {}", orderId);
                model.addAttribute("error", "Поръчката не е намерена");
                return "redirect:/employer/dashboard?error=order-not-found";
            }

            OrderDTO order = orderDetails.get();

            // ==========================================
            // 2. КЛИЕНТСКА ИНФОРМАЦИЯ
            // ==========================================
            ClientDTO clientInfo = null;
            Long clientId = order.getClientId();
            if (clientId != null) {
                try {
                    clientInfo = dashboardService.getClientInfo(clientId);
                    log.debug("Loaded client info for: {}", clientInfo.getCompanyName());
                } catch (Exception e) {
                    log.warn("Could not load client info for order {}: {}", orderId, e.getMessage());
                    // Създаваме fallback клиентска информация
                    clientInfo = createFallbackClientInfo();
                }
            }

            // ==========================================
            // 3. ТЕКУЩ ПОТРЕБИТЕЛ
            // ==========================================
            UserEntity currentUser = userService.getCurrentUser();
            Long currentUserId = currentUser.getId();
            String currentUsername = currentUser.getUsername();

            // ==========================================
            // 4. ПРОВЕРКА ЗА АКТИВНА СЕСИЯ
            // ==========================================
            UserEntity loadingEmployer = null;
            boolean hasActiveSession = false;

            try {
                if (shippedProcessRepository.findByOrderId(orderId).isPresent()) {
                    loadingEmployer = orderLoadingService.getEmployer(orderId);
                    hasActiveSession = true;
                    log.info("Found active loading session for order {} by employee: {}",
                            orderId, loadingEmployer.getUsername());
                }
            } catch (Exception e) {
                log.debug("No active loading session for order {}: {}", orderId, e.getMessage());
            }

            // ==========================================
            // 5. ПОДГОТОВКА НА ДАННИ ЗА THYMELEAF
            // ==========================================

            // Основни данни
            model.addAttribute("order", order);
            model.addAttribute("orderId", orderId);
            model.addAttribute("clientInfo", clientInfo);
            model.addAttribute("pageTitle", "Товарене на поръчка №" + orderId);

            // CSRF защита
            model.addAttribute("csrfToken", csrfToken.getToken());
            model.addAttribute("csrfHeader", csrfToken.getHeaderName());

            // Данни за текущия потребител
            model.addAttribute("currentUserId", currentUserId);
            model.addAttribute("currentUsername", currentUsername);
            model.addAttribute("currentUserEmail", currentUser.getEmail());
            model.addAttribute("currentUserPhone", currentUser.getPhone());

            // Данни за активната сесия
            model.addAttribute("hasActiveSession", hasActiveSession);
            model.addAttribute("loadingEmployer", loadingEmployer);

            // Статистики
            model.addAttribute("totalOrderItems", order.getItems().size());

            log.debug("Shipping interface loaded successfully for order {}", orderId);

            return "employer/order-detail-shipped";

        } catch (Exception e) {
            log.error("Critical error loading shipping interface for order {}: {}", orderId, e.getMessage(), e);
            model.addAttribute("error", "Възникна техническа грешка при зареждане на страницата");
            return "error/general";
        }
    }

    /**
     * Създава fallback клиентска информация
     */
    private ClientDTO createFallbackClientInfo() {
        return new ClientDTO(
                0L,
                "unknown",
                "Неизвестен клиент",
                "",
                "",
                "",
                UserStatus.ACTIVE
        );
    }
}