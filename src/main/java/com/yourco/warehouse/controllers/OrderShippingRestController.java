package com.yourco.warehouse.controllers;

import com.yourco.warehouse.dto.DashboardDTO;
import com.yourco.warehouse.service.OrderShippingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * SHIPPED ORDER REST CONTROLLER - МИНИМАЛЕН КОД
 * ============================================
 * REST API за shipping операции - само заявки към сервизи
 * Без никаква бизнес логика - всичко е в сервизите
 */
@RestController
@RequestMapping("/employer/shipped")
@PreAuthorize("hasRole('ADMIN') or hasRole('EMPLOYER')")
public class OrderShippingRestController {


    private final OrderShippingService orderShippingService;

    @Autowired
    public OrderShippingRestController(OrderShippingService orderShippingService) {
        this.orderShippingService = orderShippingService;
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<DashboardDTO> getShippingOrderData(@PathVariable Long orderId) {
        try {
            DashboardDTO result = orderShippingService.loadShippingOrderData(orderId);

            if (result.getSuccess()) {
                return ResponseEntity.ok(result);
            } else {
                return ResponseEntity.badRequest().body(result);
            }

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(new DashboardDTO("Грешка при зареждане: " + e.getMessage()));
        }
    }

    @PostMapping("/confirm/{orderId}")
    public ResponseEntity<DashboardDTO> confirmShipping(
            @PathVariable Long orderId,
            @RequestBody Map<String, Object> requestData) {
        try {
            String truckNumber = (String) requestData.get("truckNumber");
            String shippingNote = (String) requestData.get("shippingNote");

            DashboardDTO result = orderShippingService.confirmOrderShipping(orderId, truckNumber, shippingNote);

            if (result.getSuccess()) {
                return ResponseEntity.ok(result);
            } else {
                return ResponseEntity.badRequest().body(result);
            }

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(new DashboardDTO("Грешка при потвърждаване: " + e.getMessage()));
        }
    }
}
