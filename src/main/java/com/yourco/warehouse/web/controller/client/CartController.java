package com.yourco.warehouse.web.controller.client;

import com.yourco.warehouse.entity.Product;
import com.yourco.warehouse.repository.ProductRepository;
import com.yourco.warehouse.service.OrderService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

@Controller
@Validated
public class CartController {

    private static final Logger logger = LoggerFactory.getLogger(CartController.class);
    private static final String CART_SESSION_KEY = "CART";

    private final ProductRepository productRepository;
    private final OrderService orderService;

    public CartController(ProductRepository productRepository, OrderService orderService) {
        this.productRepository = productRepository;
        this.orderService = orderService;
    }

    @SuppressWarnings("unchecked")
    private Map<String, CartLine> getCart(HttpSession session) {
        Map<String, CartLine> cart = (Map<String, CartLine>) session.getAttribute(CART_SESSION_KEY);
        if (cart == null) {
            cart = new LinkedHashMap<>();
            session.setAttribute(CART_SESSION_KEY, cart);
        }
        return cart;
    }

    @PostMapping("/cart/add")
    public String addToCart(@RequestParam @NotBlank String sku,
                            @RequestParam(defaultValue = "1") @Min(1) int qty,
                            HttpSession session,
                            Authentication auth,
                            RedirectAttributes redirectAttributes) {
        try {
            Product p = productRepository.findBySku(sku)
                    .orElseThrow(() -> new IllegalArgumentException("Продуктът с SKU " + sku + " не е намерен"));

            if (!p.isActive()) {
                throw new IllegalArgumentException("Продуктът " + sku + " не е активен");
            }

            if (p.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Продуктът " + sku + " няма валидна цена");
            }

            Map<String, CartLine> cart = getCart(session);
            CartLine line = cart.getOrDefault(sku, new CartLine(p.getSku(), p.getName(), p.getPrice(), 0, ""));
            line.qty += qty;
            cart.put(sku, line);

            logger.debug("Добавен продукт {} (количество: {}) в кошницата на потребител: {}",
                    sku, qty, auth.getName());

            redirectAttributes.addFlashAttribute("success",
                    "Добавен продукт \"" + p.getName() + "\" (количество: " + qty + ")");

        } catch (IllegalArgumentException e) {
            logger.warn("Грешка при добавяне на продукт в кошницата: {}", e.getMessage());
            redirectAttributes.addFlashAttribute("error", e.getMessage());
        } catch (Exception e) {
            logger.error("Неочаквана грешка при добавяне на продукт в кошницата", e);
            redirectAttributes.addFlashAttribute("error", "Възникна грешка при добавяне на продукта");
        }

        return "redirect:/cart";
    }

    @GetMapping("/cart")
    public String viewCart(Model model, HttpSession session) {
        Map<String, CartLine> cart = getCart(session);

        // Изчисляване на общо
        BigDecimal totalAmount = cart.values().stream()
                .map(CartLine::total)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        model.addAttribute("cart", cart.values());
        model.addAttribute("totalAmount", totalAmount);
        model.addAttribute("itemCount", cart.size());

        return "client/cart";
    }

    @PostMapping("/cart/update")
    public String updateCart(@RequestParam String sku,
                             @RequestParam @Min(0) int qty,
                             @RequestParam(required = false) String note,
                             HttpSession session,
                             Authentication auth,
                             RedirectAttributes redirectAttributes) {
        try {
            Map<String, CartLine> cart = getCart(session);

            if (qty <= 0) {
                CartLine removed = cart.remove(sku);
                if (removed != null) {
                    logger.debug("Премахнат продукт {} от кошницата на потребител: {}",
                            sku, auth.getName());
                    redirectAttributes.addFlashAttribute("info",
                            "Премахнат продукт \"" + removed.name + "\" от кошницата");
                }
            } else {
                CartLine line = cart.get(sku);
                if (line != null) {
                    int oldQty = line.qty;
                    line.qty = qty;
                    line.note = note != null ? note.trim() : "";

                    logger.debug("Обновен продукт {} в кошницата (стара к-во: {}, нова к-во: {}) за потребител: {}",
                            sku, oldQty, qty, auth.getName());

                    redirectAttributes.addFlashAttribute("success", "Обновен продукт \"" + line.name + "\"");
                } else {
                    redirectAttributes.addFlashAttribute("warning", "Продуктът не е намерен в кошницата");
                }
            }

        } catch (Exception e) {
            logger.error("Грешка при обновяване на кошницата", e);
            redirectAttributes.addFlashAttribute("error", "Възникна грешка при обновяване на кошницата");
        }

        return "redirect:/cart";
    }

    @PostMapping("/cart/submit")
    public String submitCart(@RequestParam(required = false) String notes,
                             HttpSession session,
                             Authentication auth,
                             RedirectAttributes redirectAttributes) {
        try {
            Map<String, CartLine> cart = getCart(session);
            if (cart.isEmpty()) {
                redirectAttributes.addFlashAttribute("warning", "Кошницата е празна");
                return "redirect:/cart";
            }

            // Валидация на всички продукти в кошницата
            for (CartLine line : cart.values()) {
                Product p = productRepository.findBySku(line.sku).orElse(null);
                if (p == null || !p.isActive()) {
                    redirectAttributes.addFlashAttribute("error",
                            "Продуктът \"" + line.name + "\" вече не е наличен. Моля, премахнете го от кошницата.");
                    return "redirect:/cart";
                }
            }

            // Запазване на бележките в сесията
            session.setAttribute("ORDER_NOTES", notes != null ? notes.trim() : "");

            logger.info("Потребител {} започва процеса на изпращане на заявка с {} продукта",
                    auth.getName(), cart.size());

            return "redirect:/orders/submit";

        } catch (Exception e) {
            logger.error("Грешка при подготовка за изпращане на заявката", e);
            redirectAttributes.addFlashAttribute("error", "Възникна грешка при обработка на заявката");
            return "redirect:/cart";
        }
    }

    @PostMapping("/cart/clear")
    public String clearCart(HttpSession session,
                            Authentication auth,
                            RedirectAttributes redirectAttributes) {
        session.removeAttribute(CART_SESSION_KEY);
        logger.info("Изчистена кошница на потребител: {}", auth.getName());
        redirectAttributes.addFlashAttribute("info", "Кошницата е изчистена");
        return "redirect:/cart";
    }

    public static class CartLine {
        public String sku;
        public String name;
        public BigDecimal price;
        public int qty;
        public String note;

        public CartLine(String sku, String name, BigDecimal price, int qty, String note) {
            this.sku = sku;
            this.name = name;
            this.price = price;
            this.qty = qty;
            this.note = note != null ? note : "";
        }

        public BigDecimal total() {
            return price.multiply(BigDecimal.valueOf(qty));
        }

        public String getFormattedTotal() {
            return String.format("%.2f", total().doubleValue());
        }
    }
}