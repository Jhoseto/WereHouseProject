package com.yourco.warehouse.dto.importSystem;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTO за финален преглед на импорта преди потвърждение.
 * Съдържа обобщена информация и детайли за всички артикули.
 */
public class ImportSummaryDTO {

    private Integer totalItems;
    private Integer newItems;
    private Integer updatedItems;
    private Integer totalQuantity;
    private BigDecimal totalPurchaseValue;
    private BigDecimal totalSellingValue;
    private BigDecimal expectedProfit;
    private BigDecimal averageMargin;
    private List<ValidatedItemDTO> items;
    private ImportMetadataDTO metadata;

    public ImportSummaryDTO() {
    }

    // Getters и Setters

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

    public Integer getTotalQuantity() {
        return totalQuantity;
    }

    public void setTotalQuantity(Integer totalQuantity) {
        this.totalQuantity = totalQuantity;
    }

    public BigDecimal getTotalPurchaseValue() {
        return totalPurchaseValue;
    }

    public void setTotalPurchaseValue(BigDecimal totalPurchaseValue) {
        this.totalPurchaseValue = totalPurchaseValue;
    }

    public BigDecimal getTotalSellingValue() {
        return totalSellingValue;
    }

    public void setTotalSellingValue(BigDecimal totalSellingValue) {
        this.totalSellingValue = totalSellingValue;
    }

    public BigDecimal getExpectedProfit() {
        return expectedProfit;
    }

    public void setExpectedProfit(BigDecimal expectedProfit) {
        this.expectedProfit = expectedProfit;
    }

    public BigDecimal getAverageMargin() {
        return averageMargin;
    }

    public void setAverageMargin(BigDecimal averageMargin) {
        this.averageMargin = averageMargin;
    }

    public List<ValidatedItemDTO> getItems() {
        return items;
    }

    public void setItems(List<ValidatedItemDTO> items) {
        this.items = items;
    }

    public ImportMetadataDTO getMetadata() {
        return metadata;
    }

    public void setMetadata(ImportMetadataDTO metadata) {
        this.metadata = metadata;
    }
}