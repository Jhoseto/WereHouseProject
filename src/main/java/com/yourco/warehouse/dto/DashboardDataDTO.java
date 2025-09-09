package com.yourco.warehouse.dto;

/**
 * Dashboard overview data
 * Encapsulates all counters needed for the dashboard
 */
public class DashboardDataDTO {
    private long submittedCount;
    private long confirmedCount;
    private long pickedCount;
    private long shippedCount;
    private long cancelledCount;

    // Getters and setters
    public long getSubmittedCount() { return submittedCount; }
    public void setSubmittedCount(long submittedCount) { this.submittedCount = submittedCount; }

    public long getConfirmedCount() { return confirmedCount; }
    public void setConfirmedCount(long confirmedCount) { this.confirmedCount = confirmedCount; }

    public long getPickedCount() { return pickedCount; }
    public void setPickedCount(long pickedCount) { this.pickedCount = pickedCount; }

    public long getShippedCount() { return shippedCount; }
    public void setShippedCount(long shippedCount) { this.shippedCount = shippedCount; }

    public long getCancelledCount() { return cancelledCount; }
    public void setCancelledCount(long cancelledCount) { this.cancelledCount = cancelledCount; }
}
