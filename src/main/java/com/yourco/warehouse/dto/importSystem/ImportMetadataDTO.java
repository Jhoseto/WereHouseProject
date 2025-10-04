package com.yourco.warehouse.dto.importSystem;

import java.time.LocalDate;

/**
 * DTO за метаданни на импорта.
 * Съдържа допълнителна информация за импорта която се въвежда от администратора.
 */
public class ImportMetadataDTO {

    private String supplierName;
    private String invoiceNumber;
    private LocalDate invoiceDate;
    private String notes;

    public ImportMetadataDTO() {
    }

    public ImportMetadataDTO(String supplierName, String invoiceNumber) {
        this.supplierName = supplierName;
        this.invoiceNumber = invoiceNumber;
    }

    // Getters и Setters

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
}