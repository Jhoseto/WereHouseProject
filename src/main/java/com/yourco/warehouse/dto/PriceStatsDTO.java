package com.yourco.warehouse.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.Map;

/**
 * DTO за статистика на цени
 */
public class PriceStatsDTO {

    @JsonProperty("minPrice")
    private BigDecimal minPrice;

    @JsonProperty("maxPrice")
    private BigDecimal maxPrice;

    @JsonProperty("avgPrice")
    private BigDecimal avgPrice;

    public PriceStatsDTO() {}

    public PriceStatsDTO(Map<String, BigDecimal> stats) {
        this.minPrice = stats.get("minPrice");
        this.maxPrice = stats.get("maxPrice");
        this.avgPrice = stats.get("avgPrice");
    }

    // Getters and Setters
    public BigDecimal getMinPrice() { return minPrice; }
    public void setMinPrice(BigDecimal minPrice) { this.minPrice = minPrice; }

    public BigDecimal getMaxPrice() { return maxPrice; }
    public void setMaxPrice(BigDecimal maxPrice) { this.maxPrice = maxPrice; }

    public BigDecimal getAvgPrice() { return avgPrice; }
    public void setAvgPrice(BigDecimal avgPrice) { this.avgPrice = avgPrice; }
}
