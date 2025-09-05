package com.yourco.warehouse.dto;

import com.yourco.warehouse.entity.CartItem;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class CartItemDTO {

    @JsonProperty("productId")
    private Long productId;

    @JsonProperty("productSku")
    private String productSku;

    @JsonProperty("productName")
    private String productName;

    @JsonProperty("productUnit")
    private String productUnit;

    @JsonProperty("pricePerUnit")
    private BigDecimal pricePerUnit;

    @JsonProperty("quantity")
    private Integer quantity;

    @JsonProperty("totalPrice")
    private BigDecimal totalPrice;

    @JsonProperty("totalPriceWithVat")
    private BigDecimal totalPriceWithVat;

    @JsonProperty("available")
    private Integer available;

    @JsonProperty("hasStockIssue")
    private boolean hasStockIssue;

    @JsonProperty("updatedAt")
    private LocalDateTime updatedAt;

    // Constructors
    public CartItemDTO() {}

    // Factory method - БЕЗ бизнес логика, само мапване
    public static CartItemDTO from(CartItem cartItem, BigDecimal totalPrice, BigDecimal totalPriceWithVat) {
        CartItemDTO dto = new CartItemDTO();

        dto.productId = cartItem.getProduct().getId();
        dto.productSku = cartItem.getProduct().getSku();
        dto.productName = cartItem.getProduct().getName();
        dto.productUnit = cartItem.getProduct().getUnit();
        dto.pricePerUnit = cartItem.getProduct().getPrice();
        dto.quantity = cartItem.getQuantity();
        dto.available = cartItem.getProduct().getQuantityAvailable();
        dto.updatedAt = cartItem.getUpdatedAt();

        // Подавани отвън изчислени стойности
        dto.totalPrice = totalPrice;
        dto.totalPriceWithVat = totalPriceWithVat;

        // Проста проверка
        dto.hasStockIssue = cartItem.getQuantity() > cartItem.getProduct().getQuantityAvailable();

        return dto;
    }

    // Getters only - NO business logic
    public Long getProductId() { return productId; }
    public String getProductSku() { return productSku; }
    public String getProductName() { return productName; }
    public String getProductUnit() { return productUnit; }
    public BigDecimal getPricePerUnit() { return pricePerUnit; }
    public Integer getQuantity() { return quantity; }
    public BigDecimal getTotalPrice() { return totalPrice; }
    public BigDecimal getTotalPriceWithVat() { return totalPriceWithVat; }
    public Integer getAvailable() { return available; }
    public boolean isHasStockIssue() { return hasStockIssue; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}