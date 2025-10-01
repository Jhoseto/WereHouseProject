package com.yourco.warehouse.entity;

import com.yourco.warehouse.entity.enums.AdjustmentReasonEnum;
import com.yourco.warehouse.entity.enums.AdjustmentTypeEnum;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Entity за съхранение на история на inventory корекции
 * Всяка промяна в количествата се записва в тази таблица за audit trail
 */
@Entity
@Table(name = "inventory_adjustments")
public class InventoryAdjustmentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private ProductEntity product;

    @Column(name = "adjustment_type", nullable = false, length = 20)
    private AdjustmentTypeEnum adjustmentType; // ADD, REMOVE, SET

    @Column(name = "quantity_change", nullable = false)
    private Integer quantityChange;

    @Column(name = "quantity_before", nullable = false)
    private Integer quantityBefore;

    @Column(name = "quantity_after", nullable = false)
    private Integer quantityAfter;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason", nullable = true)
    private AdjustmentReasonEnum reason;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "performed_by", nullable = false, length = 100)
    private String performedBy; // Username на който е направил корекцията

    @Column(name = "performed_at", nullable = false)
    private LocalDateTime performedAt;

    // Constructors
    public InventoryAdjustmentEntity() {
        this.performedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public ProductEntity getProduct() {
        return product;
    }

    public void setProduct(ProductEntity product) {
        this.product = product;
    }

    public AdjustmentTypeEnum getAdjustmentType() {
        return adjustmentType;
    }

    public void setAdjustmentType(AdjustmentTypeEnum adjustmentType) {
        this.adjustmentType = adjustmentType;
    }

    public Integer getQuantityChange() {
        return quantityChange;
    }

    public void setQuantityChange(Integer quantityChange) {
        this.quantityChange = quantityChange;
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