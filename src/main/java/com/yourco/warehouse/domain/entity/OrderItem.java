
package com.yourco.warehouse.domain.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
public class OrderItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional=false, fetch = FetchType.LAZY)
    private Order order;

    @ManyToOne(optional=false, fetch = FetchType.LAZY)
    private Product product;

    @Column(nullable=false)
    private BigDecimal qty;

    @Column(nullable=false)
    private BigDecimal unitPrice;

    @Column(length = 1000)
    private String note;

    public Long getId() { return id; }
    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
    public BigDecimal getQty() { return qty; }
    public void setQty(BigDecimal qty) { this.qty = qty; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
