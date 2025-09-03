package com.yourco.warehouse.dto;

import com.yourco.warehouse.entity.ProductEntity;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;

/**
 * DTO за продукти в каталога - оптимизирано за JSON response
 */
public class ProductCatalogDTO {

    @JsonProperty("id")
    private Long id;

    @JsonProperty("sku")
    private String sku;

    @JsonProperty("name")
    private String name;

    @JsonProperty("description")
    private String description;

    @JsonProperty("category")
    private String category;

    @JsonProperty("unit")
    private String unit;

    @JsonProperty("price")
    private BigDecimal price;

    @JsonProperty("priceWithVat")
    private BigDecimal priceWithVat;

    @JsonProperty("vatRate")
    private int vatRate;

    @JsonProperty("vatAmount")
    private BigDecimal vatAmount;

    @JsonProperty("active")
    private boolean active;

    // Constructors
    public ProductCatalogDTO() {}

    public ProductCatalogDTO(ProductEntity entity) {
        this.id = entity.getId();
        this.sku = nvl(entity.getSku(), "");
        this.name = nvl(entity.getName(), "");
        this.description = nvl(entity.getDescription(), "");
        this.category = nvl(entity.getCategory(), "");
        this.unit = nvl(entity.getUnit(), "бр.");
        this.price = nvl(entity.getPrice(), BigDecimal.ZERO);
        this.vatRate = entity.getVatRate() >= 0 ? entity.getVatRate() : 0;
        this.active = entity.isActive();

        // Calculated fields
        this.priceWithVat = calculatePriceWithVat(this.price, this.vatRate);
        this.vatAmount = this.priceWithVat.subtract(this.price);
    }

    // Factory
    public static ProductCatalogDTO from(ProductEntity entity) {
        return new ProductCatalogDTO(entity);
    }

    public static List<ProductCatalogDTO> from(List<ProductEntity> entities) {
        return entities.stream()
                .map(ProductCatalogDTO::from)
                .toList();
    }

    // Utils
    private BigDecimal calculatePriceWithVat(BigDecimal price, int vatRate) {
        BigDecimal vatMultiplier = BigDecimal.ONE.add(
                BigDecimal.valueOf(vatRate).divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP)
        );
        return price.multiply(vatMultiplier).setScale(2, RoundingMode.HALF_UP);
    }

    private static <T> T nvl(T value, T def) {
        return value != null ? value : def;
    }

    // Getters & setters ...


    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public BigDecimal getPriceWithVat() {
        return priceWithVat;
    }

    public void setPriceWithVat(BigDecimal priceWithVat) {
        this.priceWithVat = priceWithVat;
    }

    public int getVatRate() {
        return vatRate;
    }

    public void setVatRate(int vatRate) {
        this.vatRate = vatRate;
    }

    public BigDecimal getVatAmount() {
        return vatAmount;
    }

    public void setVatAmount(BigDecimal vatAmount) {
        this.vatAmount = vatAmount;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
