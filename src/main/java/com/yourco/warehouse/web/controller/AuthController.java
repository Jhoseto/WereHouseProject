package com.yourco.warehouse.web.controller;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class AuthController {

    @GetMapping("/login")
    public String login(@RequestParam(value = "error", required = false) String error,
                        @RequestParam(value = "logout", required = false) String logout,
                        @RequestParam(value = "message", required = false) String message,
                        Authentication auth,
                        Model model) {

        // Ако потребителят вече е влязъл, пренасочваме го
        if (auth != null && auth.isAuthenticated()) {
            if (auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                return "redirect:/admin";
            } else {
                return "redirect:/catalog";
            }
        }

        // Добавяне на съобщения към модела
        if (error != null) {
            if (message != null && !message.isEmpty()) {
                model.addAttribute("errorMessage", message);
            } else {
                model.addAttribute("errorMessage", "Невалидно потребителско име или парола");
            }
        }

        if (logout != null) {
            model.addAttribute("logoutMessage", "Излязохте успешно от системата");
        }

        // Добавяне на demo креденциали за удобство в dev режим
        model.addAttribute("showDemoCredentials", true);

        return "auth/login";
    }

    @GetMapping("/access-denied")
    public String accessDenied(Model model) {
        model.addAttribute("error", "Нямате права за достъп до този ресурс");
        return "error/access-denied";
    }
}