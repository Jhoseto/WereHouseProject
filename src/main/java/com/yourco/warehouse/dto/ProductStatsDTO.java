package com.yourco.warehouse.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

/**
 * DTO за inventory статистики (за KPI cards)
 */
public class ProductStatsDTO {

    @JsonProperty("totalProducts")
    private long totalProducts;

    @JsonProperty("activeProducts")
    private long activeProducts;

    @JsonProperty("lowStockCount")
    private long lowStockCount;

    @JsonProperty("outOfStockCount")
    private long outOfStockCount;

    @JsonProperty("totalInventoryValue")
    private BigDecimal totalInventoryValue;

    @JsonProperty("totalInventoryValueWithVat")  // ✅ С ДДС (точно изчислена)
    private BigDecimal totalInventoryValueWithVat;

    @JsonProperty("categoriesCount")
    private long categoriesCount;

    // Constructors
    public ProductStatsDTO() {}

    public ProductStatsDTO(long totalProducts, long activeProducts, long lowStockCount,
                           long outOfStockCount, BigDecimal totalInventoryValue, long categoriesCount) {
        this.totalProducts = totalProducts;
        this.activeProducts = activeProducts;
        this.lowStockCount = lowStockCount;
        this.outOfStockCount = outOfStockCount;
        this.totalInventoryValue = totalInventoryValue;
        this.categoriesCount = categoriesCount;
    }

    // Getters and Setters
    public long getTotalProducts() { return totalProducts; }
    public void setTotalProducts(long totalProducts) { this.totalProducts = totalProducts; }

    public long getActiveProducts() { return activeProducts; }
    public void setActiveProducts(long activeProducts) { this.activeProducts = activeProducts; }

    public long getLowStockCount() { return lowStockCount; }
    public void setLowStockCount(long lowStockCount) { this.lowStockCount = lowStockCount; }

    public long getOutOfStockCount() { return outOfStockCount; }
    public void setOutOfStockCount(long outOfStockCount) { this.outOfStockCount = outOfStockCount; }

    public BigDecimal getTotalInventoryValue() { return totalInventoryValue; }
    public void setTotalInventoryValue(BigDecimal totalInventoryValue) { this.totalInventoryValue = totalInventoryValue; }

    public BigDecimal getTotalInventoryValueWithVat() {
        return totalInventoryValueWithVat;
    }

    public void setTotalInventoryValueWithVat(BigDecimal totalInventoryValueWithVat) {
        this.totalInventoryValueWithVat = totalInventoryValueWithVat;
    }

    public long getCategoriesCount() { return categoriesCount; }
    public void setCategoriesCount(long categoriesCount) { this.categoriesCount = categoriesCount; }
}