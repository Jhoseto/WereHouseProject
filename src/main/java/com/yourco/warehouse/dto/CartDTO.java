package com.yourco.warehouse.dto;

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

    @JsonProperty("totalWithoutVat")
    private BigDecimal totalWithoutVat;

    @JsonProperty("totalWithVat")
    private BigDecimal totalWithVat;

    @JsonProperty("vatAmount")
    private BigDecimal vatAmount;

    @JsonProperty("isEmpty")
    private boolean isEmpty;

    // Constructors
    public CartDTO() {}

    // Factory method БЕЗ логика - всичко се подава отвън
    public static CartDTO create(
            List<CartItemDTO> items,
            Integer totalItems,
            Integer totalQuantity,
            BigDecimal totalWithoutVat,
            BigDecimal totalWithVat,
            BigDecimal vatAmount) {

        CartDTO dto = new CartDTO();
        dto.items = items;
        dto.totalItems = totalItems;
        dto.totalQuantity = totalQuantity;
        dto.totalWithoutVat = totalWithoutVat;
        dto.totalWithVat = totalWithVat;
        dto.vatAmount = vatAmount;
        dto.isEmpty = items == null || items.isEmpty();

        return dto;
    }

    // Getters only - NO setters, NO business logic
    public List<CartItemDTO> getItems() { return items; }
    public Integer getTotalItems() { return totalItems; }
    public Integer getTotalQuantity() { return totalQuantity; }
    public BigDecimal getTotalWithoutVat() { return totalWithoutVat; }
    public BigDecimal getTotalWithVat() { return totalWithVat; }
    public BigDecimal getVatAmount() { return vatAmount; }
    public boolean isEmpty() { return isEmpty; }
}