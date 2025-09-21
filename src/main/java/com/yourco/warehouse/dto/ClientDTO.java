package com.yourco.warehouse.dto;

import com.yourco.warehouse.entity.enums.UserStatus;
import java.util.List;

public class ClientDTO {

    // Основна клиентска информация
    private Long id;
    private String username;
    private String companyName;
    private String email;
    private String phone;
    private String location;
    private UserStatus userStatus;

    // Статистики за поръчки
    private Integer totalOrders;
    private String lastOrderDate;
    private String orderFrequency;
    private String averageOrderValue;
    private List<String> preferredCategories;

    // Computed fields за UI
    private String displayName;
    private Boolean isActive;
    private String statusText;

    // Constructors
    public ClientDTO() {}

    public ClientDTO(Long id, String username, String companyName, String email,
                     String phone, String location, UserStatus userStatus) {
        this.id = id;
        this.username = username;
        this.companyName = companyName;
        this.email = email;
        this.phone = phone;
        this.location = location;
        this.userStatus = userStatus;

        // Set computed fields
        this.displayName = companyName != null && !companyName.trim().isEmpty()
                ? companyName : username;
        this.isActive = userStatus == UserStatus.ACTIVE;
        this.statusText = userStatus == UserStatus.ACTIVE ? "Активен" : "Неактивен";

        // Default values за статистики
        this.totalOrders = 0;
        this.lastOrderDate = "";
        this.orderFrequency = "Първа поръчка";
        this.averageOrderValue = "0.00 лв";
        this.preferredCategories = List.of();
    }

    // Getters and setters за всички полета
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public UserStatus getUserStatus() { return userStatus; }
    public void setUserStatus(UserStatus userStatus) { this.userStatus = userStatus; }

    public Integer getTotalOrders() { return totalOrders; }
    public void setTotalOrders(Integer totalOrders) { this.totalOrders = totalOrders; }

    public String getLastOrderDate() { return lastOrderDate; }
    public void setLastOrderDate(String lastOrderDate) { this.lastOrderDate = lastOrderDate; }

    public String getOrderFrequency() { return orderFrequency; }
    public void setOrderFrequency(String orderFrequency) { this.orderFrequency = orderFrequency; }

    public String getAverageOrderValue() { return averageOrderValue; }
    public void setAverageOrderValue(String averageOrderValue) { this.averageOrderValue = averageOrderValue; }

    public List<String> getPreferredCategories() { return preferredCategories; }
    public void setPreferredCategories(List<String> preferredCategories) { this.preferredCategories = preferredCategories; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public String getStatusText() { return statusText; }
    public void setStatusText(String statusText) { this.statusText = statusText; }
}