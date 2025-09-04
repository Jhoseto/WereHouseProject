package com.yourco.warehouse.dto;

import com.yourco.warehouse.entity.CartItem;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.List;

public class CartDTO {

    @JsonProperty("items")
    private List<CartItemDTO> items;

    @JsonProperty("totalItems")
    private Integer totalItems;

    @JsonProperty("totalQuantity")
    private Integer totalQuantity;

    @JsonProperty("totalPrice")
    private BigDecimal totalPrice;

    @JsonProperty("totalPriceWithVat")
    private BigDecimal totalPriceWithVat;

    @JsonProperty("isEmpty")
    private boolean isEmpty;

    // Constructors
    public CartDTO() {}

    public CartDTO(List<CartItemDTO> items) {
        this.items = items;
        calculateTotals();
    }

    // Factory method
    public static CartDTO from(List<CartItem> cartItems) {
        List<CartItemDTO> itemDTOs = cartItems.stream()
                .map(CartItemDTO::from)
                .toList();

        return new CartDTO(itemDTOs);
    }

    // Calculate totals
    private void calculateTotals() {
        if (items == null || items.isEmpty()) {
            this.totalItems = 0;
            this.totalQuantity = 0;
            this.totalPrice = BigDecimal.ZERO;
            this.totalPriceWithVat = BigDecimal.ZERO;
            this.isEmpty = true;
            return;
        }

        this.totalItems = items.size();
        this.totalQuantity = items.stream()
                .mapToInt(CartItemDTO::getQuantity)
                .sum();

        this.totalPrice = items.stream()
                .map(CartItemDTO::getTotalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        this.totalPriceWithVat = items.stream()
                .map(CartItemDTO::getTotalPriceWithVat)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        this.isEmpty = false;
    }

    // Getters and Setters
    public List<CartItemDTO> getItems() { return items; }
    public void setItems(List<CartItemDTO> items) {
        this.items = items;
        calculateTotals();
    }

    public Integer getTotalItems() { return totalItems; }
    public void setTotalItems(Integer totalItems) { this.totalItems = totalItems; }

    public Integer getTotalQuantity() { return totalQuantity; }
    public void setTotalQuantity(Integer totalQuantity) { this.totalQuantity = totalQuantity; }

    public BigDecimal getTotalPrice() { return totalPrice; }
    public void setTotalPrice(BigDecimal totalPrice) { this.totalPrice = totalPrice; }

    public BigDecimal getTotalPriceWithVat() { return totalPriceWithVat; }
    public void setTotalPriceWithVat(BigDecimal totalPriceWithVat) { this.totalPriceWithVat = totalPriceWithVat; }

    public boolean isEmpty() { return isEmpty; }
    public void setEmpty(boolean empty) { isEmpty = empty; }
}