package com.yourco.warehouse.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.yourco.warehouse.entity.enums.UserStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

/**
 * Универсален DTO за всички админски операции
 * Съдържа всички възможни полета - използват се само нужните
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AdminResponseDTO {

    // ==========================================
    // RESPONSE FIELDS
    // ==========================================
    private Boolean success;
    private String message;
    private Object data;
    private String error;
    private LocalDateTime timestamp;
    private String operation;

    // ==========================================
    // CLIENT FIELDS
    // ==========================================
    private Long clientId;

    @NotBlank(message = "Потребителското име е задължително")
    @Size(min = 3, max = 20, message = "Потребителското име трябва да е между 3 и 20 символа")
    private String username;

    private String companyName;

    @NotBlank(message = "Email адресът е задължителен")
    @Email(message = "Моля въведете валиден email адрес")
    private String email;

    private String phone;
    private String location;

    @NotBlank(message = "Паролата е задължителна")
    @Size(min = 6, message = "Паролата трябва да е поне 6 символа")
    private String password;

    private UserStatus userStatus;
    private String role;
    private LocalDateTime createdAt;
    private LocalDateTime lastLogin;

    // ==========================================
    // MESSAGE/EMAIL FIELDS
    // ==========================================
    private String subject;
    private String content;
    private Boolean copyToAdmin;

    // ==========================================
    // UTILITY FIELDS
    // ==========================================
    private Boolean available; // За check-username
    private Boolean oldStatus; // За toggle-status
    private Boolean newStatus;
    private Integer total;

    // ==========================================
    // CONSTRUCTORS
    // ==========================================

    public AdminResponseDTO() {
        this.timestamp = LocalDateTime.now();
    }

    public AdminResponseDTO(Boolean success, String message, Object data) {
        this();
        this.success = success;
        this.message = message;
        this.data = data;
    }

    // ==========================================
    // STATIC FACTORY METHODS
    // ==========================================

    public static AdminResponseDTO success(String message, Object data) {
        return new AdminResponseDTO(true, message, data);
    }

    public static AdminResponseDTO success(String message) {
        return success(message, null);
    }

    public static AdminResponseDTO error(String message) {
        AdminResponseDTO dto = new AdminResponseDTO();
        dto.success = false;
        dto.error = message;
        dto.message = message;
        return dto;
    }

    // ==========================================
    // GETTERS AND SETTERS
    // ==========================================

    public Boolean getSuccess() {
        return success;
    }

    public void setSuccess(Boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Object getData() {
        return data;
    }

    public void setData(Object data) {
        this.data = data;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public String getOperation() {
        return operation;
    }

    public void setOperation(String operation) {
        this.operation = operation;
    }

    public Long getClientId() {
        return clientId;
    }

    public void setClientId(Long clientId) {
        this.clientId = clientId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
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


    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public UserStatus getUserStatus() {
        return userStatus;
    }

    public void setUserStatus(UserStatus userStatus) {
        this.userStatus = userStatus;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getLastLogin() {
        return lastLogin;
    }

    public void setLastLogin(LocalDateTime lastLogin) {
        this.lastLogin = lastLogin;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public Boolean getCopyToAdmin() {
        return copyToAdmin;
    }

    public void setCopyToAdmin(Boolean copyToAdmin) {
        this.copyToAdmin = copyToAdmin;
    }

    public Boolean getAvailable() {
        return available;
    }

    public void setAvailable(Boolean available) {
        this.available = available;
    }

    public Boolean getOldStatus() {
        return oldStatus;
    }

    public void setOldStatus(Boolean oldStatus) {
        this.oldStatus = oldStatus;
    }

    public Boolean getNewStatus() {
        return newStatus;
    }

    public void setNewStatus(Boolean newStatus) {
        this.newStatus = newStatus;
    }

    public Integer getTotal() {
        return total;
    }

    public void setTotal(Integer total) {
        this.total = total;
    }

    @Override
    public String toString() {
        return "AdminResponseDTO{" +
                "success=" + success +
                ", message='" + message + '\'' +
                ", username='" + username + '\'' +
                ", email='" + email + '\'' +
                ", operation='" + operation + '\'' +
                '}';
    }
}