package com.yourco.warehouse.dto.importSystem;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Опростен DTO за един price history запис.
 * Използва се в ValidatedItemDTO за показване на историята.
 */
public class PriceHistoryItemDTO {

    private BigDecimal purchasePrice;
    private LocalDate purchaseDate;
    private String supplierName;

    public PriceHistoryItemDTO() {
    }

    public PriceHistoryItemDTO(BigDecimal purchasePrice, LocalDate purchaseDate) {
        this.purchasePrice = purchasePrice;
        this.purchaseDate = purchaseDate;
    }

    // Getters и Setters

    public BigDecimal getPurchasePrice() {
        return purchasePrice;
    }

    public void setPurchasePrice(BigDecimal purchasePrice) {
        this.purchasePrice = purchasePrice;
    }

    public LocalDate getPurchaseDate() {
        return purchaseDate;
    }

    public void setPurchaseDate(LocalDate purchaseDate) {
        this.purchaseDate = purchaseDate;
    }

    public String getSupplierName() {
        return supplierName;
    }

    public void setSupplierName(String supplierName) {
        this.supplierName = supplierName;
    }
}