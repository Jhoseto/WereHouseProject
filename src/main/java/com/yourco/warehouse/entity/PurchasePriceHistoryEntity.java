package com.yourco.warehouse.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * История на доставните цени за всеки продукт.
 * Всеки път когато импортираме продукт създаваме нов запис тук.
 * По този начин виждаме как се променят доставните цени във времето.
 */
@Entity
@Table(name = "purchase_price_history", indexes = {
        @Index(name = "idx_product_date", columnList = "product_id, purchase_date"),
        @Index(name = "idx_import_event", columnList = "import_event_id")
})
public class PurchasePriceHistoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private ProductEntity product;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal purchasePrice;

    @Column(nullable = false)
    private LocalDate purchaseDate;

    @Column(length = 200)
    private String supplierName;

    @Column(length = 100)
    private String invoiceNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "import_event_id")
    private ImportEventEntity importEvent;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (purchaseDate == null) {
            purchaseDate = LocalDate.now();
        }
    }

    // Конструктори
    public PurchasePriceHistoryEntity() {
    }

    public PurchasePriceHistoryEntity(ProductEntity product, BigDecimal purchasePrice, LocalDate purchaseDate) {
        this.product = product;
        this.purchasePrice = purchasePrice;
        this.purchaseDate = purchaseDate;
    }

    // Getters и Setters
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

    public BigDecimal getPurchasePrice() {
        return purchasePrice;
    }

    public void setPurchasePrice(BigDecimal purchasePrice) {
        this.purchasePrice = purchasePrice;
    }

    public LocalDate getPurchaseDate() {
        return purchaseDate;
    }

    public void setPurchaseDate(LocalDate purchaseDate) {
        this.purchaseDate = purchaseDate;
    }

    public String getSupplierName() {
        return supplierName;
    }

    public void setSupplierName(String supplierName) {
        this.supplierName = supplierName;
    }

    public String getInvoiceNumber() {
        return invoiceNumber;
    }

    public void setInvoiceNumber(String invoiceNumber) {
        this.invoiceNumber = invoiceNumber;
    }

    public ImportEventEntity getImportEvent() {
        return importEvent;
    }

    public void setImportEvent(ImportEventEntity importEvent) {
        this.importEvent = importEvent;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}