package com.yourco.warehouse.controllers;

import com.yourco.warehouse.entity.enums.OrderStatus;
import com.yourco.warehouse.entity.Order;
import com.yourco.warehouse.entity.UserEntity;
import com.yourco.warehouse.service.OrderService;
import com.yourco.warehouse.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Controller
public class OrderController {

    private static final Logger log = LoggerFactory.getLogger(OrderController.class);

    private final OrderService orderService;
    private final UserService userService;

    @Autowired
    public OrderController(OrderService orderService, UserService userService) {
        this.orderService = orderService;
        this.userService = userService;
    }

    /**
     * API endpoint за създаване на поръчка от количката
     */
    @PostMapping("/api/cart/checkout")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> checkoutCart(@RequestParam(required = false) String notes,
                                                            Authentication authentication) {
        Map<String, Object> response = new HashMap<>();

        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                response.put("success", false);
                response.put("message", "Трябва да сте влезли в системата");
                return ResponseEntity.status(401).body(response);
            }

            UserEntity currentUser = userService.getCurrentUser();
            Order order = orderService.createOrderFromCart(currentUser.getId(), notes);

            response.put("success", true);
            response.put("message", "Поръчката е създадена успешно");
            response.put("orderId", order.getId());
            response.put("redirectUrl", "/orders/" + order.getId());

            log.info("Клиент {} създаде поръчка #{}", currentUser.getUsername(), order.getId());

        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            log.error("Грешка при създаване на поръчка: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "Възникна грешка при създаването на поръчката");
            return ResponseEntity.status(500).body(response);
        }

        return ResponseEntity.ok(response);
    }

    /**
     * Страница със списък на поръчките на клиента
     */
    @GetMapping("/orders")
    public String listOrders(Model model, Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return "redirect:/";
            }

            UserEntity currentUser = userService.getCurrentUser();
            List<Order> orders = orderService.getOrdersForClient(currentUser.getId());

            model.addAttribute("orders", orders);
            model.addAttribute("pageTitle", "Моите поръчки");

            return "client/orders";
        } catch (Exception e) {
            log.error("Грешка при зареждане на поръчки: {}", e.getMessage(), e);
            model.addAttribute("error", "Възникна грешка при зареждане на поръчките");
            return "error/general";
        }
    }

    /**
     * Детайлна страница за конкретна поръчка
     */
    @GetMapping("/orders/{orderId}")
    public String viewOrder(@PathVariable Long orderId,
                            Model model,
                            Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return "redirect:/";
            }

            UserEntity currentUser = userService.getCurrentUser();
            Optional<Order> orderOpt = orderService.getOrderByIdForClient(orderId, currentUser.getId());

            if (orderOpt.isEmpty()) {
                model.addAttribute("error", "Поръчката не е намерена");
                return "error/404";
            }

            Order order = orderOpt.get();
            model.addAttribute("order", order);
            model.addAttribute("canEdit", orderService.canEditOrder(order));
            model.addAttribute("pageTitle", "Поръчка №" + order.getId());

            return "client/order-detail";
        } catch (Exception e) {
            log.error("Грешка при зареждане на поръчка {}: {}", orderId, e.getMessage(), e);
            model.addAttribute("error", "Възникна грешка при зареждане на поръчката");
            return "error/general";
        }
    }

    /**
     * API endpoint за обновяване на количество в поръчка
     */
    @PostMapping("/api/orders/{orderId}/items/{productId}/quantity")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> updateOrderItemQuantity(@PathVariable Long orderId,
                                                                       @PathVariable Long productId,
                                                                       @RequestParam Integer quantity,
                                                                       Authentication authentication) {
        Map<String, Object> response = new HashMap<>();

        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                response.put("success", false);
                response.put("message", "Трябва да сте влезли в системата");
                return ResponseEntity.status(401).body(response);
            }

            UserEntity currentUser = userService.getCurrentUser();
            boolean success = orderService.updateOrderItemQuantity(orderId, productId, quantity, currentUser.getId());

            if (success) {
                response.put("success", true);
                response.put("message", "Количеството е обновено успешно");
            } else {
                response.put("success", false);
                response.put("message", "Грешка при обновяване на количеството");
            }

        } catch (IllegalArgumentException | IllegalStateException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            log.error("Грешка при обновяване на количество: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "Възникна грешка при обновяването");
            return ResponseEntity.status(500).body(response);
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/orders/count")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getOrdersCount(Authentication authentication) {
        Map<String, Object> response = new HashMap<>();

        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                response.put("pendingCount", 0);
                response.put("totalCount", 0);
                return ResponseEntity.ok(response);
            }

            UserEntity currentUser = userService.getCurrentUser();
            List<Order> orders = orderService.getOrdersForClient(currentUser.getId());

            long pendingCount = orders.stream()
                    .filter(order -> order.getStatus() == OrderStatus.SUBMITTED)
                    .count();

            response.put("pendingCount", pendingCount);
            response.put("totalCount", orders.size());
            response.put("success", true);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Грешка при получаване на броя поръчки: {}", e.getMessage(), e);
            response.put("pendingCount", 0);
            response.put("totalCount", 0);
            response.put("success", false);
            response.put("message", "Грешка при зареждане на данните");
            return ResponseEntity.ok(response); // Връщаме OK за да не нарушаваме frontend-а
        }
    }

    /**
     * API endpoint за премахване на артикул от поръчка
     */
    @DeleteMapping("/api/orders/{orderId}/items/{productId}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> removeOrderItem(@PathVariable Long orderId,
                                                               @PathVariable Long productId,
                                                               Authentication authentication) {
        Map<String, Object> response = new HashMap<>();

        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                response.put("success", false);
                response.put("message", "Трябва да сте влезли в системата");
                return ResponseEntity.status(401).body(response);
            }

            UserEntity currentUser = userService.getCurrentUser();
            boolean success = orderService.removeOrderItem(orderId, productId, currentUser.getId());

            if (success) {
                response.put("success", true);
                response.put("message", "Артикулът е премахнат успешно");
            } else {
                response.put("success", false);
                response.put("message", "Грешка при премахване на артикула");
            }

        } catch (IllegalArgumentException | IllegalStateException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            log.error("Грешка при премахване на артикул: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "Възникна грешка при премахването");
            return ResponseEntity.status(500).body(response);
        }

        return ResponseEntity.ok(response);
    }
}