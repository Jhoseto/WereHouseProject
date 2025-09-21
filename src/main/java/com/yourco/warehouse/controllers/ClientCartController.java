package com.yourco.warehouse.controllers;

import com.yourco.warehouse.dto.CartDTO;
import com.yourco.warehouse.entity.Order;
import com.yourco.warehouse.entity.UserEntity;
import com.yourco.warehouse.service.OrderService;
import com.yourco.warehouse.service.impl.CartServiceImpl;
import com.yourco.warehouse.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.CacheControl;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * OPTIMIZED CART CONTROLLER - ПРОИЗВОДИТЕЛНОСТ И CACHE
 * ==================================================
 */
@RestController
@RequestMapping("/api/cart")
public class ClientCartController {

    private static final Logger log = LoggerFactory.getLogger(ClientCartController.class);

    private final CartServiceImpl cartService;
    private final UserService userService;
    private final OrderService orderService;

    @Autowired
    public ClientCartController(CartServiceImpl cartService,
                                UserService userService,
                                OrderService orderService) {
        this.cartService = cartService;
        this.userService = userService;
        this.orderService = orderService;
    }

    /**
     * Получава всички артикули в количката с CACHE headers
     */
    @GetMapping("/items")
    public ResponseEntity<CartDTO> getCartItems(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }

