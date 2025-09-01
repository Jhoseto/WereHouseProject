
package com.yourco.warehouse.web.controller.admin;

import com.yourco.warehouse.domain.enums.OrderStatus;
import com.yourco.warehouse.service.OrderService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/admin")
public class DashboardController {
    private final OrderService orderService;

    public DashboardController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping("")
    public String dashboard(Model model){
        model.addAttribute("submittedCount", orderService.listByStatus(OrderStatus.SUBMITTED).size());
        model.addAttribute("confirmedCount", orderService.listByStatus(OrderStatus.CONFIRMED).size());
        return "admin/dashboard";
    }
}
