package com.yourco.warehouse.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * DTO за метаданни на каталога
 */
class CatalogMetadataDTO {

    @JsonProperty("totalProducts")
    private long totalProducts;

    @JsonProperty("categories")
    private List<String> categories;

    @JsonProperty("categoryStats")
    private Map<String, Long> categoryStats;

    @JsonProperty("priceStats")
    private PriceStatsDTO priceStats;

    // Constructors
    public CatalogMetadataDTO() {}

    public CatalogMetadataDTO(long totalProducts, List<String> categories,
                              Map<String, Long> categoryStats, Map<String, BigDecimal> priceStats) {
        this.totalProducts = totalProducts;
        this.categories = categories;
        this.categoryStats = categoryStats;
        this.priceStats = new PriceStatsDTO(priceStats);
    }

    // Getters and Setters
    public long getTotalProducts() { return totalProducts; }
    public void setTotalProducts(long totalProducts) { this.totalProducts = totalProducts; }

    public List<String> getCategories() { return categories; }
    public void setCategories(List<String> categories) { this.categories = categories; }

    public Map<String, Long> getCategoryStats() { return categoryStats; }
    public void setCategoryStats(Map<String, Long> categoryStats) { this.categoryStats = categoryStats; }

    public PriceStatsDTO getPriceStats() { return priceStats; }
    public void setPriceStats(PriceStatsDTO priceStats) { this.priceStats = priceStats; }
}