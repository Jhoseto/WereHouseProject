package com.yourco.warehouse.service.impl;

import com.yourco.warehouse.dto.InventoryAdjustmentDTO;
import com.yourco.warehouse.dto.ProductAdminDTO;
import com.yourco.warehouse.dto.ProductStatsDTO;
import com.yourco.warehouse.service.InventoryBroadcastService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * МИНИМАЛНА ИМПЛЕМЕНТАЦИЯ - само необходимото за real-time updates
 * Използва същия WebSocket endpoint /ws/dashboard както и Dashboard-а
 */
@Service
public class InventoryBroadcastServiceImpl implements InventoryBroadcastService {

    private static final Logger log = LoggerFactory.getLogger(InventoryBroadcastServiceImpl.class);

    // WebSocket topics
    private static final String TOPIC_PRODUCTS = "/topic/inventory/products";
    private static final String TOPIC_ADJUSTMENTS = "/topic/inventory/adjustments";
    private static final String TOPIC_STATS = "/topic/inventory/stats";

    private final SimpMessagingTemplate messagingTemplate;

    public InventoryBroadcastServiceImpl(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
        log.info("InventoryBroadcastService initialized");
    }

    @Override
    public void broadcastProductUpdate(ProductAdminDTO product, String eventType) {
        try {
            log.debug("Broadcasting product update: {} - {}", eventType, product.getId());

            Map<String, Object> payload = new HashMap<>();
            payload.put("eventType", eventType); // "created", "updated", "deleted"
            payload.put("product", product);
            payload.put("timestamp", LocalDateTime.now());

            messagingTemplate.convertAndSend(TOPIC_PRODUCTS, payload);

            log.debug("Product update broadcasted successfully");
        } catch (Exception e) {
            log.error("Failed to broadcast product update", e);
        }
    }

    @Override
    public void broadcastInventoryAdjustment(InventoryAdjustmentDTO adjustment) {
        try {
            log.debug("Broadcasting inventory adjustment for product: {}", adjustment.getProductId());

            Map<String, Object> payload = new HashMap<>();
            payload.put("eventType", "adjustment");
            payload.put("adjustment", adjustment);
            payload.put("timestamp", LocalDateTime.now());

            messagingTemplate.convertAndSend(TOPIC_ADJUSTMENTS, payload);

            log.debug("Adjustment broadcasted successfully");
        } catch (Exception e) {
            log.error("Failed to broadcast adjustment", e);
        }
    }

    @Override
    public void broadcastStatsUpdate(ProductStatsDTO stats) {
        try {
            log.debug("Broadcasting stats update");

            Map<String, Object> payload = new HashMap<>();
            payload.put("stats", stats);
            payload.put("timestamp", LocalDateTime.now());

            messagingTemplate.convertAndSend(TOPIC_STATS, payload);

            log.debug("Stats update broadcasted successfully");
        } catch (Exception e) {
            log.error("Failed to broadcast stats", e);
        }
    }
}