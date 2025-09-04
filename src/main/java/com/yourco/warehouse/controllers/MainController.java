package com.yourco.warehouse.controllers;

import com.yourco.warehouse.utils.RequestUtils;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class MainController {


    @GetMapping("/")
    public String home(Model model, Authentication auth) {
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

            return "client/catalog";
        } catch (Exception e) {
            model.addAttribute("error", "Възникна грешка при зареждане на каталога");
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