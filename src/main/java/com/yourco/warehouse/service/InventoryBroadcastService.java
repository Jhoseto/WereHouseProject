package com.yourco.warehouse.service;

import com.yourco.warehouse.dto.InventoryAdjustmentDTO;
import com.yourco.warehouse.dto.ProductAdminDTO;
import com.yourco.warehouse.dto.ProductStatsDTO;

/**
 * Service за broadcasting на inventory промени към всички свързани admin clients
 * Използва WebSocket/STOMP за real-time updates
 */
public interface InventoryBroadcastService {

    /**
     * Broadcast промяна в продукт (create, update)
     * Ще обнови таблицата на всички admin които гледат inventory
     */
    void broadcastProductUpdate(ProductAdminDTO product, String eventType);

    /**
     * Broadcast нова inventory корекция
     * Ще се покаже в Adjustments history на всички admin
     */
    void broadcastInventoryAdjustment(InventoryAdjustmentDTO adjustment);

    /**
     * Broadcast обновени статистики (KPI cards)
     * Ще обнови counters-ите на всички admin dashboard-ове
     */
    void broadcastStatsUpdate(ProductStatsDTO stats);
}