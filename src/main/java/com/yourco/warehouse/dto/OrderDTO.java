package com.yourco.warehouse.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class OrderDTO {

    private Long id;
    private Long clientId;
    private String clientName;
    private String clientCompany;
    private String clientPhone;
    private String clientLocation;
    private String status;
    private String notes;
    private LocalDateTime submittedAt;
    private LocalDateTime confirmedAt;
    private LocalDateTime processedAt;
    private LocalDateTime shippedAt;
    private String shippingNotes;

    private BigDecimal totalNet;
    private BigDecimal totalVat;
    private BigDecimal totalGross;

    private int itemsCount;
    private List<OrderItemDTO> items;

    private String timeAgo;

    private Integer totalItems;
    private Integer loadedItems;
    private Integer remainingItems;
    private Double completionPercentage;
    private Boolean isFullyLoaded;

    public OrderDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getClientId() { return clientId; }
    public void setClientId(Long clientId) { this.clientId = clientId; }

    public String getClientName() { return clientName; }
    public void setClientName(String clientName) { this.clientName = clientName; }

    public String getClientCompany() {
        return clientCompany;
    }

    public void setClientCompany(String clientCompany) {
        this.clientCompany = clientCompany;
    }

    public String getClientPhone() {
        return clientPhone;
    }

    public void setClientPhone(String clientPhone) {
        this.clientPhone = clientPhone;
    }

    public String getClientLocation() {
        return clientLocation;
    }

    public void setClientLocation(String clientLocation) {
        this.clientLocation = clientLocation;
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }

    public LocalDateTime getConfirmedAt() { return confirmedAt; }
    public void setConfirmedAt(LocalDateTime confirmedAt) { this.confirmedAt = confirmedAt; }

    public LocalDateTime getProcessedAt() { return processedAt; }
    public void setProcessedAt(LocalDateTime processedAt) { this.processedAt = processedAt; }

    public LocalDateTime getShippedAt() { return shippedAt; }
    public void setShippedAt(LocalDateTime shippedAt) { this.shippedAt = shippedAt; }

    public String getShippingNotes() { return shippingNotes; }
    public void setShippingNotes(String shippingNotes) { this.shippingNotes = shippingNotes; }

    public BigDecimal getTotalNet() { return totalNet; }
    public void setTotalNet(BigDecimal totalNet) { this.totalNet = totalNet; }

    public BigDecimal getTotalVat() { return totalVat; }
    public void setTotalVat(BigDecimal totalVat) { this.totalVat = totalVat; }

    public BigDecimal getTotalGross() { return totalGross; }
    public void setTotalGross(BigDecimal totalGross) { this.totalGross = totalGross; }

    public int getItemsCount() { return itemsCount; }
    public void setItemsCount(int itemsCount) { this.itemsCount = itemsCount; }

    public List<OrderItemDTO> getItems() { return items; }
    public void setItems(List<OrderItemDTO> items) { this.items = items; }

    public String getTimeAgo() { return timeAgo; }
    public void setTimeAgo(String timeAgo) { this.timeAgo = timeAgo; }

    public Integer getTotalItems() { return totalItems; }
    public void setTotalItems(Integer totalItems) { this.totalItems = totalItems; }

    public Integer getLoadedItems() { return loadedItems; }
    public void setLoadedItems(Integer loadedItems) { this.loadedItems = loadedItems; }

    public Integer getRemainingItems() { return remainingItems; }
    public void setRemainingItems(Integer remainingItems) { this.remainingItems = remainingItems; }

    public Double getCompletionPercentage() { return completionPercentage; }
    public void setCompletionPercentage(Double completionPercentage) { this.completionPercentage = completionPercentage; }

    public Boolean getIsFullyLoaded() { return isFullyLoaded; }
    public void setIsFullyLoaded(Boolean isFullyLoaded) { this.isFullyLoaded = isFullyLoaded; }
}