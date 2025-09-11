package com.yourco.warehouse.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * Единствено DTO за цялата dashboard функционалност
 * Заменя: DailyStatsDTO, DashboardDataDTO, DashboardOverviewResponseDTO, OrdersListResponseDTO
 */
public class DashboardDTO {

    // Основни броячи (заменя DashboardDataDTO)
    @JsonProperty("urgentCount")
    private Long urgentCount;

    @JsonProperty("pendingCount")
    private Long pendingCount;

    @JsonProperty("readyCount")
    private Long readyCount;

    @JsonProperty("completedCount")
    private Long completedCount;

    @JsonProperty("cancelledCount")
    private Long cancelledCount;

    // Днешни статистики (заменя DailyStatsDTO)
    @JsonProperty("processed")
    private Integer processed;

    @JsonProperty("revenue")
    private String revenue;

    @JsonProperty("avgTime")
    private String avgTime;

    @JsonProperty("activeClients")
    private Integer activeClients;

    // За списъци с поръчки (заменя OrdersListResponseDTO)
    @JsonProperty("orders")
    private List<OrderDTO> orders;

    // Метаданни
    @JsonProperty("hasUrgentAlerts")
    private Boolean hasUrgentAlerts;

    @JsonProperty("message")
    private String message;

    @JsonProperty("success")
    private Boolean success;

    // Конструктори
    public DashboardDTO() {
        this.success = true;
    }

    public DashboardDTO(String errorMessage) {
        this.success = false;
        this.message = errorMessage;
    }

    // Getters and Setters
    public Long getUrgentCount() { return urgentCount; }
    public void setUrgentCount(Long urgentCount) { this.urgentCount = urgentCount; }

    public Long getPendingCount() { return pendingCount; }
    public void setPendingCount(Long pendingCount) { this.pendingCount = pendingCount; }

    public Long getReadyCount() { return readyCount; }
    public void setReadyCount(Long readyCount) { this.readyCount = readyCount; }

    public Long getCompletedCount() { return completedCount; }
    public void setCompletedCount(Long completedCount) { this.completedCount = completedCount; }

    public Long getCancelledCount() { return cancelledCount; }
    public void setCancelledCount(Long cancelledCount) { this.cancelledCount = cancelledCount; }

    public Integer getProcessed() { return processed; }
    public void setProcessed(Integer processed) { this.processed = processed; }

    public String getRevenue() { return revenue; }
    public void setRevenue(String revenue) { this.revenue = revenue; }

    public String getAvgTime() { return avgTime; }
    public void setAvgTime(String avgTime) { this.avgTime = avgTime; }

    public Integer getActiveClients() { return activeClients; }
    public void setActiveClients(Integer activeClients) { this.activeClients = activeClients; }

    public List<OrderDTO> getOrders() { return orders; }
    public void setOrders(List<OrderDTO> orders) { this.orders = orders; }

    public Boolean getHasUrgentAlerts() { return hasUrgentAlerts; }
    public void setHasUrgentAlerts(Boolean hasUrgentAlerts) { this.hasUrgentAlerts = hasUrgentAlerts; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Boolean getSuccess() { return success; }
    public void setSuccess(Boolean success) { this.success = success; }
}