
package com.yourco.warehouse.web.controller.admin;

import com.yourco.warehouse.domain.entity.Order;
import com.yourco.warehouse.domain.enums.OrderStatus;
import com.yourco.warehouse.repository.OrderRepository;
import com.yourco.warehouse.service.OrderService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@RequestMapping("/admin/orders")
public class OrderAdminController {

    private final OrderRepository orderRepository;
    private final OrderService orderService;

    public OrderAdminController(OrderRepository orderRepository, OrderService orderService) {
        this.orderRepository = orderRepository;
        this.orderService = orderService;
    }

    @GetMapping("")
    public String list(@RequestParam(required = false) OrderStatus status, Model model){
        List<Order> orders = (status == null)
                ? orderRepository.findAll()
                : orderService.listByStatus(status);
        model.addAttribute("orders", orders);
        model.addAttribute("status", status);
        return "admin/orders";
    }

    @GetMapping("/{id}")
    public String detail(@PathVariable Long id, Model model){
        Order o = orderRepository.findById(id).orElseThrow();
        model.addAttribute("order", o);
        return "admin/order-confirm";
    }

    @PostMapping("/{id}/confirm")
    public String confirm(@PathVariable Long id){
        Order o = orderRepository.findById(id).orElseThrow();
        orderService.confirmOrder(o);
        return "redirect:/admin/orders/" + id;
    }
}
