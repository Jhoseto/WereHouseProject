package com.yourco.warehouse.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * DASHBOARD OVERVIEW RESPONSE DTO
 * ===============================
 * Специализиран DTO за dashboard overview данни.
 */
public class DashboardOverviewResponseDTO {

    @JsonProperty("urgentCount")
    private long urgentCount;

    @JsonProperty("pendingCount")
    private long pendingCount;

    @JsonProperty("readyCount")
    private long readyCount;

    @JsonProperty("completedCount")
    private long completedCount;

    @JsonProperty("cancelledCount")
    private long cancelledCount;

    @JsonProperty("dailyStats")
    private DailyStatsDTO dailyStats;

    @JsonProperty("hasUrgentAlerts")
    private boolean hasUrgentAlerts;

    // Constructors
    public DashboardOverviewResponseDTO() {}

    public DashboardOverviewResponseDTO(DashboardDataDTO dashboardData, DailyStatsDTO dailyStats) {
        this.urgentCount = dashboardData.getSubmittedCount();
        this.pendingCount = dashboardData.getConfirmedCount();
        this.readyCount = dashboardData.getPickedCount();
        this.completedCount = dashboardData.getShippedCount();
        this.cancelledCount = dashboardData.getCancelledCount();
        this.dailyStats = dailyStats;
        this.hasUrgentAlerts = dashboardData.getSubmittedCount() > 0;
    }

    // Getters and Setters
    public long getUrgentCount() { return urgentCount; }
    public void setUrgentCount(long urgentCount) { this.urgentCount = urgentCount; }

    public long getPendingCount() { return pendingCount; }
    public void setPendingCount(long pendingCount) { this.pendingCount = pendingCount; }

    public long getReadyCount() { return readyCount; }
    public void setReadyCount(long readyCount) { this.readyCount = readyCount; }

    public long getCompletedCount() { return completedCount; }
    public void setCompletedCount(long completedCount) { this.completedCount = completedCount; }

    public long getCancelledCount() { return cancelledCount; }
    public void setCancelledCount(long cancelledCount) { this.cancelledCount = cancelledCount; }

    public DailyStatsDTO getDailyStats() { return dailyStats; }
    public void setDailyStats(DailyStatsDTO dailyStats) { this.dailyStats = dailyStats; }

    public boolean isHasUrgentAlerts() { return hasUrgentAlerts; }
    public void setHasUrgentAlerts(boolean hasUrgentAlerts) { this.hasUrgentAlerts = hasUrgentAlerts; }
}
