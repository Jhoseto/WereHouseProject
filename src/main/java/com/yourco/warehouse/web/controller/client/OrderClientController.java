package com.yourco.warehouse.web.controller.client;

import com.yourco.warehouse.entity.Client;
import com.yourco.warehouse.entity.Order;
import com.yourco.warehouse.entity.User;
import com.yourco.warehouse.exception.AccessDeniedException;
import com.yourco.warehouse.repository.OrderRepository;
import com.yourco.warehouse.repository.UserRepository;
import com.yourco.warehouse.service.OrderService;
import com.yourco.warehouse.util.RequestUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

@Controller
public class OrderClientController {

    private static final Logger logger = LoggerFactory.getLogger(OrderClientController.class);

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final OrderService orderService;

    public OrderClientController(UserRepository userRepository, OrderRepository orderRepository, OrderService orderService) {
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.orderService = orderService;
    }

    @GetMapping("/orders")
    public String myOrders(@RequestParam(defaultValue = "0") int page,
                           @RequestParam(defaultValue = "10") int size,
                           Model model,
                           Authentication auth) {
        UserDetails ud = (UserDetails) auth.getPrincipal();
        User u = userRepository.findByUsername(ud.getUsername()).orElseThrow();
        Client c = u.getClient();

        if (c == null) {
            throw new AccessDeniedException("Потребителят няма свързан клиент");
        }

        Pageable pageable = PageRequest.of(page, size);
        Page<Order> orders = orderService.listForClientPaginated(c, pageable);

        model.addAttribute("orders", orders);
        model.addAttribute("currentPage", page);
        model.addAttribute("totalPages", orders.getTotalPages());
        model.addAttribute("totalElements", orders.getTotalElements());

        return "client/order-list";
    }

    @SuppressWarnings("unchecked")
    @GetMapping("/orders/submit")
    public String submitOrder(Authentication auth,
                              HttpSession session,
                              HttpServletRequest request) {
        try {
            Map<String, com.yourco.warehouse.web.controller.client.CartController.CartLine> cart =
                    (Map<String, com.yourco.warehouse.web.controller.client.CartController.CartLine>) session.getAttribute("CART");

            if (cart == null || cart.isEmpty()) {
                logger.warn("Опит за изпращане на празна кошница от потребител: {}", auth.getName());
                return "redirect:/cart";
            }

            String notes = (String) session.getAttribute("ORDER_NOTES");
            UserDetails ud = (UserDetails) auth.getPrincipal();
            User u = userRepository.findByUsername(ud.getUsername()).orElseThrow();
            Client c = u.getClient();

            if (c == null) {
                throw new AccessDeniedException("Потребителят няма свързан клиент");
            }

            // Конвертиране към service DTO
            Map<String, OrderService.CartItem> svcCart = new LinkedHashMap<>();
            for (var e : cart.entrySet()) {
                svcCart.put(e.getKey(), new OrderService.CartItem(
                        e.getValue().sku, BigDecimal.valueOf(e.getValue().qty), e.getValue().note
                ));
            }

            // Извличане на request metadata
            String userAgent = RequestUtils.getUserAgent(request);
            String ipAddress = RequestUtils.getClientIpAddress(request);

            Order created = orderService.submitCart(c, svcCart, notes, userAgent, ipAddress);

            // Чистене на сесията
            session.removeAttribute("CART");
            session.removeAttribute("ORDER_NOTES");

            logger.info("Създадена заявка #{} от потребител: {}", created.getId(), auth.getName());

            return "redirect:/orders/" + created.getId();

        } catch (Exception e) {
            logger.error("Грешка при изпращане на заявка от потребител: {}", auth.getName(), e);
            session.setAttribute("error", "Възникна грешка при изпращане на заявката: " + e.getMessage());
            return "redirect:/cart";
        }
    }

    @GetMapping("/orders/{id}")
    public String orderDetail(@PathVariable Long id,
                              Model model,
                              Authentication auth) {
        try {
            Order o = orderRepository.findById(id)
                    .orElseThrow(() -> new AccessDeniedException("Заявката не е намерена"));

            UserDetails ud = (UserDetails) auth.getPrincipal();
            User currentUser = userRepository.findByUsername(ud.getUsername()).orElseThrow();

            // Проверка за достъп
            if (!orderService.canUserAccessOrder(o, currentUser)) {
                logger.warn("Неоторизиран достъп до заявка #{} от потребител: {}", id, auth.getName());
                throw new AccessDeniedException("Няmate право да разглеждате тази заявка");
            }

            model.addAttribute("order", o);
            return "client/order-detail";

        } catch (AccessDeniedException e) {
            model.addAttribute("error", e.getMessage());
            return "error/access-denied";
        } catch (Exception e) {
            logger.error("Грешка при зареждане на заявка #{}", id, e);
            model.addAttribute("error", "Възникна грешка при зареждане на заявката");
            return "error/general";
        }
    }
}