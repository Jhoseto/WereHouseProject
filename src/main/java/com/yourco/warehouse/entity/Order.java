
package com.yourco.warehouse.entity;

import com.yourco.warehouse.entity.enums.OrderStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
public class Order {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional=false, fetch = FetchType.LAZY)
    private Client client;

    @Enumerated(EnumType.STRING)
    @Column(nullable=false)
    private OrderStatus status = OrderStatus.SUBMITTED;

    @Column(length = 2000)
    private String notes;

    private LocalDateTime submittedAt;
    private LocalDateTime confirmedAt;

    @Column(nullable=false)
    private BigDecimal totalNet = BigDecimal.ZERO;
    @Column(nullable=false)
    private BigDecimal totalVat = BigDecimal.ZERO;
    @Column(nullable=false)
    private BigDecimal totalGross = BigDecimal.ZERO;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    public void addItem(OrderItem item){
        item.setOrder(this);
        items.add(item);
    }

    public Long getId() { return id; }
    public Client getClient() { return client; }
    public void setClient(Client client) { this.client = client; }
    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }
    public LocalDateTime getConfirmedAt() { return confirmedAt; }
    public void setConfirmedAt(LocalDateTime confirmedAt) { this.confirmedAt = confirmedAt; }
    public BigDecimal getTotalNet() { return totalNet; }
    public void setTotalNet(BigDecimal totalNet) { this.totalNet = totalNet; }
    public BigDecimal getTotalVat() { return totalVat; }
    public void setTotalVat(BigDecimal totalVat) { this.totalVat = totalVat; }
    public BigDecimal getTotalGross() { return totalGross; }
    public void setTotalGross(BigDecimal totalGross) { this.totalGross = totalGross; }
    public List<OrderItem> getItems() { return items; }
    public void setItems(List<OrderItem> items) { this.items = items; }
}
