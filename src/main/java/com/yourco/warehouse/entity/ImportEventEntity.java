package com.yourco.warehouse.entity;

import com.yourco.warehouse.entity.enums.ImportStatusEnum;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Представлява един цял импорт евент.
 * Съдържа метаданни за импорта и статус на изпълнението.
 * Всеки импорт създава точно един такъв запис.
 */
@Entity
@Table(name = "import_events", indexes = {
        @Index(name = "idx_uuid", columnList = "uuid", unique = true),
        @Index(name = "idx_uploaded_by_date", columnList = "uploaded_by, uploaded_at"),
        @Index(name = "idx_status", columnList = "status")
})
public class ImportEventEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 36)
    private String uuid;

    @Column(nullable = false, length = 255)
    private String fileName;

    @Column(nullable = false, length = 100)
    private String uploadedBy;

    @Column(nullable = false)
    private LocalDateTime uploadedAt;

    @Column(length = 200)
    private String supplierName;

    @Column(length = 100)
    private String invoiceNumber;

    private LocalDate invoiceDate;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ImportStatusEnum status;

    private LocalDateTime completedAt;

    @Column(nullable = false)
    private Integer totalItems = 0;

    @Column(nullable = false)
    private Integer newItems = 0;

    @Column(nullable = false)
    private Integer updatedItems = 0;

    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    @OneToMany(mappedBy = "importEvent", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ImportEventItemEntity> items = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (uploadedAt == null) {
            uploadedAt = LocalDateTime.now();
        }
        if (status == null) {
            status = ImportStatusEnum.IN_PROGRESS;
        }
    }

    // Конструктори
    public ImportEventEntity() {
    }

    public ImportEventEntity(String uuid, String fileName, String uploadedBy) {
        this.uuid = uuid;
        this.fileName = fileName;
        this.uploadedBy = uploadedBy;
        this.status = ImportStatusEnum.IN_PROGRESS;
        this.uploadedAt = LocalDateTime.now();
    }

    // Business логика методи
    public void markAsCompleted() {
        this.status = ImportStatusEnum.COMPLETED;
        this.completedAt = LocalDateTime.now();
    }

    public void markAsFailed(String error) {
        this.status = ImportStatusEnum.FAILED;
        this.completedAt = LocalDateTime.now();
        this.errorMessage = error;
    }

    public void incrementNewItems() {
        this.newItems++;
        this.totalItems++;
    }

    public void incrementUpdatedItems() {
        this.updatedItems++;
        this.totalItems++;
    }

    // Getters и Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUuid() {
        return uuid;
    }

    public void setUuid(String uuid) {
        this.uuid = uuid;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getUploadedBy() {
        return uploadedBy;
    }

    public void setUploadedBy(String uploadedBy) {
        this.uploadedBy = uploadedBy;
    }

    public LocalDateTime getUploadedAt() {
        return uploadedAt;
    }

    public void setUploadedAt(LocalDateTime uploadedAt) {
        this.uploadedAt = uploadedAt;
    }

    public String getSupplierName() {
        return supplierName;
    }

    public void setSupplierName(String supplierName) {
        this.supplierName = supplierName;
    }


    public String getInvoiceNumber() {
        return invoiceNumber;
    }

    public void setInvoiceNumber(String invoiceNumber) {
        this.invoiceNumber = invoiceNumber;
    }

    public LocalDate getInvoiceDate() {
        return invoiceDate;
    }

    public void setInvoiceDate(LocalDate invoiceDate) {
        this.invoiceDate = invoiceDate;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public ImportStatusEnum getStatus() {
        return status;
    }

    public void setStatus(ImportStatusEnum status) {
        this.status = status;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public Integer getTotalItems() {
        return totalItems;
    }

    public void setTotalItems(Integer totalItems) {
        this.totalItems = totalItems;
    }

    public Integer getNewItems() {
        return newItems;
    }

    public void setNewItems(Integer newItems) {
        this.newItems = newItems;
    }

    public Integer getUpdatedItems() {
        return updatedItems;
    }

    public void setUpdatedItems(Integer updatedItems) {
        this.updatedItems = updatedItems;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public List<ImportEventItemEntity> getItems() {
        return items;
    }

    public void setItems(List<ImportEventItemEntity> items) {
        this.items = items;
    }
}