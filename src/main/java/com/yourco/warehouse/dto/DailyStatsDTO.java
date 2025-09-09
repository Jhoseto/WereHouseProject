package com.yourco.warehouse.dto;


/**
 * Daily statistics data
 * Provides insights into daily operations
 */
public class DailyStatsDTO {
    private int processed;
    private String revenue;
    private String avgTime;
    private int activeClients;


    // Getters and setters
    public int getProcessed() { return processed; }
    public void setProcessed(int processed) { this.processed = processed; }

    public String getRevenue() { return revenue; }
    public void setRevenue(String revenue) { this.revenue = revenue; }

    public String getAvgTime() { return avgTime; }
    public void setAvgTime(String avgTime) { this.avgTime = avgTime; }

    public int getActiveClients() { return activeClients; }
    public void setActiveClients(int activeClients) { this.activeClients = activeClients; }
}
