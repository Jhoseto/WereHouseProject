package com.yourco.warehouse.entity;

import com.yourco.warehouse.entity.enums.AdjustmentReasonEnum;
import com.yourco.warehouse.entity.enums.AdjustmentTypeEnum;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "products")
public class ProductEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false, unique = true, length = 50)
    @NotBlank(message = "SKU не може да бъде празно")
    @Pattern(regexp = "^[A-Z0-9-_]+$", message = "SKU може да съдържа само главни букви, цифри, тире и долна черта")
    private String sku;

    @Column(nullable = false, length = 200)
    @NotBlank(message = "Името на продукта не може да бъде празно")
    @Size(min = 2, max = 200, message = "Името трябва да бъде между 2 и 200 символа")
    private String name;

    @Column(nullable = false, length = 20)
    @NotBlank(message = "Мерната единица не може да бъде празна")
    private String unit = "pcs";

    @Column(nullable = false, precision = 10, scale = 2)
    @NotNull(message = "Цената не може да бъде празна")
    @DecimalMin(value = "0.0", inclusive = false, message = "Цената трябва да бъде положителна")
    @Digits(integer = 8, fraction = 2, message = "Цената може да има максимум 8 цифри преди десетичната запетая и 2 след нея")
    private BigDecimal price = BigDecimal.ZERO;

    @Column(name = "last_purchase_date")
    private LocalDate lastPurchaseDate;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PurchasePriceHistoryEntity> priceHistory = new ArrayList<>();

    @Column(name = "purchase_price", precision = 10, scale = 2)
    private BigDecimal purchasePrice;

    @Column(nullable = false)
    @Min(value = 0, message = "ДДС процентът не може да бъде отрицателен")
    @Max(value = 100, message = "ДДС процентът не може да бъде над 100%")
    private int vatRate = 20;

    @Column(nullable = false)
    private boolean active = true;

    @Column(length = 1000)
    private String description;

    @Column(length = 100)
    private String category;


    @Column(name = "quantity_available", nullable = false)
    private Integer quantityAvailable = 0;

    @Column(name = "quantity_reserved", nullable = false)
    private Integer quantityReserved = 0;


    // Конструктор
    public ProductEntity() {}

    public ProductEntity(String sku, String name, String unit, BigDecimal price, int vatRate, LocalDateTime createdAt) {
        this.sku = sku;
        this.name = name;
        this.unit = unit;
        this.price = price;
        this.vatRate = vatRate;
        this.createdAt = createdAt;
    }

    // Getters и Setters

    public void setId(Long id) {
        this.id = id;
    }

    public Long getId() {
        return id;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku != null ? sku.trim().toUpperCase() : null;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name != null ? name.trim() : null;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit != null ? unit.trim() : "pcs";
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        if (price != null && price.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Цената не може да бъде отрицателна");
        }
        this.price = price != null ? price.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
    }


    public int getVatRate() {
        return vatRate;
    }

    public void setVatRate(int vatRate) {
        if (vatRate < 0 || vatRate > 100) {
            throw new IllegalArgumentException("ДДС процентът трябва да бъде между 0 и 100");
        }
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
        this.description = description != null ? description.trim() : null;
    }

    public BigDecimal getPurchasePrice() {
        return purchasePrice;
    }

    public void setPurchasePrice(BigDecimal purchasePrice) {
        this.purchasePrice = purchasePrice;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category != null ? category.trim() : null;
    }

    public Integer getQuantityAvailable() {
        return quantityAvailable;
    }

    public void setQuantityAvailable(Integer quantityAvailable) {
        if (quantityAvailable != null && quantityAvailable < 0) {
            throw new IllegalArgumentException("Наличното количество не може да бъде отрицателно");
        }
        this.quantityAvailable = quantityAvailable != null ? quantityAvailable : 0;
    }

    public Integer getQuantityReserved() {
        return quantityReserved;
    }

    public void setQuantityReserved(Integer quantityReserved) {
        if (quantityReserved != null && quantityReserved < 0) {
            throw new IllegalArgumentException("Резервираното количество не може да бъде отрицателно");
        }
        this.quantityReserved = quantityReserved != null ? quantityReserved : 0;
    }

    public LocalDate getLastPurchaseDate() {
        return lastPurchaseDate;
    }

    public void setLastPurchaseDate(LocalDate lastPurchaseDate) {
        this.lastPurchaseDate = lastPurchaseDate;
    }

    public List<PurchasePriceHistoryEntity> getPriceHistory() {
        return priceHistory;
    }

    public void setPriceHistory(List<PurchasePriceHistoryEntity> priceHistory) {
        this.priceHistory = priceHistory;
    }

    public Integer getQuantityTotal() {
        return quantityAvailable + quantityReserved;
    }

    public boolean hasAvailableQuantity(Integer requestedQuantity) {
        return requestedQuantity != null &&
                requestedQuantity > 0 &&
                quantityAvailable >= requestedQuantity;
    }

    public void reserveQuantity(Integer quantity) {
        if (!hasAvailableQuantity(quantity)) {
            throw new IllegalStateException("Няма достатъчно налично количество за резервация");
        }
        this.quantityAvailable -= quantity;
        this.quantityReserved += quantity;
    }

    public void releaseReservation(Integer quantity) {
        if (quantity > quantityReserved) {
            throw new IllegalStateException("Не може да се освободи повече от резервираното количество");
        }
        this.quantityReserved -= quantity;
        this.quantityAvailable += quantity;
    }

    public void sellQuantity(Integer quantity) {
        if (quantity > quantityReserved) {
            throw new IllegalStateException("Не може да се продаде повече от резервираното количество");
        }
        this.quantityReserved -= quantity;
    }

    public BigDecimal getPriceWithVat() {
        BigDecimal vatMultiplier = BigDecimal.ONE.add(
                BigDecimal.valueOf(vatRate).divide(BigDecimal.valueOf(100))
        );
        return price.multiply(vatMultiplier).setScale(2, java.math.RoundingMode.HALF_UP);
    }

    public BigDecimal getVatAmount() {
        return getPriceWithVat().subtract(price);
    }

    // toString за debugging
    @Override
    public String toString() {
        return String.format("Product{id=%d, sku='%s', name='%s', price=%s, active=%s}",
                id, sku, name, price, active);
    }

    // equals и hashCode базирани на SKU (business key)
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ProductEntity)) return false;
        ProductEntity product = (ProductEntity) o;
        return sku != null && sku.equals(product.sku);
    }

    @Override
    public int hashCode() {
        return sku != null ? sku.hashCode() : 0;
    }


}