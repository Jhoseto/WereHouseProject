package com.yourco.warehouse.dto.importSystem;

import com.yourco.warehouse.entity.enums.ValidationStatusEnum;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * DTO представляващ един валидиран артикул от импорта.
 * Съдържа данните от файла, existing product data ако има такъв,
 * и validation статус със съобщения.
 */
public class ValidatedItemDTO {

    private Integer rowNumber; // Номер на реда във файла за лесна идентификация
    private ValidationStatusEnum status;
    private List<String> messages; // Съобщения - грешки или предупреждения

    // Данни от файла
    private String sku;
    private String name;
    private Integer quantity;
    private BigDecimal purchasePrice;
    private String category;
    private String description;
    private String barcode;

    // Existing product данни ако артикулът вече съществува
    private Long existingProductId;
    private Integer existingQuantity;
    private BigDecimal existingPurchasePrice;
    private BigDecimal existingSellingPrice;
    private List<PriceHistoryItemDTO> priceHistory;

    // Изчислени полета
    private BigDecimal priceDifferencePercent; // Разлика в доставната цена спрямо последната
    private boolean isNew; // true ако е нов продукт
    private boolean selected; // Дали е селектиран за импорт

    public ValidatedItemDTO() {
        this.messages = new ArrayList<>();
        this.priceHistory = new ArrayList<>();
        this.selected = true; // По подразбиране всички валидни артикули са selected
    }

    public void addMessage(String message) {
        this.messages.add(message);
    }

    public void addError(String error) {
        this.messages.add("ГРЕШКА: " + error);
        if (this.status != ValidationStatusEnum.ERROR) {
            this.status = ValidationStatusEnum.ERROR;
        }
    }

    public void addWarning(String warning) {
        this.messages.add("ВНИМАНИЕ: " + warning);
        if (this.status == ValidationStatusEnum.VALID) {
            this.status = ValidationStatusEnum.WARNING;
        }
    }

    // Getters и Setters

    public Integer getRowNumber() {
        return rowNumber;
    }

    public void setRowNumber(Integer rowNumber) {
        this.rowNumber = rowNumber;
    }

    public ValidationStatusEnum getStatus() {
        return status;
    }

    public void setStatus(ValidationStatusEnum status) {
        this.status = status;
    }

    public List<String> getMessages() {
        return messages;
    }

    public void setMessages(List<String> messages) {
        this.messages = messages;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getPurchasePrice() {
        return purchasePrice;
    }

    public void setPurchasePrice(BigDecimal purchasePrice) {
        this.purchasePrice = purchasePrice;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getBarcode() {
        return barcode;
    }

    public void setBarcode(String barcode) {
        this.barcode = barcode;
    }

    public Long getExistingProductId() {
        return existingProductId;
    }

    public void setExistingProductId(Long existingProductId) {
        this.existingProductId = existingProductId;
    }

    public Integer getExistingQuantity() {
        return existingQuantity;
    }

    public void setExistingQuantity(Integer existingQuantity) {
        this.existingQuantity = existingQuantity;
    }

    public BigDecimal getExistingPurchasePrice() {
        return existingPurchasePrice;
    }

    public void setExistingPurchasePrice(BigDecimal existingPurchasePrice) {
        this.existingPurchasePrice = existingPurchasePrice;
    }

    public BigDecimal getExistingSellingPrice() {
        return existingSellingPrice;
    }

    public void setExistingSellingPrice(BigDecimal existingSellingPrice) {
        this.existingSellingPrice = existingSellingPrice;
    }

    public List<PriceHistoryItemDTO> getPriceHistory() {
        return priceHistory;
    }

    public void setPriceHistory(List<PriceHistoryItemDTO> priceHistory) {
        this.priceHistory = priceHistory;
    }

    public BigDecimal getPriceDifferencePercent() {
        return priceDifferencePercent;
    }

    public void setPriceDifferencePercent(BigDecimal priceDifferencePercent) {
        this.priceDifferencePercent = priceDifferencePercent;
    }

    public boolean isNew() {
        return isNew;
    }

    public void setNew(boolean isNew) {
        this.isNew = isNew;
    }

    public boolean isSelected() {
        return selected;
    }

    public void setSelected(boolean selected) {
        this.selected = selected;
    }

}