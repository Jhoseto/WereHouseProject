package com.yourco.warehouse.service;

import com.yourco.warehouse.dto.DashboardDTO;

import java.util.List;
import java.util.Map;

/**
 * ORDER SHIPPING SERVICE INTERFACE
 * Според shippingApi.js endpoints
 */
public interface OrderShippingService {

    // Order details for shipping interface - /{orderId}/details
    DashboardDTO getOrderDetails(Long orderId);

    // Shipping progress - /{orderId}/progress
    DashboardDTO getShippingProgress(Long orderId);

    // Item loading management - /{orderId}/item/{itemId}/loading-status
    DashboardDTO updateItemLoadingStatus(Long orderId, Long itemId, Boolean isLoaded, String notes);

    // Batch items loading - /{orderId}/items/batch-loading-status
    DashboardDTO batchUpdateItemsLoadingStatus(Long orderId, List<Map<String, Object>> itemUpdates);

    // Mark order as shipped - /{orderId}/mark-shipped
    DashboardDTO markOrderAsShipped(Long orderId, String shippingNotes);

    // Cancel shipping - /{orderId}/cancel-shipping
    DashboardDTO cancelShipping(Long orderId, String reason);

    // Add shipping note - /{orderId}/shipping-note
    DashboardDTO addShippingNote(Long orderId, String note);

    // Validate order for shipping - /{orderId}/validate
    DashboardDTO validateOrderForShipping(Long orderId);

    // Get shipping statistics - /statistics
    DashboardDTO getShippingStatistics(String timeframe);

    // Get ready orders - /ready
    DashboardDTO getOrdersReadyForShipping(Integer limit, Integer offset);
}