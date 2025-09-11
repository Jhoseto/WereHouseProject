package com.yourco.warehouse.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;

/**
 * Dashboard overview data - ПЪЛНА ВЕРСИЯ
 * Encapsulates all counters needed for the dashboard
 */
public class DashboardDataDTO {

    @JsonProperty("submittedCount")
    private long submittedCount;

    @JsonProperty("confirmedCount")
    private long confirmedCount;

    @JsonProperty("pickedCount")
    private long pickedCount;

    @JsonProperty("shippedCount")
    private long shippedCount;

    @JsonProperty("cancelledCount")
    private long cancelledCount;

    @JsonProperty("totalActiveCount")
    private long totalActiveCount;

    @JsonProperty("lastUpdated")
    private LocalDateTime lastUpdated;

    // Constructors
    public DashboardDataDTO() {
        this.lastUpdated = LocalDateTime.now();
    }

    // Getters and setters
    public long getSubmittedCount() {
        return submittedCount;
    }

    public void setSubmittedCount(long submittedCount) {
        this.submittedCount = submittedCount;
        updateTotalActiveCount();
    }

    public long getConfirmedCount() {
        return confirmedCount;
    }

    public void setConfirmedCount(long confirmedCount) {
        this.confirmedCount = confirmedCount;
        updateTotalActiveCount();
    }

    public long getPickedCount() {
        return pickedCount;
    }

    public void setPickedCount(long pickedCount) {
        this.pickedCount = pickedCount;
        updateTotalActiveCount();
    }

    public long getShippedCount() {
        return shippedCount;
    }

    public void setShippedCount(long shippedCount) {
        this.shippedCount = shippedCount;
    }

    public long getCancelledCount() {
        return cancelledCount;
    }

    public void setCancelledCount(long cancelledCount) {
        this.cancelledCount = cancelledCount;
    }

    public long getTotalActiveCount() {
        return totalActiveCount;
    }

    public void setTotalActiveCount(long totalActiveCount) {
        this.totalActiveCount = totalActiveCount;
    }

    public LocalDateTime getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(LocalDateTime lastUpdated) {
        this.lastUpdated = lastUpdated;
    }

    // Helper method to automatically calculate total active count
    private void updateTotalActiveCount() {
        this.totalActiveCount = submittedCount + confirmedCount + pickedCount;
    }
}