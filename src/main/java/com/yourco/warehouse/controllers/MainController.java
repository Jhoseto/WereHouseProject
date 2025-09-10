package com.yourco.warehouse.controllers;

import com.yourco.warehouse.dto.DailyStatsDTO;
import com.yourco.warehouse.dto.DashboardDataDTO;
import com.yourco.warehouse.entity.Order;
import com.yourco.warehouse.entity.UserEntity;
import com.yourco.warehouse.service.DashboardService;
import com.yourco.warehouse.service.UserService;
import com.yourco.warehouse.service.impl.OrderServiceImpl;
import com.yourco.warehouse.utils.RequestUtils;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.support.RequestContextUtils;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Controller
public class MainController {


    private final UserService userService;
    private final OrderServiceImpl orderService;
    private final DashboardService dashboardService;

    public MainController(UserService userService,
                          OrderServiceImpl orderService, DashboardService dashboardService) {
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
                    .filter(o -> o.getStatus() != null && o.getStatus().name().equals("SUBMITTED"))
                    .count();

            long confirmedCount = orders.stream()
                    .filter(o -> o.getStatus() != null && o.getStatus().name().equals("CONFIRMED"))
                    .count();

            long shippedCount = orders.stream()
                    .filter(o -> o.getStatus() != null && o.getStatus().name().equals("SHIPPED"))
                    .count();

            long cancelledCount = orders.stream()
                    .filter(o -> o.getStatus() != null && o.getStatus().name().equals("CANCELLED"))
                    .count();

            // ✅ Добавяме в модела
            model.addAttribute("submittedCount", submittedCount);
            model.addAttribute("confirmedCount", confirmedCount);
            model.addAttribute("shippedCount", shippedCount);
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

            // ✅ FIXED: Използваме съществуващите методи от DashboardServiceImpl
            DashboardDataDTO dashboardData = dashboardService.getDashboardOverview();
            DailyStatsDTO dailyStats = dashboardService.getDailyStatistics();

            // ✅ Add individual counts for Thymeleaf template (както преди)
            model.addAttribute("submittedCount", dashboardData.getSubmittedCount());
            model.addAttribute("confirmedCount", dashboardData.getConfirmedCount());
            model.addAttribute("pickedCount", dashboardData.getPickedCount());
            model.addAttribute("shippedCount", dashboardData.getShippedCount());
            model.addAttribute("cancelledCount", dashboardData.getCancelledCount());
            model.addAttribute("dailyStats", dailyStats);
            model.addAttribute("lastUpdate", LocalDateTime.now());
            model.addAttribute("currentUser", currentUser);
            model.addAttribute("userId", currentUser.getId());

            // ✅ CRITICAL FIX: Create EXACTLY the same structure that AdminDashboardController returns
            Map<String, Object> initialDashboardData = new HashMap<>();

            // ✅ Use the SAME field names as DashboardOverviewResponseDTO
            initialDashboardData.put("urgentCount", dashboardData.getSubmittedCount());
            initialDashboardData.put("pendingCount", dashboardData.getConfirmedCount());
            initialDashboardData.put("readyCount", dashboardData.getPickedCount());
            initialDashboardData.put("completedCount", dashboardData.getShippedCount());
            initialDashboardData.put("cancelledCount", dashboardData.getCancelledCount());
            initialDashboardData.put("dailyStats", dailyStats);
            initialDashboardData.put("hasUrgentAlerts", dashboardData.getSubmittedCount() > 0);
            initialDashboardData.put("lastUpdate", LocalDateTime.now().toString());
            initialDashboardData.put("isValid", true);

            model.addAttribute("initialDashboardData", initialDashboardData);

            // ✅ SECURITY: Proper CSRF token handling
            CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
            if (csrfToken != null) {
                model.addAttribute("csrfToken", csrfToken.getToken());
                model.addAttribute("csrfHeader", csrfToken.getHeaderName());
            } else {
                model.addAttribute("csrfToken", "");
                model.addAttribute("csrfHeader", "X-CSRF-TOKEN");
            }

            return "main-dashboard";

        } catch (Exception e) {

            // ✅ ERROR FALLBACK: Ensure model has safe defaults
            model.addAttribute("submittedCount", 0);
            model.addAttribute("confirmedCount", 0);
            model.addAttribute("pickedCount", 0);
            model.addAttribute("shippedCount", 0);
            model.addAttribute("cancelledCount", 0);

            // ✅ Error fallback data for JavaScript
            Map<String, Object> errorData = Map.of(
                    "isValid", false,
                    "error", "Грешка при зареждане на данните"
            );
            model.addAttribute("initialDashboardData", errorData);
            model.addAttribute("errorMessage", "Възникна грешка при зареждане на dashboard данните");

            return "main-dashboard";
        }
    }


    @GetMapping("/about")
    public String about(Model model) {
        model.addAttribute("appVersion", "1.0.0");
        model.addAttribute("buildDate", "2025-01-01");
        return "/about";
    }
}