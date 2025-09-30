package com.yourco.warehouse.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;

/**
 * DTO за inventory корекции
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
    @JsonProperty("quantity")
    private Integer quantity;

    @JsonProperty("previousQuantity")
    private Integer previousQuantity;

    @JsonProperty("newQuantity")
    private Integer newQuantity;

    @NotBlank(message = "Типът е задължителен")
    @Pattern(regexp = "^(ADD|REMOVE|SET)$", message = "Типът трябва да бъде ADD, REMOVE или SET")
    @JsonProperty("adjustmentType")
    private String adjustmentType; // ADD, REMOVE, SET

    @NotBlank(message = "Причината е задължителна")
    @JsonProperty("reason")
    private String reason; // RECEIVED, DAMAGED, THEFT, CORRECTION, OTHER

    @JsonProperty("note")
    private String note;

    @JsonProperty("performedBy")
    private String performedBy;

    @JsonProperty("performedAt")
    private LocalDateTime performedAt;

    // Constructors
    public InventoryAdjustmentDTO() {}

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public String getProductSku() { return productSku; }
    public void setProductSku(String productSku) { this.productSku = productSku; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public Integer getPreviousQuantity() { return previousQuantity; }
    public void setPreviousQuantity(Integer previousQuantity) { this.previousQuantity = previousQuantity; }

    public Integer getNewQuantity() { return newQuantity; }
    public void setNewQuantity(Integer newQuantity) { this.newQuantity = newQuantity; }

    public String getAdjustmentType() { return adjustmentType; }
    public void setAdjustmentType(String adjustmentType) { this.adjustmentType = adjustmentType; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }

    public LocalDateTime getPerformedAt() { return performedAt; }
    public void setPerformedAt(LocalDateTime performedAt) { this.performedAt = performedAt; }
}