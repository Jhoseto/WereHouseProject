package com.yourco.warehouse.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;

/**
 * DASHBOARD API RESPONSE DTO
 * ==========================
 * Общ wrapper за всички dashboard API отговори.
 * Следва същия pattern като CatalogResponseDTO.
 */
public class DashboardResponseDTO {

    @JsonProperty("success")
    private boolean success;

    @JsonProperty("message")
    private String message;

    @JsonProperty("timestamp")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime timestamp;

    @JsonProperty("data")
    private Object data; // Generic data field

    // Constructors
    public DashboardResponseDTO() {
        this.timestamp = LocalDateTime.now();
    }

    // Static factory methods - следва CatalogResponseDTO pattern
    public static DashboardResponseDTO success(Object data) {
        DashboardResponseDTO response = new DashboardResponseDTO();
        response.success = true;
        response.message = "Success";
        response.data = data;
        return response;
    }

    public static DashboardResponseDTO error(String message) {
        DashboardResponseDTO response = new DashboardResponseDTO();
        response.success = false;
        response.message = message;
        response.data = null;
        return response;
    }

    // Getters and Setters
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public Object getData() { return data; }
    public void setData(Object data) { this.data = data; }
}
