package com.yourco.warehouse.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ORDER ITEM DTO FOR API RESPONSES
 * ================================
 * Типизиран DTO за OrderItem данни в API отговори.
 */
public class OrderItemDTO {

    @JsonProperty("productId")
    private Long productId;

    @JsonProperty("productSku")
    private String productSku;

    @JsonProperty("productName")
    private String productName;

    @JsonProperty("quantity")
    private BigDecimal quantity;

    @JsonProperty("unit")
    private String unit;

    @JsonProperty("price")
    private BigDecimal price;

    @JsonProperty("totalPrice")
    private BigDecimal totalPrice;

    @JsonProperty("availableStock")
    private Integer availableStock;

    @JsonProperty("hasStockIssue")
    private boolean hasStockIssue;

    private Integer availableQuantity;

    @JsonProperty("category")
    private String category;

    private Boolean isLoaded;
    private LocalDateTime loadedAt;
    private String loadingNotes;




    // Constructors
    public OrderItemDTO() {}

    // Getters and Setters
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public String getProductSku() { return productSku; }
    public void setProductSku(String productSku) { this.productSku = productSku; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public BigDecimal getTotalPrice() { return totalPrice; }
    public void setTotalPrice(BigDecimal totalPrice) { this.totalPrice = totalPrice; }

    public Integer getAvailableStock() { return availableStock; }
    public void setAvailableStock(Integer availableStock) { this.availableStock = availableStock; }

    public boolean isHasStockIssue() { return hasStockIssue; }
    public void setHasStockIssue(boolean hasStockIssue) { this.hasStockIssue = hasStockIssue; }

    public Integer getAvailableQuantity() { return availableQuantity; }

    public void setAvailableQuantity(Integer availableQuantity) {
        this.availableQuantity = availableQuantity; }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Boolean getLoaded() {
        return isLoaded;
    }

    public void setLoaded(Boolean loaded) {
        isLoaded = loaded;
    }

    public LocalDateTime getLoadedAt() {
        return loadedAt;
    }

    public void setLoadedAt(LocalDateTime loadedAt) {
        this.loadedAt = loadedAt;
    }

    public String getLoadingNotes() {
        return loadingNotes;
    }

    public void setLoadingNotes(String loadingNotes) {
        this.loadingNotes = loadingNotes;
    }
}
