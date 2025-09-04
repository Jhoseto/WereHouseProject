package com.yourco.warehouse.dto;

import com.yourco.warehouse.entity.CartItem;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class CartItemDTO {

    @JsonProperty("id")
    private Long id;

    @JsonProperty("productId")
    private Long productId;

    @JsonProperty("sku")
    private String sku;

    @JsonProperty("name")
    private String name;

    @JsonProperty("price")
    private BigDecimal price;

    @JsonProperty("priceWithVat")
    private BigDecimal priceWithVat;

    @JsonProperty("quantity")
    private Integer quantity;

    @JsonProperty("totalPrice")
    private BigDecimal totalPrice;

    @JsonProperty("totalPriceWithVat")
    private BigDecimal totalPriceWithVat;

    @JsonProperty("unit")
    private String unit;

    @JsonProperty("available")
    private Integer available;

    @JsonProperty("updatedAt")
    private LocalDateTime updatedAt;

    // Constructors
    public CartItemDTO() {}

    // Factory method
    public static CartItemDTO from(CartItem cartItem) {
        CartItemDTO dto = new CartItemDTO();
        dto.setId(cartItem.getId());
        dto.setProductId(cartItem.getProduct().getId());
        dto.setSku(cartItem.getProduct().getSku());
        dto.setName(cartItem.getProduct().getName());
        dto.setPrice(cartItem.getProduct().getPrice());
        dto.setPriceWithVat(cartItem.getProduct().getPriceWithVat());
        dto.setQuantity(cartItem.getQuantity());
        dto.setUnit(cartItem.getProduct().getUnit());
        dto.setAvailable(cartItem.getProduct().getQuantityAvailable());
        dto.setUpdatedAt(cartItem.getUpdatedAt());

        // Calculated totals
        BigDecimal price = cartItem.getProduct().getPrice();
        BigDecimal priceWithVat = cartItem.getProduct().getPriceWithVat();
        BigDecimal quantity = BigDecimal.valueOf(cartItem.getQuantity());

        dto.setTotalPrice(price.multiply(quantity));
        dto.setTotalPriceWithVat(priceWithVat.multiply(quantity));

        return dto;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public BigDecimal getPriceWithVat() { return priceWithVat; }
    public void setPriceWithVat(BigDecimal priceWithVat) { this.priceWithVat = priceWithVat; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public BigDecimal getTotalPrice() { return totalPrice; }
    public void setTotalPrice(BigDecimal totalPrice) { this.totalPrice = totalPrice; }

    public BigDecimal getTotalPriceWithVat() { return totalPriceWithVat; }
    public void setTotalPriceWithVat(BigDecimal totalPriceWithVat) { this.totalPriceWithVat = totalPriceWithVat; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public Integer getAvailable() { return available; }
    public void setAvailable(Integer available) { this.available = available; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}