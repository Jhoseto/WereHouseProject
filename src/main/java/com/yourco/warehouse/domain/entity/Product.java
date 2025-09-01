
package com.yourco.warehouse.domain.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "products")
public class Product {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable=false, unique = true)
    private String sku;

    @Column(nullable=false)
    private String name;

    @Column(nullable=false)
    private String unit = "pcs";

    @Column(nullable=false)
    private BigDecimal price = BigDecimal.ZERO;

    @Column(nullable=false)
    private int vatRate = 20;

    @Column(nullable=false)
    private boolean active = true;

    public Long getId() { return id; }
    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public int getVatRate() { return vatRate; }
    public void setVatRate(int vatRate) { this.vatRate = vatRate; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
