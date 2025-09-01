package com.yourco.warehouse.controllers.client;

import com.yourco.warehouse.repository.ProductRepository;

import com.yourco.warehouse.service.CatalogService;
import com.yourco.warehouse.utils.RequestUtils;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class CatalogController {

    private final CatalogService catalogService;
    private final ProductRepository productRepository;

    @Autowired
    public CatalogController(CatalogService catalogService, ProductRepository productRepository) {
        this.catalogService = catalogService;

        this.productRepository = productRepository;
    }

    @GetMapping("/catalog")
    public String catalog(@RequestParam(value = "q", required = false) String query,
                          Model model,
                          Authentication auth,
                          HttpServletRequest request) {
        try {
            // Валидиране и почистване на заявката за търсене
            String sanitizedQuery = null;
            if (query != null) {
                sanitizedQuery = query.trim();
                if (sanitizedQuery.isEmpty()) {
                    sanitizedQuery = null;
                }
                // Ограничаване дължината на заявката
                if (sanitizedQuery != null && sanitizedQuery.length() > 100) {
                    sanitizedQuery = sanitizedQuery.substring(0, 100);
                }
            }

            var products = catalogService.searchActive(sanitizedQuery);

            model.addAttribute("q", sanitizedQuery);
            model.addAttribute("products", products);
            model.addAttribute("resultCount", products.size());
            model.addAttribute("hasQuery", sanitizedQuery != null);



            return "client/catalog";

        } catch (Exception e) {

            model.addAttribute("error", "Възникна грешка при зареждане на каталога");
            model.addAttribute("q", query);
            model.addAttribute("products", productRepository.findAll());
            model.addAttribute("resultCount", 0);
            return "client/catalog";
        }
    }
}