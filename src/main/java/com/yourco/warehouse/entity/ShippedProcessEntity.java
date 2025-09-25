package com.yourco.warehouse.entity;

import com.yourco.warehouse.entity.enums.ShippingSignalStatusEnum;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * SHIPPED PROCESS ENTITY - ВРЕМЕННИ ДАННИ
 * =======================================
 * Минимални данни за активен shipping процес
 */
@Entity
@Table(name = "shipping_sessions")
public class ShippedProcessEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false, unique = true)
    private Long orderId;

    @Column(name = "total_items", nullable = false)
    private Integer totalItems;

    @Column(name = "shipped_items", nullable = false)
    private Integer shippedItems = 0;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "last_heartbeat", nullable = false)
    private LocalDateTime lastHeartbeat;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ShippingSignalStatusEnum status = ShippingSignalStatusEnum.ACTIVE;

    @Column(name = "employee_username", nullable = false, length = 50)
    private String employeeUsername;

    // Constructors
    public ShippedProcessEntity() {}

    public ShippedProcessEntity(Long orderId, Integer totalItems, String employeeUsername) {
        this.orderId = orderId;
        this.totalItems = totalItems;
        this.employeeUsername = employeeUsername;
        this.startedAt = LocalDateTime.now();
        this.lastHeartbeat = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public Integer getTotalItems() { return totalItems; }
    public void setTotalItems(Integer totalItems) { this.totalItems = totalItems; }

    public Integer getShippedItems() { return shippedItems; }
    public void setShippedItems(Integer shippedItems) { this.shippedItems = shippedItems; }

    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }

    public LocalDateTime getLastHeartbeat() { return lastHeartbeat; }
    public void setLastHeartbeat(LocalDateTime lastHeartbeat) { this.lastHeartbeat = lastHeartbeat; }

    public ShippingSignalStatusEnum getStatus() { return status; }
    public void setStatus(ShippingSignalStatusEnum status) { this.status = status; }

    public String getEmployeeUsername() {
        return employeeUsername;
    }

    public void setEmployeeUsername(String employeeUsername) {
        this.employeeUsername = employeeUsername;
    }
}
