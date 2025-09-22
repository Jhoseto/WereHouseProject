package com.yourco.warehouse.controllers;

import com.yourco.warehouse.dto.DashboardDTO;
import com.yourco.warehouse.dto.OrderDTO;
import com.yourco.warehouse.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.HashMap;
import java.util.Map;

/**
 * SHIPPING PAGE CONTROLLER - Зарежда само HTML страницата за Thymeleaf
 *
 * Този контролер има само една цел - да зареди началната HTML страница
 * с всички необходими данни за Thymeleaf template-а. Всички динамични
 * операции се обработват от ShippingRestController през WebSocket.
 */
@Controller
@RequestMapping("/employer/shipping")
public class OrderShippingController {

    private final DashboardService dashboardService;

    @Autowired
    public OrderShippingController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    /**
     * Зарежда HTML страницата за обработка на поръчки преди изпращане
     *
     * Този метод зарежда всички полета необходими за Thymeleaf template-а:
     * - Основни данни за поръчката
     * - Клиентска информация
     * - Списък с артикули
     * - Финансови данни
     * - Конфигурация за JavaScript/WebSocket
     *
     * След зареждане на страницата, всички операции стават през REST API.
     */
    @GetMapping("/order/{orderId}")
    public String loadShippingPage(@PathVariable Long orderId,
                                   Model model,
                                   Authentication authentication,
                                   RedirectAttributes redirectAttributes) {
        try {

            // Зареждаме всички данни за поръчката
            DashboardDTO orderResult = dashboardService.getOrderDetails(orderId);

            if (!orderResult.getSuccess() || orderResult.getOrder() == null) {
                redirectAttributes.addFlashAttribute("errorMessage",
                        "Поръчката не може да бъде заредена: " + orderResult.getMessage());
                return "redirect:/employer/dashboard";
            }

            OrderDTO order = orderResult.getOrder();

            // Подготвяме всички данни за Thymeleaf template-а
            model.addAttribute("order", order);
            model.addAttribute("orderId", orderId);
            model.addAttribute("pageTitle", "Обработка за изпращане - Поръчка №" + orderId);

            // Клиентски данни
            Map<String, Object> clientInfo = new HashMap<>();
            clientInfo.put("companyName", order.getClientCompany());
            clientInfo.put("username", order.getClientName());
            clientInfo.put("phone", order.getClientPhone());
            clientInfo.put("location", order.getClientLocation());
            clientInfo.put("clientId", order.getClientId());
            model.addAttribute("clientInfo", clientInfo);

            // JavaScript конфигурация за WebSocket/API комуникация
            Map<String, Object> jsConfig = new HashMap<>();
            jsConfig.put("orderId", orderId);
            jsConfig.put("apiBaseUrl", "/api/shipping");
            jsConfig.put("wsEndpoint", "/ws/shipping");
            jsConfig.put("currentUser", authentication.getName());
            jsConfig.put("csrfToken", ""); // Ще се попълни от template-а
            model.addAttribute("jsConfig", jsConfig);

            return "employer/order-detail-shipped";

        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage",
                    "Възникна техническа грешка при зареждане на страницата");
            return "redirect:/employer/dashboard";
        }
    }
}