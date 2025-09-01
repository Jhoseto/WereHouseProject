package com.yourco.warehouse.web.controller;

import com.yourco.warehouse.entity.enums.OrderStatus;
import com.yourco.warehouse.repository.OrderRepository;
import com.yourco.warehouse.repository.ProductRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    public HomeController(OrderRepository orderRepository, ProductRepository productRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
    }

    @GetMapping("/")
    public String home(Model model, Authentication auth) {
        // Основни статистики за всички потребители
        long activeProducts = productRepository.countByActiveProducts();
        model.addAttribute("activeProducts", activeProducts);

        if (auth != null) {
            String username = auth.getName();
            boolean isAdmin = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

            model.addAttribute("isAuthenticated", true);
            model.addAttribute("username", username);
            model.addAttribute("isAdmin", isAdmin);

            if (isAdmin) {
                // Статистики за администратор
                long submittedOrders = orderRepository.countByStatus(OrderStatus.SUBMITTED);
                long totalOrders = orderRepository.count();

                model.addAttribute("submittedOrders", submittedOrders);
                model.addAttribute("totalOrders", totalOrders);
                model.addAttribute("showAdminStats", true);
            } else {
                // Статистики за клиент - може да добавим later
                model.addAttribute("showClientStats", true);
            }
        } else {
            model.addAttribute("isAuthenticated", false);
        }

        return "home/index";
    }

    @GetMapping("/about")
    public String about(Model model) {
        model.addAttribute("appVersion", "1.0.0");
        model.addAttribute("buildDate", "2025-01-01");
        return "home/about";
    }
}