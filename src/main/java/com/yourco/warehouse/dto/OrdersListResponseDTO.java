package com.yourco.warehouse.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * ORDERS LIST RESPONSE DTO
 * ========================
 * Специализиран DTO за списъци с поръчки.
 */
public class OrdersListResponseDTO {

    @JsonProperty("orders")
    private List<OrderDTO> orders;

    @JsonProperty("totalCount")
    private int totalCount;

    @JsonProperty("status")
    private String status;

    @JsonProperty("hasMore")
    private boolean hasMore;

    // Constructors
    public OrdersListResponseDTO() {}

    public OrdersListResponseDTO(List<OrderDTO> orders, String status) {
        this.orders = orders;
        this.totalCount = orders != null ? orders.size() : 0;
        this.status = status;
        this.hasMore = false; // Can be calculated based on pagination
    }

    // Getters and Setters
    public List<OrderDTO> getOrders() { return orders; }
    public void setOrders(List<OrderDTO> orders) { this.orders = orders; }

    public int getTotalCount() { return totalCount; }
    public void setTotalCount(int totalCount) { this.totalCount = totalCount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isHasMore() { return hasMore; }
    public void setHasMore(boolean hasMore) { this.hasMore = hasMore; }
}
