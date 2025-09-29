package com.yourco.warehouse.controllers;

import com.yourco.warehouse.dto.ClientDTO;
import com.yourco.warehouse.dto.DashboardDTO;
import com.yourco.warehouse.dto.OrderDTO;
import com.yourco.warehouse.dto.OrderItemDTO;
import com.yourco.warehouse.entity.Order;
import com.yourco.warehouse.entity.UserEntity;
import com.yourco.warehouse.entity.enums.OrderStatus;
import com.yourco.warehouse.service.DashboardService;
import com.yourco.warehouse.service.ProductService;
import com.yourco.warehouse.service.UserService;
import com.yourco.warehouse.service.ClientOrderService;
import com.yourco.warehouse.utils.RequestUtils;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.support.RequestContextUtils;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Controller
public class MainController {


    private final UserService userService;
    private final ClientOrderService clientOrderService;
    private final DashboardService dashboardService;
    private final ProductService productService;

    @Autowired
    public MainController(UserService userService,
                          ClientOrderService clientOrderService,
                          DashboardService dashboardService,
                          ProductService productService) {
        this.userService = userService;
        this.clientOrderService = clientOrderService;
        this.dashboardService = dashboardService;
        this.productService = productService;
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
     ** Страница със списък на поръчките на клиент
     * ПОПРАВЕНА ЛОГИКА: правилни counters според новите статуси
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

            List<Order> orders = clientOrderService.getOrdersForClient(currentUser.getId());
            model.addAttribute("orders", orders);
            model.addAttribute("pageTitle", "Моите поръчки");

            // ✅ ПОПРАВЕНА ЛОГИКА: правилни broячи на статуси

            // "Чакащи потвърждение" = PENDING + URGENT (групирани заедно)
            long submittedCount = orders.stream()
                    .filter(o -> o.getStatus() != null &&
                            (o.getStatus() == OrderStatus.PENDING ||
                                    o.getStatus() == OrderStatus.URGENT))
                    .count();

            // "Потвърдени" = CONFIRMED (обработени, чакат изпращане)
            long confirmedCount = orders.stream()
                    .filter(o -> o.getStatus() != null &&
                            o.getStatus() == OrderStatus.CONFIRMED)
                    .count();

            // "Изпратени" = SHIPPED (изпратени за доставка)
            long shippedCount = orders.stream()
                    .filter(o -> o.getStatus() != null &&
                            o.getStatus() == OrderStatus.SHIPPED)
                    .count();

            // "Отменени" = CANCELLED (отказани поръчки)
            long cancelledCount = orders.stream()
                    .filter(o -> o.getStatus() != null &&
                            o.getStatus() == OrderStatus.CANCELLED)
                    .count();

            // ✅ Добавяме всички counters в модела
            model.addAttribute("submittedCount", submittedCount);  // PENDING + URGENT
            model.addAttribute("confirmedCount", confirmedCount);   // CONFIRMED
            model.addAttribute("shippedCount", shippedCount);       // SHIPPED
            model.addAttribute("cancelledCount", cancelledCount);   // CANCELLED

            return "order"; // връща order.html template

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
            model.addAttribute("shippedCount", dashboardData.getShippedCount() != null ? dashboardData.getShippedCount() : 0);
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

            return "employer/main-dashboard";

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

            return "employer/main-dashboard";
        }
    }

    /**
     * HTML TEMPLATE за order review страницата
     */
    @GetMapping("/employer/dashboard/order/{orderId}/detailOrder")
    public String getOrderReviewPage(@PathVariable Long orderId,
                                     Model model,
                                     HttpServletRequest request) {
        try {
            // Зареждаме order данните
            DashboardDTO orderDetails = dashboardService.getOrderDetails(orderId);

            if (!orderDetails.getSuccess()) {
                return "redirect:/employer/dashboard?error=order-not-found";
            }

            OrderDTO order = orderDetails.getOrder();
            if (order == null) {
                return "redirect:/employer/dashboard?error=data-unavailable";
            }

            // Основни данни
            model.addAttribute("order", order);
            model.addAttribute("orderId", orderId);
            model.addAttribute("orderData", order);

            // Пълна клиентска информация с една линия код
            ClientDTO clientInfo = dashboardService.getClientInfo(order.getClientId());
            model.addAttribute("clientInfo", clientInfo);

            // Категории
            Set<String> categories = new HashSet<>();
            if (order.getItems() != null) {
                categories = order.getItems().stream()
                        .map(OrderItemDTO::getCategory)
                        .filter(Objects::nonNull)
                        .filter(category -> !category.trim().isEmpty())
                        .collect(Collectors.toSet());
            }
            model.addAttribute("categories", categories);

            // CSRF
            CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
            model.addAttribute("csrfToken", csrfToken != null ? csrfToken.getToken() : "");
            model.addAttribute("csrfHeader", csrfToken != null ? csrfToken.getHeaderName() : "X-CSRF-TOKEN");

            // Metadata
            model.addAttribute("pageTitle", "Order Review - Order #" + orderId);
            model.addAttribute("orderItemsCount", order.getItems() != null ? order.getItems().size() : 0);

            // Dashboard config за JavaScript
            Map<String, Object> dashboardConfig = new HashMap<>();
            dashboardConfig.put("orderId", orderId);
            dashboardConfig.put("csrfToken", csrfToken != null ? csrfToken.getToken() : "");
            dashboardConfig.put("csrfHeader", csrfToken != null ? csrfToken.getHeaderName() : "X-CSRF-TOKEN");
            dashboardConfig.put("orderData", order);
            dashboardConfig.put("clientInfo", clientInfo);
            dashboardConfig.put("dashboardMode", "review");

            model.addAttribute("dashboardConfig", dashboardConfig);

            return "employer/order-review";

        } catch (Exception e) {
            return "redirect:/employer/dashboard?error=system-error";
        }
    }

    /**
     * Администраторски панел - главна страница с табове за различните секции
     * Достъпен само за потребители с роля ADMIN
     */
    @GetMapping("/admin/dashboard")
    @PreAuthorize("hasRole('ADMIN')")
    public String adminDashboard(Model model, Authentication authentication) {
        try {
            DashboardDTO dashboardData = dashboardService.getFullDashboard();
            // Статистики за quick stats cards
            long totalEmployers = userService.getTotalEmployersCount();
            long totalClients = userService.getTotalClientsCount();
            long totalProducts = productService.getActiveProductsCount();


            // Добавяне на статистики към модела
            model.addAttribute("totalEmployers", totalEmployers);
            model.addAttribute("totalClients", totalClients);
            model.addAttribute("totalProducts", totalProducts);
            model.addAttribute("pendingCount", dashboardData.getPendingCount() != null ? dashboardData.getPendingCount() : 0);

            // Информация за текущия потребител
            UserEntity currentUser = userService.getCurrentUser();
            model.addAttribute("currentUser", currentUser);

            // Заглавие на страницата
            model.addAttribute("pageTitle", "Администраторски панел");
            model.addAttribute("pageDescription", "Централизирано управление на системата");

            return "admin/adminDashboard";

        } catch (Exception e) {

            model.addAttribute("errorMessage", "Възникна грешка при зареждане на администраторския панел");
            model.addAttribute("errorTitle", "Системна грешка");

            return "error/general";
        }
    }

    @GetMapping("/about")
    public String about(Model model) {
        model.addAttribute("appVersion", "1.0.0");
        model.addAttribute("buildDate", "2025-01-01");
        return "/about";
    }
}