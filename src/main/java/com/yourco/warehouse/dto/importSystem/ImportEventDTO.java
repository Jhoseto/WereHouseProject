package com.yourco.warehouse.dto.importSystem;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.yourco.warehouse.entity.ImportEventEntity;
import com.yourco.warehouse.entity.enums.ImportStatusEnum;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO за представяне на импорт събитие в историята и детайлния изглед.
 * Включва всички метаданни плюс изчислени статистики за frontend анализ.
 * Проектиран да носи точно толкова информация колкото е необходимо за UI.
 */
public class ImportEventDTO {

    @JsonProperty("id")
    private Long id;

    @JsonProperty("uuid")
    private String uuid;

    @JsonProperty("fileName")
    private String fileName;

    @JsonProperty("uploadedBy")
    private String uploadedBy;

    @JsonProperty("uploadedAt")
    private LocalDateTime uploadedAt;

    @JsonProperty("completedAt")
    private LocalDateTime completedAt;

    @JsonProperty("status")
    private ImportStatusEnum status;

    // Метаданни за импорта
    @JsonProperty("supplierName")
    private String supplierName;

    @JsonProperty("invoiceNumber")
    private String invoiceNumber;

    @JsonProperty("invoiceDate")
    private LocalDate invoiceDate;

    @JsonProperty("notes")
    private String notes;

    // Статистики на импорта
    @JsonProperty("totalItems")
    private Integer totalItems;

    @JsonProperty("newItems")
    private Integer newItems;

    @JsonProperty("updatedItems")
    private Integer updatedItems;

    // Финансови изчисления (изчисляват се от items)
    @JsonProperty("totalPurchaseValue")
    private BigDecimal totalPurchaseValue;

    @JsonProperty("totalSellingValue")
    private BigDecimal totalSellingValue;

    @JsonProperty("averagePurchasePrice")
    private BigDecimal averagePurchasePrice;

    @JsonProperty("averageMarkup")
    private BigDecimal averageMarkup;

    // Error информация ако има
    @JsonProperty("errorMessage")
    private String errorMessage;

    // Списък с артикулите (за детайлния изглед)
    @JsonProperty("items")
    private List<ImportEventItemDTO> items;

    // Конструктори
    public ImportEventDTO() {}

    /**
     * Factory method - конвертира ImportEventEntity към DTO.
     * Изчислява агрегирани стойности от items списъка за статистически цели.
     */
    public static ImportEventDTO from(ImportEventEntity entity) {
        if (entity == null) return null;

        ImportEventDTO dto = new ImportEventDTO();

        // Основни полета
        dto.id = entity.getId();
        dto.uuid = entity.getUuid();
        dto.fileName = entity.getFileName();
        dto.uploadedBy = entity.getUploadedBy();
        dto.uploadedAt = entity.getUploadedAt();
        dto.completedAt = entity.getCompletedAt();
        dto.status = entity.getStatus();

        // Метаданни
        dto.supplierName = entity.getSupplierName();
        dto.invoiceNumber = entity.getInvoiceNumber();
        dto.invoiceDate = entity.getInvoiceDate();
        dto.notes = entity.getNotes();

        // Статистики от entity
        dto.totalItems = entity.getTotalItems();
        dto.newItems = entity.getNewItems();
        dto.updatedItems = entity.getUpdatedItems();
        dto.errorMessage = entity.getErrorMessage();

        // Финансовите изчисления ще се правят отделно
        dto.totalPurchaseValue = BigDecimal.ZERO;
        dto.totalSellingValue = BigDecimal.ZERO;
        dto.averagePurchasePrice = BigDecimal.ZERO;
        dto.averageMarkup = BigDecimal.ZERO;

        return dto;
    }

    /**
     * Изчислява финансовите статистики от списъка с артикули.
     * Този метод се извиква след като items-ите са били заредени и mapped.
     */
    public void calculateFinancialStats() {
        if (items == null || items.isEmpty()) return;

        BigDecimal totalPurchase = BigDecimal.ZERO;
        BigDecimal totalSelling = BigDecimal.ZERO;
        int itemCount = 0;

        for (ImportEventItemDTO item : items) {
            if (item.getNewPurchasePrice() != null && item.getNewQuantity() != null) {
                BigDecimal itemPurchaseValue = item.getNewPurchasePrice()
                        .multiply(BigDecimal.valueOf(item.getNewQuantity()));
                totalPurchase = totalPurchase.add(itemPurchaseValue);
                itemCount++;
            }

            if (item.getNewSellingPrice() != null && item.getNewQuantity() != null) {
                BigDecimal itemSellingValue = item.getNewSellingPrice()
                        .multiply(BigDecimal.valueOf(item.getNewQuantity()));
                totalSelling = totalSelling.add(itemSellingValue);
            }
        }

        this.totalPurchaseValue = totalPurchase;
        this.totalSellingValue = totalSelling;

        // Средна покупна цена
        if (itemCount > 0) {
            this.averagePurchasePrice = totalPurchase.divide(
                    BigDecimal.valueOf(itemCount), 2, BigDecimal.ROUND_HALF_UP);
        }

        // Среден markup процент
        if (totalPurchase.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal markup = totalSelling.subtract(totalPurchase)
                    .divide(totalPurchase, 4, BigDecimal.ROUND_HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            this.averageMarkup = markup;
        }
    }

    // Getters и Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUuid() { return uuid; }
    public void setUuid(String uuid) { this.uuid = uuid; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getUploadedBy() { return uploadedBy; }
    public void setUploadedBy(String uploadedBy) { this.uploadedBy = uploadedBy; }

    public LocalDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(LocalDateTime uploadedAt) { this.uploadedAt = uploadedAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    public ImportStatusEnum getStatus() { return status; }
    public void setStatus(ImportStatusEnum status) { this.status = status; }

    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }

    public String getInvoiceNumber() { return invoiceNumber; }
    public void setInvoiceNumber(String invoiceNumber) { this.invoiceNumber = invoiceNumber; }

    public LocalDate getInvoiceDate() { return invoiceDate; }
    public void setInvoiceDate(LocalDate invoiceDate) { this.invoiceDate = invoiceDate; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Integer getTotalItems() { return totalItems; }
    public void setTotalItems(Integer totalItems) { this.totalItems = totalItems; }

    public Integer getNewItems() { return newItems; }
    public void setNewItems(Integer newItems) { this.newItems = newItems; }

    public Integer getUpdatedItems() { return updatedItems; }
    public void setUpdatedItems(Integer updatedItems) { this.updatedItems = updatedItems; }

    public BigDecimal getTotalPurchaseValue() { return totalPurchaseValue; }
    public void setTotalPurchaseValue(BigDecimal totalPurchaseValue) { this.totalPurchaseValue = totalPurchaseValue; }

    public BigDecimal getTotalSellingValue() { return totalSellingValue; }
    public void setTotalSellingValue(BigDecimal totalSellingValue) { this.totalSellingValue = totalSellingValue; }

    public BigDecimal getAveragePurchasePrice() { return averagePurchasePrice; }
    public void setAveragePurchasePrice(BigDecimal averagePurchasePrice) { this.averagePurchasePrice = averagePurchasePrice; }

    public BigDecimal getAverageMarkup() { return averageMarkup; }
    public void setAverageMarkup(BigDecimal averageMarkup) { this.averageMarkup = averageMarkup; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public List<ImportEventItemDTO> getItems() { return items; }
    public void setItems(List<ImportEventItemDTO> items) {
        this.items = items;
        // Автоматично изчисляваме статистиките когато се задават items
        calculateFinancialStats();
    }
}