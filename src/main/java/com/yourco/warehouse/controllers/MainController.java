package com.yourco.warehouse.controllers;

import com.yourco.warehouse.dto.DashboardDTO;
import com.yourco.warehouse.entity.Order;
import com.yourco.warehouse.entity.UserEntity;
import com.yourco.warehouse.service.DashboardService;
import com.yourco.warehouse.service.UserService;
import com.yourco.warehouse.service.OrderService;
import com.yourco.warehouse.utils.RequestUtils;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.support.RequestContextUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Controller
public class MainController {


    private final UserService userService;
    private final OrderService orderService;
    private final DashboardService dashboardService;

    @Autowired
    public MainController(UserService userService,
                          OrderService orderService, DashboardService dashboardService) {
        this.userService = userService;
        this.orderService = orderService;
        this.dashboardService = dashboardService;
    }

    @GetMapping("/")
    public String home(Model model, Authentication auth, HttpServletRequest request,
                       @RequestParam(value = "error", required = false) String error,
                       @RequestParam(value = "logout", required = false) String logout) {

        // Обработваме flash атрибутите от AuthController
        Map<String, ?> flashMap = RequestContextUtils.getInputFlashMap(request);
        if (flashMap != null) {
            for (Map.Entry<String, ?> entry : flashMap.entrySet()) {
                model.addAttribute(entry.getKey(), entry.getValue());
            }
        }

        // Обработваме URL параметрите
        if (error != null) {
            if ("unauthorized".equals(error)) {
                model.addAttribute("errorMessage", "Трябва да влезете в системата за да достъпите тази страница.");
                model.addAttribute("errorTitle", "Необходима е автентикация");
            } else {
                model.addAttribute("errorMessage", "Възникна грешка при влизане в системата. Моля опитайте отново.");
                model.addAttribute("errorTitle", "Грешка при вход");
            }
        }

        if (logout != null) {
            model.addAttribute("successMessage", "Успешно излязохте от системата. До скоро!");
            model.addAttribute("successTitle", "Довиждане");
        }

        return "index";
    }


// ==========================================
    // HTML TEMPLATE ENDPOINTS
    // ==========================================

    @GetMapping("/catalog")
    public String catalog(Model model, Authentication auth, HttpServletRequest request) {
        try {
            String username = auth != null ? auth.getName() : "anonymous";
            String ipAddress = RequestUtils.getClientIpAddress(request);
            String userAgent = request.getHeader("User-Agent");

            model.addAttribute("pageTitle", "Каталог продукти");
            model.addAttribute("username", username);
            model.addAttribute("isAuthenticated", auth != null && auth.isAuthenticated());

            return "catalog";
        } catch (Exception e) {
            model.addAttribute("error", "Възникна грешка при зареждане на каталога");
            return "error/general";
        }
    }


    /**
     * Страница със списък на поръчките на клиента
     */
    @GetMapping("/orders")
    public String listOrders(Model model, Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return "redirect:/";
            }

            UserEntity currentUser = userService.getCurrentUser();
            if (currentUser == null) {
                return "redirect:/";
            }

            List<Order> orders = orderService.getOrdersForClient(currentUser.getId());
            model.addAttribute("orders", orders);
            model.addAttribute("pageTitle", "Моите поръчки");

            // ✅ Логика за броячи на статуси
            long submittedCount = orders.stream()
                    .filter(o -> o.getStatus() != null && o.getStatus().name().equals("PENDING"))
                    .count();

            long confirmedCount = orders.stream()
                    .filter(o -> o.getStatus() != null && o.getStatus().name().equals("CONFIRMED"))
                    .count();

            long cancelledCount = orders.stream()
                    .filter(o -> o.getStatus() != null && o.getStatus().name().equals("CANCELLED"))
                    .count();

            // ✅ Добавяме в модела
            model.addAttribute("submittedCount", submittedCount);
            model.addAttribute("confirmedCount", confirmedCount);
            model.addAttribute("cancelledCount", cancelledCount);

            return "order";
        } catch (Exception e) {
            model.addAttribute("error", "Възникна грешка при зареждане на поръчките");
            return "error/general";
        }
    }


    @GetMapping("/employer/dashboard")
    public String mainDashboard(Model model, Authentication authentication, HttpServletRequest request) {
        try {
            UserEntity currentUser = userService.getCurrentUser();

            DashboardDTO dashboardData = dashboardService.getFullDashboard();

            if (!dashboardData.getSuccess()) {
                throw new RuntimeException(dashboardData.getMessage());
            }

            model.addAttribute("urgentCount", dashboardData.getUrgentCount() != null ? dashboardData.getUrgentCount() : 0);
            model.addAttribute("pendingCount", dashboardData.getPendingCount() != null ? dashboardData.getPendingCount() : 0);
            model.addAttribute("confirmedCount", dashboardData.getCompletedCount() != null ? dashboardData.getCompletedCount() : 0);
            model.addAttribute("cancelledCount", dashboardData.getCancelledCount() != null ? dashboardData.getCancelledCount() : 0);

            model.addAttribute("dailyStats", dashboardData); // Template ще използва полетата processed, revenue, avgTime, activeClients

            model.addAttribute("lastUpdate", LocalDateTime.now());
            model.addAttribute("currentUser", currentUser);
            model.addAttribute("userId", currentUser.getId());

            // ✅ За JavaScript също запазваме очакваната структура
            model.addAttribute("initialDashboardData", dashboardData);

            // CSRF token handling
            CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
            if (csrfToken != null) {
                model.addAttribute("csrfToken", csrfToken.getToken());
                model.addAttribute("csrfHeader", csrfToken.getHeaderName());
            } else {
                model.addAttribute("csrfToken", "");
                model.addAttribute("csrfHeader", "X-CSRF-TOKEN");
            }

            return "admin/main-dashboard";

        } catch (Exception e) {
            // Error fallback - запазваме същата структура
            model.addAttribute("pendingCount", 0);
            model.addAttribute("urgentCount", 0);
            model.addAttribute("confirmedCount", 0);
            model.addAttribute("cancelledCount", 0);

            // Празен DTO за dailyStats
            DashboardDTO errorData = new DashboardDTO("Грешка при зареждане на данните");
            model.addAttribute("dailyStats", errorData);
            model.addAttribute("initialDashboardData", errorData);
            model.addAttribute("errorMessage", "Възникна грешка при зареждане на dashboard данните");

            return "admin/main-dashboard";
        }
    }


    @GetMapping("/about")
    public String about(Model model) {
        model.addAttribute("appVersion", "1.0.0");
        model.addAttribute("buildDate", "2025-01-01");
        return "/about";
    }
}