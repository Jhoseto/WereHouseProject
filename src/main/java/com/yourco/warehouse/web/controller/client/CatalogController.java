package com.yourco.warehouse.web.controller.client;

import com.yourco.warehouse.service.AuditService;
import com.yourco.warehouse.service.CatalogService;
import com.yourco.warehouse.util.RequestUtils;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class CatalogController {

    private static final Logger logger = LoggerFactory.getLogger(CatalogController.class);

    private final CatalogService catalogService;
    private final AuditService auditService;

    public CatalogController(CatalogService catalogService, AuditService auditService) {
        this.catalogService = catalogService;
        this.auditService = auditService;
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

            // Audit log за търсене (само ако има заявка)
            if (sanitizedQuery != null && auth != null) {
                String ipAddress = RequestUtils.getClientIpAddress(request);
                String userAgent = RequestUtils.getUserAgent(request);

                auditService.logProductAccess("SEARCH:" + sanitizedQuery,
                        auth.getName(), ipAddress, userAgent);
            }

            logger.debug("Заявка за каталог от потребител: {}, търсене: '{}', резултати: {}",
                    auth != null ? auth.getName() : "anonymous",
                    sanitizedQuery,
                    products.size());

            return "client/catalog";

        } catch (Exception e) {
            logger.error("Грешка при зареждане на каталога", e);
            model.addAttribute("error", "Възникна грешка при зареждане на каталога");
            model.addAttribute("q", query);
            model.addAttribute("products", java.util.Collections.emptyList());
            model.addAttribute("resultCount", 0);
            return "client/catalog";
        }
    }
}