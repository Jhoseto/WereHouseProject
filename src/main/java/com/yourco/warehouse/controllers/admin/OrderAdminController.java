package com.yourco.warehouse.controllers.admin;

import com.yourco.warehouse.entity.Order;
import com.yourco.warehouse.entity.enums.OrderStatus;
import com.yourco.warehouse.repository.OrderRepository;
import com.yourco.warehouse.service.OrderService;
import com.yourco.warehouse.utils.RequestUtils;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.Arrays;

@Controller
@RequestMapping("/admin/orders")
public class OrderAdminController {

    private static final Logger logger = LoggerFactory.getLogger(OrderAdminController.class);

    private final OrderRepository orderRepository;
    private final OrderService orderService;

    public OrderAdminController(OrderRepository orderRepository, OrderService orderService) {
        this.orderRepository = orderRepository;
        this.orderService = orderService;
    }

    @GetMapping("")
    public String list(@RequestParam(required = false) OrderStatus status,
                       @RequestParam(defaultValue = "0") int page,
                       @RequestParam(defaultValue = "20") int size,
                       Model model) {

        Pageable pageable = PageRequest.of(page, size);
        Page<Order> orders;

        if (status == null) {
            orders = orderService.listAllPaginated(pageable);
        } else {
            orders = orderService.listByStatusPaginated(status, pageable);
        }

        model.addAttribute("orders", orders);
        model.addAttribute("status", status);
        model.addAttribute("allStatuses", Arrays.asList(OrderStatus.values()));
        model.addAttribute("currentPage", page);
        model.addAttribute("totalPages", orders.getTotalPages());
        model.addAttribute("totalElements", orders.getTotalElements());

        // Статистики
        model.addAttribute("submittedCount", orderRepository.countByStatus(OrderStatus.SUBMITTED));
        model.addAttribute("confirmedCount", orderRepository.countByStatus(OrderStatus.CONFIRMED));
        model.addAttribute("shippedCount", orderRepository.countByStatus(OrderStatus.SHIPPED));
        model.addAttribute("cancelledCount", orderRepository.countByStatus(OrderStatus.CANCELLED));

        return "admin/orders";
    }

    @GetMapping("/{id}")
    public String detail(@PathVariable Long id, Model model, RedirectAttributes redirectAttributes) {
        try {
            Order o = orderRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Заявката не е намерена"));

            model.addAttribute("order", o);
            model.addAttribute("canConfirm", o.getStatus() == OrderStatus.SUBMITTED);
            model.addAttribute("canCancel", o.getStatus() != OrderStatus.SHIPPED && o.getStatus() != OrderStatus.CANCELLED);

            return "admin/order-detail";

        } catch (Exception e) {
            logger.error("Грешка при зареждане на заявка #{}", id, e);
            redirectAttributes.addFlashAttribute("error", "Грешка при зареждане на заявката: " + e.getMessage());
            return "redirect:/admin/orders";
        }
    }

    @PostMapping("/{id}/confirm")
    public String confirm(@PathVariable Long id,
                          Authentication auth,
                          HttpServletRequest request,
                          RedirectAttributes redirectAttributes) {
        try {
            Order o = orderRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Заявката не е намерена"));

            String userAgent = RequestUtils.getUserAgent(request);
            String ipAddress = RequestUtils.getClientIpAddress(request);

            orderService.confirmOrder(o, auth.getName(), userAgent, ipAddress);

            redirectAttributes.addFlashAttribute("success",
                    "Заявка #" + id + " е потвърдена успешно");

            logger.info("Администратор {} потвърди заявка #{}", auth.getName(), id);

        } catch (IllegalStateException e) {
            logger.warn("Опит за потвърждаване на заявка #{} в невалиден статус: {}", id, e.getMessage());
            redirectAttributes.addFlashAttribute("warning", e.getMessage());
        } catch (Exception e) {
            logger.error("Грешка при потвърждаване на заявка #{}", id, e);
            redirectAttributes.addFlashAttribute("error", "Грешка при потвърждаване: " + e.getMessage());
        }

        return "redirect:/admin/orders/" + id;
    }

    @PostMapping("/{id}/cancel")
    public String cancel(@PathVariable Long id,
                         @RequestParam(required = false) String reason,
                         Authentication auth,
                         HttpServletRequest request,
                         RedirectAttributes redirectAttributes) {
        try {
            Order o = orderRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Заявката не е намерена"));

            if (reason == null || reason.trim().isEmpty()) {
                redirectAttributes.addFlashAttribute("warning", "Моля въведете причина за отмяната");
                return "redirect:/admin/orders/" + id;
            }

            String userAgent = RequestUtils.getUserAgent(request);
            String ipAddress = RequestUtils.getClientIpAddress(request);

            orderService.cancelOrder(o, reason.trim(), auth.getName(), userAgent, ipAddress);

            redirectAttributes.addFlashAttribute("success",
                    "Заявка #" + id + " е отменена успешно");

            logger.info("Администратор {} отмени заявка #{} с причина: {}", auth.getName(), id, reason);

        } catch (IllegalStateException e) {
            logger.warn("Опит за отмяна на заявка #{} в невалиден статус: {}", id, e.getMessage());
            redirectAttributes.addFlashAttribute("warning", e.getMessage());
        } catch (Exception e) {
            logger.error("Грешка при отмяна на заявка #{}", id, e);
            redirectAttributes.addFlashAttribute("error", "Грешка при отмяна: " + e.getMessage());
        }

        return "redirect:/admin/orders/" + id;
    }

    @PostMapping("/{id}/ship")
    public String ship(@PathVariable Long id,
                       @RequestParam(required = false) String trackingNumber,
                       Authentication auth,
                       HttpServletRequest request,
                       RedirectAttributes redirectAttributes) {
        try {
            Order o = orderRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Заявката не е намерена"));

            if (o.getStatus() != OrderStatus.CONFIRMED) {
                throw new IllegalStateException("Може да се изпращат само потвърдени заявки");
            }

            o.setStatus(OrderStatus.SHIPPED);
            if (trackingNumber != null && !trackingNumber.trim().isEmpty()) {
                o.setNotes(o.getNotes() + "\n[ИЗПРАТЕНА] Tracking: " + trackingNumber.trim());
            }
            orderRepository.save(o);

            redirectAttributes.addFlashAttribute("success",
                    "Заявка #" + id + " е маркирана като изпратена");

            logger.info("Администратор {} маркира заявка #{} като изпратена", auth.getName(), id);

        } catch (Exception e) {
            logger.error("Грешка при маркиране на заявка #{} като изпратена", id, e);
            redirectAttributes.addFlashAttribute("error", "Грешка при обновяване: " + e.getMessage());
        }

        return "redirect:/admin/orders/" + id;
    }
}