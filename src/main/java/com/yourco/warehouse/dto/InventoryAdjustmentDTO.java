package com.yourco.warehouse.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.yourco.warehouse.entity.InventoryAdjustmentEntity;
import com.yourco.warehouse.entity.enums.AdjustmentTypeEnum;
import com.yourco.warehouse.entity.enums.AdjustmentReasonEnum;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;

/**
 * DTO за inventory корекции
 * Използва enumи за тип и причина за type-safety
 */
public class InventoryAdjustmentDTO {

    @JsonProperty("id")
    private Long id;

    @NotNull(message = "Продуктът е задължителен")
    @JsonProperty("productId")
    private Long productId;

    @JsonProperty("productSku")
    private String productSku;

    @JsonProperty("productName")
    private String productName;

    @NotNull(message = "Количеството е задължително")
    @Min(value = 1, message = "Количеството трябва да бъде поне 1")
    @JsonProperty("quantity")
    private Integer quantity;

    @JsonProperty("quantityBefore")
    private Integer quantityBefore;

    @JsonProperty("quantityAfter")
    private Integer quantityAfter;

    @JsonProperty("quantityChange")
    private Integer quantityChange;

    @NotNull(message = "Типът е задължителен")
    @JsonProperty("adjustmentType")
    private AdjustmentTypeEnum adjustmentType;

    @JsonProperty("reason")
    private AdjustmentReasonEnum reason;  // Null при INITIAL, задължителен при REMOVE

    @JsonProperty("note")
    private String note;

    @JsonProperty("performedBy")
    private String performedBy;

    @JsonProperty("performedAt")
    private LocalDateTime performedAt;

    // Constructors
    public InventoryAdjustmentDTO() {}

    /**
     * Factory method - конвертира Entity към DTO
     */
    public static InventoryAdjustmentDTO from(InventoryAdjustmentEntity entity) {
        if (entity == null) return null;

        InventoryAdjustmentDTO dto = new InventoryAdjustmentDTO();
        dto.id = entity.getId();
        dto.productId = entity.getProduct().getId();
        dto.productSku = entity.getProduct().getSku();
        dto.productName = entity.getProduct().getName();
        dto.quantity = Math.abs(entity.getQuantityChange());
        dto.quantityBefore = entity.getQuantityBefore();
        dto.quantityAfter = entity.getQuantityAfter();
        dto.quantityChange = entity.getQuantityChange();
        dto.adjustmentType = entity.getAdjustmentType();
        dto.reason = entity.getReason();
        dto.note = entity.getNote();
        dto.performedBy = entity.getPerformedBy();
        dto.performedAt = entity.getPerformedAt();

        return dto;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public String getProductSku() {
        return productSku;
    }

    public void setProductSku(String productSku) {
        this.productSku = productSku;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public Integer getQuantityBefore() {
        return quantityBefore;
    }

    public void setQuantityBefore(Integer quantityBefore) {
        this.quantityBefore = quantityBefore;
    }

    public Integer getQuantityAfter() {
        return quantityAfter;
    }

    public void setQuantityAfter(Integer quantityAfter) {
        this.quantityAfter = quantityAfter;
    }

    public Integer getQuantityChange() {
        return quantityChange;
    }

    public void setQuantityChange(Integer quantityChange) {
        this.quantityChange = quantityChange;
    }

    public AdjustmentTypeEnum getAdjustmentType() {
        return adjustmentType;
    }

    public void setAdjustmentType(AdjustmentTypeEnum adjustmentType) {
        this.adjustmentType = adjustmentType;
    }

    public AdjustmentReasonEnum getReason() {
        return reason;
    }

    public void setReason(AdjustmentReasonEnum reason) {
        this.reason = reason;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public String getPerformedBy() {
        return performedBy;
    }

    public void setPerformedBy(String performedBy) {
        this.performedBy = performedBy;
    }

    public LocalDateTime getPerformedAt() {
        return performedAt;
    }

    public void setPerformedAt(LocalDateTime performedAt) {
        this.performedAt = performedAt;
    }
}