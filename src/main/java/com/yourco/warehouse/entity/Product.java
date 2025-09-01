package com.yourco.warehouse.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;

@Entity
@Table(name = "products")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

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

    // Конструктор
    public Product() {}

    public Product(String sku, String name, String unit, BigDecimal price, int vatRate) {
        this.sku = sku;
        this.name = name;
        this.unit = unit;
        this.price = price;
        this.vatRate = vatRate;
    }

    // Getters и Setters
    public Long getId() {
        return id;
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
        this.price = price != null ? price : BigDecimal.ZERO;
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

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category != null ? category.trim() : null;
    }

    // Business логика методи
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
        if (!(o instanceof Product)) return false;
        Product product = (Product) o;
        return sku != null && sku.equals(product.sku);
    }

    @Override
    public int hashCode() {
        return sku != null ? sku.hashCode() : 0;
    }
}