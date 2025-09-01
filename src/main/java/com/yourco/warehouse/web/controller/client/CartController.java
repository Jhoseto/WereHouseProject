
package com.yourco.warehouse.web.controller.client;

import com.yourco.warehouse.domain.entity.Product;
import com.yourco.warehouse.repository.ProductRepository;
import com.yourco.warehouse.service.OrderService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

@Controller
@Validated
public class CartController {

    private final ProductRepository productRepository;
    private final OrderService orderService;

    public CartController(ProductRepository productRepository, OrderService orderService) {
        this.productRepository = productRepository;
        this.orderService = orderService;
    }

    @SuppressWarnings("unchecked")
    private Map<String, CartLine> getCart(HttpSession session){
        Map<String, CartLine> cart = (Map<String, CartLine>) session.getAttribute("CART");
        if(cart == null){
            cart = new LinkedHashMap<>();
            session.setAttribute("CART", cart);
        }
        return cart;
    }

    @PostMapping("/cart/add")
    public String addToCart(@RequestParam @NotBlank String sku,
                            @RequestParam(defaultValue = "1") @Min(1) int qty,
                            HttpSession session){
        Product p = productRepository.findBySku(sku).orElseThrow();
        Map<String, CartLine> cart = getCart(session);
        CartLine line = cart.getOrDefault(sku, new CartLine(p.getSku(), p.getName(), p.getPrice(), 0, ""));
        line.qty += qty;
        cart.put(sku, line);
        return "redirect:/cart";
    }

    @GetMapping("/cart")
    public String viewCart(Model model, HttpSession session){
        model.addAttribute("cart", getCart(session).values());
        return "client/cart";
    }

    @PostMapping("/cart/update")
    public String updateCart(@RequestParam String sku, @RequestParam @Min(0) int qty,
                             @RequestParam(required = false) String note, HttpSession session){
        Map<String, CartLine> cart = getCart(session);
        if(qty<=0){ cart.remove(sku); }
        else {
            CartLine line = cart.get(sku);
            if(line != null){
                line.qty = qty;
                line.note = note == null ? "" : note;
            }
        }
        return "redirect:/cart";
    }

    @PostMapping("/cart/submit")
    public String submitCart(@RequestParam(required = false) String notes,
                             HttpSession session, Authentication auth){
        Map<String, CartLine> cart = getCart(session);
        if(cart.isEmpty()) return "redirect:/cart";

        // извличане на client от текущия потребител през SecurityContext -> в OrderClientController
        session.setAttribute("ORDER_NOTES", notes==null? "":notes);
        return "redirect:/orders/submit";
    }

    public static class CartLine {
        public String sku;
        public String name;
        public BigDecimal price;
        public int qty;
        public String note;
        public CartLine(String sku, String name, BigDecimal price, int qty, String note){
            this.sku=sku; this.name=name; this.price=price; this.qty=qty; this.note=note;
        }
        public BigDecimal total(){ return price.multiply(BigDecimal.valueOf(qty)); }
    }
}
