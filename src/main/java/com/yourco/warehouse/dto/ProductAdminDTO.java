package com.yourco.warehouse.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.yourco.warehouse.entity.ProductEntity;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Admin DTO за продукти с пълна информация за количества и timestamps
 */
public class ProductAdminDTO {

    @JsonProperty("id")
    private Long id;

    @NotBlank(message = "SKU е задължителен")
    @Pattern(regexp = "^[A-Z0-9-_]+$", message = "SKU може да съдържа само главни букви, цифри, тире и долна черта")
    @JsonProperty("sku")
    private String sku;

    @NotBlank(message = "Името е задължително")
    @Size(min = 2, max = 200, message = "Името трябва да бъде между 2 и 200 символа")
    @JsonProperty("name")
    private String name;

    @NotBlank(message = "Мерната единица е задължителна")
    @JsonProperty("unit")
    private String unit;

    @NotNull(message = "Цената е задължителна")
    @DecimalMin(value = "0.01", message = "Цената трябва да бъде положителна")
    @JsonProperty("price")
    private BigDecimal price;

    @Min(value = 0, message = "ДДС не може да бъде отрицателен")
    @Max(value = 100, message = "ДДС не може да бъде над 100%")
    @JsonProperty("vatRate")
    private int vatRate;

    @JsonProperty("active")
    private boolean active;

    @JsonProperty("description")
    private String description;

    @JsonProperty("category")
    private String category;

    @Min(value = 0, message = "Количеството не може да бъде отрицателно")
    @JsonProperty("quantityAvailable")
    private Integer quantityAvailable;

    @Min(value = 0, message = "Резервираното количество не може да бъде отрицателно")
    @JsonProperty("quantityReserved")
    private Integer quantityReserved;

    @JsonProperty("actualAvailable")
    private Integer actualAvailable;

    @JsonProperty("createdAt")
    private LocalDateTime createdAt;

    // Constructors
    public ProductAdminDTO() {}

    /**
     * Factory method - конвертира Entity към DTO
     */
    public static ProductAdminDTO from(ProductEntity entity) {
        if (entity == null) return null;

        ProductAdminDTO dto = new ProductAdminDTO();
        dto.setId(entity.getId());
        dto.setSku(entity.getSku());
        dto.setName(entity.getName());
        dto.setUnit(entity.getUnit());
        dto.setPrice(entity.getPrice());
        dto.setVatRate(entity.getVatRate());
        dto.setActive(entity.isActive());
        dto.setDescription(entity.getDescription());
        dto.setCategory(entity.getCategory());
        dto.setQuantityAvailable(entity.getQuantityAvailable());
        dto.setQuantityReserved(entity.getQuantityReserved());
        dto.setCreatedAt(entity.getCreatedAt());

        // Изчисляваме действително наличното количество
        dto.setActualAvailable(
                (entity.getQuantityAvailable() != null ? entity.getQuantityAvailable() : 0) -
                        (entity.getQuantityReserved() != null ? entity.getQuantityReserved() : 0)
        );

        return dto;
    }

    /**
     * Factory method за списъци
     */
    public static List<ProductAdminDTO> from(List<ProductEntity> entities) {
        return entities.stream()
                .map(ProductAdminDTO::from)
                .toList();
    }

    /**
     * Конвертира DTO обратно към Entity за save операции
     */
    public ProductEntity toEntity() {
        ProductEntity entity = new ProductEntity();
        entity.setId(this.id);
        entity.setSku(this.sku);
        entity.setName(this.name);
        entity.setUnit(this.unit);
        entity.setPrice(this.price);
        entity.setVatRate(this.vatRate);
        entity.setActive(this.active);
        entity.setDescription(this.description);
        entity.setCategory(this.category);
        entity.setQuantityAvailable(this.quantityAvailable != null ? this.quantityAvailable : 0);
        entity.setQuantityReserved(this.quantityReserved != null ? this.quantityReserved : 0);
        // createdAt се задава автоматично от @PrePersist в entity
        return entity;
    }

    // Getters and Setters
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

    public int getVatRate() {
        return vatRate;
    }

    public void setVatRate(int vatRate) {
        this.vatRate = vatRate;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
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

    public Integer getQuantityAvailable() {
        return quantityAvailable;
    }

    public void setQuantityAvailable(Integer quantityAvailable) {
        this.quantityAvailable = quantityAvailable;
    }

    public Integer getQuantityReserved() {
        return quantityReserved;
    }

    public void setQuantityReserved(Integer quantityReserved) {
        this.quantityReserved = quantityReserved;
    }

    public Integer getActualAvailable() {
        return actualAvailable;
    }

    public void setActualAvailable(Integer actualAvailable) {
        this.actualAvailable = actualAvailable;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}