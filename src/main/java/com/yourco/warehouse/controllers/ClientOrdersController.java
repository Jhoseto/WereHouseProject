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

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Controller
public class ClientOrdersController {

    private static final Logger log = LoggerFactory.getLogger(ClientOrdersController.class);

    private final OrderService orderService;
    private final UserService userService;

    @Autowired
    public ClientOrdersController(OrderService orderService, UserService userService) {
        this.orderService = orderService;
        this.userService = userService;
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

            return "order-detail";
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
                    .filter(order -> order.getStatus() == OrderStatus.PENDING)
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

    /**
     * НОВ API endpoint за batch обновяване на поръчка
     */
    @PutMapping("/api/orders/{orderId}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> updateOrderBatch(@PathVariable Long orderId,
                                                                @RequestBody Map<String, Object> requestBody,
                                                                Authentication authentication) {
        Map<String, Object> response = new HashMap<>();

        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                response.put("success", false);
                response.put("message", "Трябва да сте влезли в системата");
                return ResponseEntity.status(401).body(response);
            }

            UserEntity currentUser = userService.getCurrentUser();

            // Извличане на items от request body
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> items = (List<Map<String, Object>>) requestBody.get("items");

            if (items == null) {
                response.put("success", false);
                response.put("message", "Липсват данни за артикулите");
                return ResponseEntity.badRequest().body(response);
            }

            // Конвертиране в Map<Long, Integer>
            Map<Long, Integer> itemUpdates = new HashMap<>();
            for (Map<String, Object> item : items) {
                try {
                    Long productId = Long.valueOf(item.get("productId").toString());
                    Integer quantity = Integer.valueOf(item.get("quantity").toString());
                    itemUpdates.put(productId, quantity);
                } catch (Exception e) {
                    response.put("success", false);
                    response.put("message", "Невалидни данни за артикул: " + item);
                    return ResponseEntity.badRequest().body(response);
                }
            }

            // Извикване на batch update метода
            Map<String, Object> result = orderService.updateOrderBatch(orderId, itemUpdates, currentUser.getId());

            return ResponseEntity.ok(result);

        } catch (IllegalArgumentException | IllegalStateException e) {
            log.warn("Валидационна грешка при batch обновяване на поръчка {}: {}", orderId, e.getMessage());
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);

        } catch (Exception e) {
            log.error("Грешка при batch обновяване на поръчка {}: {}", orderId, e.getMessage(), e);
            response.put("success", false);
            response.put("message", "Възникна грешка при обновяването на поръчката");
            return ResponseEntity.status(500).body(response);
        }
    }
}