package com.yourco.warehouse.controllers;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {


    @GetMapping("/")
    public String home(Model model, Authentication auth) {
        return "/index";
    }


    @GetMapping("/about")
    public String about(Model model) {
        model.addAttribute("appVersion", "1.0.0");
        model.addAttribute("buildDate", "2025-01-01");
        return "/about";
    }
}