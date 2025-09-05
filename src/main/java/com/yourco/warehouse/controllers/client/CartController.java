package com.yourco.warehouse.controllers.client;

import com.yourco.warehouse.dto.CartDTO;
import com.yourco.warehouse.service.Impl.CartServiceImpl;
import com.yourco.warehouse.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    private final CartServiceImpl cartService;
    private final UserService userService;

    @Autowired
    public CartController(CartServiceImpl cartService, UserService userService) {
        this.cartService = cartService;
        this.userService = userService;
    }

    @GetMapping("/items")
    public ResponseEntity<CartDTO> getCartItems(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        Long userId = userService.getCurrentUser().getId();
        CartDTO cart = cartService.getCart(userId);
        return ResponseEntity.ok(cart);
    }

    @GetMapping(value = "/count", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> getCartCount(Authentication authentication) {
        Map<String, Object> response = new HashMap<>();

        // Проверка за authentication
        if (authentication == null || !authentication.isAuthenticated()) {
            response.put("count", 0);
            response.put("hasItems", false);
            return ResponseEntity.ok(response);
        }

        try {
            Long userId = userService.getCurrentUser().getId();
            Integer count = cartService.getCartItemCount(userId);
            boolean hasItems = cartService.hasItems(userId);

            response.put("count", count != null ? count : 0);
            response.put("hasItems", hasItems);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("count", 0);
            response.put("hasItems", false);
            return ResponseEntity.ok(response);
        }
    }

    @PostMapping(value = "/add", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> addToCart(
            @RequestParam Long productId,
            @RequestParam(defaultValue = "1") Integer quantity,
            Authentication authentication) {

        Map<String, Object> response = new HashMap<>();

        try {
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

            // Връщаме информация за количката
            Map<String, Object> cart = new HashMap<>();
            cart.put("totalItems", cartService.getCartItemCount(userId));
            cart.put("totalQuantity", cartService.getCartItems(userId)
                    .stream()
                    .mapToInt(i -> i.getQuantity())
                    .sum());
            response.put("cart", cart);

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            // БИЗНЕС ЛОГИКА ГРЕШКИ - връщаме 200 OK с error съобщение
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("errorType", "business"); // Маркираме като бизнес грешка

            // Добавяме информация за количката дори при грешка
            try {
                Long userId = userService.getCurrentUser().getId();
                Map<String, Object> cart = new HashMap<>();
                cart.put("totalItems", cartService.getCartItemCount(userId));
                response.put("cart", cart);
            } catch (Exception ignored) {
                // Игнорираме грешки при извличане на cart info
            }

            return ResponseEntity.ok(response); // 200 OK вместо 400 Bad Request
        } catch (Exception e) {
            // ТЕХНИЧЕСКИ ГРЕШКИ - връщаме 500
            response.put("success", false);
            response.put("error", "Възникна техническа грешка при добавяне в количката");
            response.put("errorType", "technical");
            return ResponseEntity.status(500).body(response);
        }
    }

    @PostMapping(value = "/update", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> updateQuantity(
            @RequestParam Long productId,
            @RequestParam Integer quantity,
            Authentication authentication) {

        Map<String, Object> response = new HashMap<>();

        try {
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
            } else {
                response.put("success", false);
                response.put("error", "Неуспешно обновяване на количеството");
            }

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", "Възникна грешка при обновяване на количеството");
            return ResponseEntity.status(500).body(response);
        }
    }

    @PostMapping(value = "/remove", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> removeFromCart(
            @RequestParam Long productId,
            Authentication authentication) {

        Map<String, Object> response = new HashMap<>();

        try {
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
            } else {
                response.put("success", false);
                response.put("error", "Неуспешно премахване на артикула");
            }

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", "Възникна грешка при премахване от количката");
            return ResponseEntity.status(500).body(response);
        }
    }

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

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("error", "Възникна грешка при изчистване на количката");
            return ResponseEntity.status(500).body(response);
        }
    }
}