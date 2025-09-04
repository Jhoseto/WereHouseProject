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
        response.put("count", 0);
        response.put("hasItems", false);
        return ResponseEntity.ok(response);
    }

    @PostMapping(value = "/add", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> addToCart(
            @RequestParam Long productId,
            @RequestParam(defaultValue = "1") Integer quantity,
            Authentication authentication) {

        Map<String, Object> response = new HashMap<>();

        try {
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

        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }


    @PutMapping(value = "/update", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> updateQuantity(
            @RequestParam Long productId,
            @RequestParam Integer quantity,
            Authentication authentication) {

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Количеството е обновено успешно");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping(value = "/remove", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> removeFromCart(
            @RequestParam Long productId,
            Authentication authentication) {

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Артикулът е премахнат успешно");
        return ResponseEntity.ok(response);
    }
}