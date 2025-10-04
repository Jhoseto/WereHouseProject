package com.yourco.warehouse.entity;

import com.yourco.warehouse.entity.enums.ImportActionTypeEnum;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Свързва ImportEvent с конкретен Product и съдържа детайли за промените.
 * За всеки артикул в импорта има точно един такъв запис.
 */
@Entity
@Table(name = "import_event_items", indexes = {
        @Index(name = "idx_import_event", columnList = "import_event_id"),
        @Index(name = "idx_product", columnList = "product_id"),
        @Index(name = "idx_action_type", columnList = "action_type")
})
public class ImportEventItemEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "import_event_id", nullable = false)
    private ImportEventEntity importEvent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private ProductEntity product;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ImportActionTypeEnum actionType;

    private Integer oldQuantity;

    @Column(precision = 10, scale = 2)
    private BigDecimal oldPurchasePrice;

    @Column(precision = 10, scale = 2)
    private BigDecimal oldSellingPrice;

    @Column(nullable = false)
    private Integer newQuantity;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal newPurchasePrice;

    @Column(precision = 10, scale = 2)
    private BigDecimal newSellingPrice;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // Конструктори
    public ImportEventItemEntity() {
    }

    public ImportEventItemEntity(ImportEventEntity importEvent, ProductEntity product, ImportActionTypeEnum actionType) {
        this.importEvent = importEvent;
        this.product = product;
        this.actionType = actionType;
    }

    // Getters и Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public ImportEventEntity getImportEvent() {
        return importEvent;
    }

    public void setImportEvent(ImportEventEntity importEvent) {
        this.importEvent = importEvent;
    }

    public ProductEntity getProduct() {
        return product;
    }

    public void setProduct(ProductEntity product) {
        this.product = product;
    }

    public ImportActionTypeEnum getActionType() {
        return actionType;
    }

    public void setActionType(ImportActionTypeEnum actionType) {
        this.actionType = actionType;
    }

    public Integer getOldQuantity() {
        return oldQuantity;
    }

    public void setOldQuantity(Integer oldQuantity) {
        this.oldQuantity = oldQuantity;
    }

    public BigDecimal getOldPurchasePrice() {
        return oldPurchasePrice;
    }

    public void setOldPurchasePrice(BigDecimal oldPurchasePrice) {
        this.oldPurchasePrice = oldPurchasePrice;
    }

    public BigDecimal getOldSellingPrice() {
        return oldSellingPrice;
    }

    public void setOldSellingPrice(BigDecimal oldSellingPrice) {
        this.oldSellingPrice = oldSellingPrice;
    }

    public Integer getNewQuantity() {
        return newQuantity;
    }

    public void setNewQuantity(Integer newQuantity) {
        this.newQuantity = newQuantity;
    }

    public BigDecimal getNewPurchasePrice() {
        return newPurchasePrice;
    }

    public void setNewPurchasePrice(BigDecimal newPurchasePrice) {
        this.newPurchasePrice = newPurchasePrice;
    }

    public BigDecimal getNewSellingPrice() {
        return newSellingPrice;
    }

    public void setNewSellingPrice(BigDecimal newSellingPrice) {
        this.newSellingPrice = newSellingPrice;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

}