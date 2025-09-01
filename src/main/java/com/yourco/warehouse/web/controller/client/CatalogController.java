
package com.yourco.warehouse.web.controller.client;

import com.yourco.warehouse.service.CatalogService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class CatalogController {

    private final CatalogService catalogService;

    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/catalog")
    public String catalog(@RequestParam(value="q", required = false) String q, Model model){
        model.addAttribute("q", q);
        model.addAttribute("products", catalogService.searchActive(q));
        return "client/catalog";
    }
}
