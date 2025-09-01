
package com.yourco.warehouse.web.controller.client;

import com.yourco.warehouse.domain.entity.Client;
import com.yourco.warehouse.domain.entity.Order;
import com.yourco.warehouse.domain.entity.User;
import com.yourco.warehouse.repository.OrderRepository;
import com.yourco.warehouse.repository.UserRepository;
import com.yourco.warehouse.service.OrderService;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

@Controller
public class OrderClientController {

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final OrderService orderService;

    public OrderClientController(UserRepository userRepository, OrderRepository orderRepository, OrderService orderService) {
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.orderService = orderService;
    }

    @GetMapping("/orders")
    public String myOrders(Model model, Authentication auth){
        UserDetails ud = (UserDetails) auth.getPrincipal();
        User u = userRepository.findByUsername(ud.getUsername()).orElseThrow();
        Client c = u.getClient();
        model.addAttribute("orders", orderService.listForClient(c));
        return "client/order-list";
    }

    @SuppressWarnings("unchecked")
    @GetMapping("/orders/submit")
    public String submitOrder(Authentication auth, HttpSession session){
        Map<String, com.yourco.warehouse.web.controller.client.CartController.CartLine> cart =
                (Map<String, com.yourco.warehouse.web.controller.client.CartController.CartLine>) session.getAttribute("CART");
        if(cart == null || cart.isEmpty()) return "redirect:/cart";

        String notes = (String) session.getAttribute("ORDER_NOTES");
        User u = userRepository.findByUsername(((UserDetails)auth.getPrincipal()).getUsername()).orElseThrow();
        Client c = u.getClient();

        // конвертиране към service DTO
        Map<String, OrderService.CartItem> svcCart = new LinkedHashMap<>();
        for (var e : cart.entrySet()){
            svcCart.put(e.getKey(), new OrderService.CartItem(
                    e.getValue().sku, BigDecimal.valueOf(e.getValue().qty), e.getValue().note
            ));
        }
        Order created = orderService.submitCart(c, svcCart, notes);
        // чистене на сесията
        session.removeAttribute("CART");
        session.removeAttribute("ORDER_NOTES");
        return "redirect:/orders/" + created.getId();
    }

    @GetMapping("/orders/{id}")
    public String orderDetail(@PathVariable Long id, Model model, Authentication auth){
        Order o = orderRepository.findById(id).orElseThrow();
        model.addAttribute("order", o);
        return "client/order-detail";
    }
}