        try {
            Long userId = userService.getCurrentUser().getId();
            CartDTO cart = cartService.getCart(userId);

            // Cache-контрол - не кешира ако има артикули (за актуални данни)
            CacheControl cacheControl = cart.getItems().isEmpty()
                    ? CacheControl.maxAge(30, TimeUnit.SECONDS)
                    : CacheControl.noCache();

            return ResponseEntity.ok()
                    .cacheControl(cacheControl)
                    .body(cart);

        } catch (Exception e) {
            log.error("Грешка при получаване на cart items за user: {}", userDetails.getUsername(), e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * Получава броя артикули с агресивен cache
     */
    @GetMapping(value = "/count", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> getCartCount(Authentication authentication) {
        Map<String, Object> response = new HashMap<>();

        // За non-authenticated users връща 0 с дълъг cache
        if (authentication == null || !authentication.isAuthenticated()) {
            response.put("count", 0);
            response.put("hasItems", false);
            return ResponseEntity.ok()
                    .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS))
                    .body(response);
        }

        try {
            Long userId = userService.getCurrentUser().getId();

            // ПОПРАВКА: Връща брой различни артикули, не общо количество
            Integer uniqueItemsCount = cartService.getCartItems(userId).size();
            boolean hasItems = cartService.hasItems(userId);

            response.put("count", uniqueItemsCount);
            response.put("hasItems", hasItems);

            // Кратък cache за count endpoint
            return ResponseEntity.ok()
                    .cacheControl(CacheControl.maxAge(10, TimeUnit.SECONDS))
                    .body(response);

        } catch (Exception e) {
            log.error("Грешка при получаване на cart count", e);
            response.put("count", 0);
            response.put("hasItems", false);
            return ResponseEntity.ok()
                    .cacheControl(CacheControl.noCache())
                    .body(response);
        }
    }

    /**
     * OPTIMIZED добавяне в количката с batch support
     */
    @PostMapping(value = "/add", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> addToCart(
            @RequestParam Long productId,
            @RequestParam(defaultValue = "1") Integer quantity,
            Authentication authentication) {

        Map<String, Object> response = new HashMap<>();

        try {
            // Валидация на входните данни
            if (productId == null || productId <= 0) {
                response.put("success", false);
                response.put("error", "Невалиден продукт");
                response.put("errorType", "validation");
                return ResponseEntity.badRequest().body(response);
            }

            if (quantity == null || quantity <= 0 || quantity > 999) {
                response.put("success", false);
                response.put("error", "Невалидно количество (1-999)");
                response.put("errorType", "validation");
                return ResponseEntity.badRequest().body(response);
            }

            // Проверка за authentication
            if (authentication == null || !authentication.isAuthenticated()) {
                response.put("success", false);
                response.put("error", "Моля, влезте в профила си");
                return ResponseEntity.status(401).body(response);
            }

            Long userId = userService.getCurrentUser().getId();

            // Сервизът връща съобщение при успех
            String message = cartService.addToCart(userId, productId, quantity);

            response.put("success", true);
            response.put("message", message);

            // OPTIMIZED: Връщаме актуални данни в един response
            Map<String, Object> cart = new HashMap<>();
            cart.put("totalItems", cartService.getCartItemCount(userId));
            cart.put("totalQuantity", cartService.getCartItems(userId)
                    .stream()
                    .mapToInt(i -> i.getQuantity())
                    .sum());
            response.put("cart", cart);

            log.debug("Успешно добавяне в количката: productId={}, quantity={}, userId={}",
                    productId, quantity, userId);

            return ResponseEntity.ok()
                    .cacheControl(CacheControl.noCache())
                    .body(response);

        } catch (IllegalArgumentException e) {
            // БИЗНЕС ЛОГИКА ГРЕШКИ - връщаме 200 OK с error съобщение
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("errorType", "business");

            // Добавяме актуална информация за количката дори при грешка
            try {
                Long userId = userService.getCurrentUser().getId();
                Map<String, Object> cart = new HashMap<>();
                cart.put("totalItems", cartService.getCartItemCount(userId));
                response.put("cart", cart);
            } catch (Exception ignored) {
                // Игнорираме грешки при извличане на cart info
            }

            log.warn("Бизнес грешка при добавяне в количката: {}", e.getMessage());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            // ТЕХНИЧЕСКИ ГРЕШКИ - връщаме 500
            log.error("Техническа грешка при добавяне в количката", e);
            response.put("success", false);
            response.put("error", "Възникна техническа грешка при добавяне в количката");
            response.put("errorType", "technical");
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * OPTIMIZED обновяване на количество
     */
    @PostMapping(value = "/update", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> updateQuantity(
            @RequestParam Long productId,
            @RequestParam Integer quantity,
            Authentication authentication) {

        Map<String, Object> response = new HashMap<>();

        try {
            // Валидация
            if (productId == null || productId <= 0) {
                response.put("success", false);
                response.put("error", "Невалиден продукт");
                return ResponseEntity.badRequest().body(response);
            }

            if (quantity == null || quantity <= 0 || quantity > 999) {
                response.put("success", false);
                response.put("error", "Невалидно количество (1-999)");
                return ResponseEntity.badRequest().body(response);
            }

            // Проверка за authentication
            if (authentication == null || !authentication.isAuthenticated()) {
                response.put("success", false);
                response.put("error", "Моля, влезте в профила си");
                return ResponseEntity.status(401).body(response);
            }

            Long userId = userService.getCurrentUser().getId();
            boolean success = cartService.updateQuantity(userId, productId, quantity);

            if (success) {
                response.put("success", true);
                response.put("message", "Количеството е обновено успешно");

                // Връщаме актуална информация за количката
                Map<String, Object> cart = new HashMap<>();
                cart.put("totalItems", cartService.getCartItemCount(userId));
                response.put("cart", cart);

                log.debug("Успешно обновяване на количество: productId={}, quantity={}, userId={}",
                        productId, quantity, userId);
            } else {
                response.put("success", false);
                response.put("error", "Неуспешно обновяване на количеството");
            }

            return ResponseEntity.ok()
                    .cacheControl(CacheControl.noCache())
                    .body(response);

        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("error", e.getMessage());
            log.warn("Валидационна грешка при обновяване: {}", e.getMessage());
            return ResponseEntity.badRequest().body(response);

        } catch (Exception e) {
            log.error("Грешка при обновяване на количество", e);
            response.put("success", false);
            response.put("error", "Възникна грешка при обновяване на количеството");
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * OPTIMIZED премахване от количката
     */
    @PostMapping(value = "/remove", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> removeFromCart(
            @RequestParam Long productId,
            Authentication authentication) {

        Map<String, Object> response = new HashMap<>();

        try {
            // Валидация
            if (productId == null || productId <= 0) {
                response.put("success", false);
                response.put("error", "Невалиден продукт");
                return ResponseEntity.badRequest().body(response);
            }

            // Проверка за authentication
            if (authentication == null || !authentication.isAuthenticated()) {
                response.put("success", false);
                response.put("error", "Моля, влезте в профила си");
                return ResponseEntity.status(401).body(response);
            }

            Long userId = userService.getCurrentUser().getId();
            boolean success = cartService.removeFromCart(userId, productId);

            if (success) {
                response.put("success", true);
                response.put("message", "Артикулът е премахнат успешно");

                // Връщаме актуална информация за количката
                Map<String, Object> cart = new HashMap<>();
                cart.put("totalItems", cartService.getCartItemCount(userId));
                response.put("cart", cart);

                log.debug("Успешно премахване от количката: productId={}, userId={}",
                        productId, userId);
            } else {
                response.put("success", false);
                response.put("error", "Неуспешно премахване на артикула");
            }

            return ResponseEntity.ok()
                    .cacheControl(CacheControl.noCache())
                    .body(response);

        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("error", e.getMessage());
            log.warn("Валидационна грешка при премахване: {}", e.getMessage());
            return ResponseEntity.badRequest().body(response);

        } catch (Exception e) {
            log.error("Грешка при премахване от количката", e);
            response.put("success", false);
            response.put("error", "Възникна грешка при премахване от количката");
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * OPTIMIZED изчистване на количката
     */
    @PostMapping(value = "/clear", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> clearCart(Authentication authentication) {
        Map<String, Object> response = new HashMap<>();

        try {
            // Проверка за authentication
            if (authentication == null || !authentication.isAuthenticated()) {
                response.put("success", false);
                response.put("error", "Моля, влезте в профила си");
                return ResponseEntity.status(401).body(response);
            }

            Long userId = userService.getCurrentUser().getId();
            int removedCount = cartService.clearCart(userId);

            response.put("success", true);
            response.put("message", "Количката е изчистена успешно");
            response.put("removedItems", removedCount);

            // Връщаме актуална информация за количката
            Map<String, Object> cart = new HashMap<>();
            cart.put("totalItems", 0);
            response.put("cart", cart);

            log.info("Успешно изчистване на количката: userId={}, removedItems={}",
                    userId, removedCount);

            return ResponseEntity.ok()
                    .cacheControl(CacheControl.noCache())
                    .body(response);

        } catch (Exception e) {
            log.error("Грешка при изчистване на количката", e);
            response.put("success", false);
            response.put("error", "Възникна грешка при изчистване на количката");
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Health check endpoint за cart service
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck(Authentication authentication) {
        Map<String, Object> response = new HashMap<>();

        try {
            if (authentication != null && authentication.isAuthenticated()) {
                Long userId = userService.getCurrentUser().getId();
                Integer count = cartService.getCartItemCount(userId);
                response.put("status", "healthy");
                response.put("cartItems", count);
            } else {
                response.put("status", "healthy");
                response.put("cartItems", 0);
            }

            return ResponseEntity.ok()
                    .cacheControl(CacheControl.maxAge(30, TimeUnit.SECONDS))
                    .body(response);

        } catch (Exception e) {
            log.error("Cart health check failed", e);
            response.put("status", "unhealthy");
            response.put("error", e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * API endpoint за създаване на поръчка от количката
     */
    @PostMapping("/checkout")
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


        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Възникна грешка при създаването на поръчката");
            return ResponseEntity.status(500).body(response);
        }

        return ResponseEntity.ok(response);
    }
}