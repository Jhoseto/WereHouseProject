package com.yourco.warehouse.dto;

import com.yourco.warehouse.entity.enums.UserStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

/**
 * EMPLOYER DATA TRANSFER OBJECT
 * =============================
 * DTO за трансфер на данни за служители между frontend и backend.
 * Съдържа validation анотации за автоматична валидация на входни данни.
 */
public class EmployerDTO {

    private Long id;

    @NotBlank(message = "Потребителското име е задължително")
    @Size(min = 3, max = 50, message = "Потребителското име трябва да е между 3 и 50 символа")
    private String username;

    @NotBlank(message = "Email адресът е задължителен")
    @Email(message = "Моля въведете валиден email адрес")
    private String email;

    @Size(min = 6, message = "Паролата трябва да съдържа минимум 6 символа")
    private String password;

    @NotBlank(message = "Телефонният номер е задължителен")
    @Size(min = 10, max = 20, message = "Моля въведете валиден телефонен номер")
    private String phone;

    private String location;

    private UserStatus userStatus;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    // ==========================================
    // CONSTRUCTORS
    // ==========================================

    public EmployerDTO() {
    }

    // ==========================================
    // GETTERS AND SETTERS
    // ==========================================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public UserStatus getUserStatus() {
        return userStatus;
    }

    public void setUserStatus(UserStatus userStatus) {
        this.userStatus = userStatus;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}