package com.yourco.warehouse.dto.importSystem;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.yourco.warehouse.entity.ImportEventItemEntity;
import com.yourco.warehouse.entity.enums.ImportActionTypeEnum;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO за представяне на индивидуален артикул в импорт събитие.
 * Комбинира импорт промените с пълната product информация за богато филтриране и търсене.
 * Проектиран да осигури всички данни които frontend-ът може да има нужда за анализ.
 */
public class ImportEventItemDTO {

    // Import event данни
    @JsonProperty("id")
    private Long id;

    @JsonProperty("importEventId")
    private Long importEventId;

    @JsonProperty("actionType")
    private ImportActionTypeEnum actionType;

    @JsonProperty("createdAt")
    private LocalDateTime createdAt;

    // Product основна информация (за търсене и филтриране)
    @JsonProperty("productId")
    private Long productId;

    @JsonProperty("productSku")
    private String productSku;

    @JsonProperty("productName")
    private String productName;

    @JsonProperty("productCategory")
    private String productCategory;

    @JsonProperty("productDescription")
    private String productDescription;

    @JsonProperty("productUnit")
    private String productUnit;

    @JsonProperty("productActive")
    private Boolean productActive;

    // Quantity промени
    @JsonProperty("oldQuantity")
    private Integer oldQuantity;

    @JsonProperty("newQuantity")
    private Integer newQuantity;

    @JsonProperty("quantityChange")
    private Integer quantityChange;

    // Price промени
    @JsonProperty("oldPurchasePrice")
    private BigDecimal oldPurchasePrice;

    @JsonProperty("newPurchasePrice")
    private BigDecimal newPurchasePrice;

    @JsonProperty("purchasePriceChange")
    private BigDecimal purchasePriceChange;

    @JsonProperty("purchasePriceChangePercent")
    private BigDecimal purchasePriceChangePercent;

    @JsonProperty("oldSellingPrice")
    private BigDecimal oldSellingPrice;

    @JsonProperty("newSellingPrice")
    private BigDecimal newSellingPrice;

    @JsonProperty("sellingPriceChange")
    private BigDecimal sellingPriceChange;

    @JsonProperty("sellingPriceChangePercent")
    private BigDecimal sellingPriceChangePercent;

    // Изчислени финансови полета
    @JsonProperty("totalPurchaseValue")
    private BigDecimal totalPurchaseValue;

    @JsonProperty("totalSellingValue")
    private BigDecimal totalSellingValue;

    @JsonProperty("profitMargin")
    private BigDecimal profitMargin;

    @JsonProperty("markupPercent")
    private BigDecimal markupPercent;

    // Конструктори
    public ImportEventItemDTO() {}

    /**
     * Factory method - конвертира ImportEventItemEntity към DTO със пълна product информация.
     * Изчислява всички промени и процентни стойности за богат frontend анализ.
     */
    public static ImportEventItemDTO from(ImportEventItemEntity entity) {
        if (entity == null) return null;

        ImportEventItemDTO dto = new ImportEventItemDTO();

        // Основни полета от entity
        dto.id = entity.getId();
        dto.importEventId = entity.getImportEvent().getId();
        dto.actionType = entity.getActionType();
        dto.createdAt = entity.getCreatedAt();

        // Product информация (с null checks)
        if (entity.getProduct() != null) {
            dto.productId = entity.getProduct().getId();
            dto.productSku = entity.getProduct().getSku();
            dto.productName = entity.getProduct().getName();
            dto.productCategory = entity.getProduct().getCategory();
            dto.productDescription = entity.getProduct().getDescription();
            dto.productUnit = entity.getProduct().getUnit();
            dto.productActive = entity.getProduct().isActive();
        }

        // Quantity данни
        dto.oldQuantity = entity.getOldQuantity();
        dto.newQuantity = entity.getNewQuantity();

        // Purchase price данни
        dto.oldPurchasePrice = entity.getOldPurchasePrice();
        dto.newPurchasePrice = entity.getNewPurchasePrice();

        // Selling price данни
        dto.oldSellingPrice = entity.getOldSellingPrice();
        dto.newSellingPrice = entity.getNewSellingPrice();

        // Изчисляваме промените и процентите
        dto.calculateChanges();
        dto.calculateFinancials();

        return dto;
    }

    /**
     * Изчислява quantity и price промените с процентни стойности.
     * Този метод прави детайлни изчисления за да подпомогне frontend анализа.
     */
    private void calculateChanges() {
        // Quantity change
        if (oldQuantity != null && newQuantity != null) {
            quantityChange = newQuantity - oldQuantity;
        } else if (newQuantity != null) {
            quantityChange = newQuantity; // За нови продукти
        }

        // Purchase price change
        if (oldPurchasePrice != null && newPurchasePrice != null) {
            purchasePriceChange = newPurchasePrice.subtract(oldPurchasePrice);

            if (oldPurchasePrice.compareTo(BigDecimal.ZERO) > 0) {
                purchasePriceChangePercent = purchasePriceChange
                        .divide(oldPurchasePrice, 4, BigDecimal.ROUND_HALF_UP)
                        .multiply(BigDecimal.valueOf(100));
            }
        }

        // Selling price change
        if (oldSellingPrice != null && newSellingPrice != null) {
            sellingPriceChange = newSellingPrice.subtract(oldSellingPrice);

            if (oldSellingPrice.compareTo(BigDecimal.ZERO) > 0) {
                sellingPriceChangePercent = sellingPriceChange
                        .divide(oldSellingPrice, 4, BigDecimal.ROUND_HALF_UP)
                        .multiply(BigDecimal.valueOf(100));
            }
        }
    }

    /**
     * Изчислява финансовите метрики за този артикул.
     * Включва общи стойности, profit margin и markup процент.
     */
    private void calculateFinancials() {
        if (newQuantity == null) return;

        // Total purchase value
        if (newPurchasePrice != null) {
            totalPurchaseValue = newPurchasePrice.multiply(BigDecimal.valueOf(newQuantity));
        }

        // Total selling value
        if (newSellingPrice != null) {
            totalSellingValue = newSellingPrice.multiply(BigDecimal.valueOf(newQuantity));
        }

        // Profit margin и markup percent
        if (newPurchasePrice != null && newSellingPrice != null
                && newPurchasePrice.compareTo(BigDecimal.ZERO) > 0) {

            // Profit margin = (selling - purchase) / selling * 100
            if (newSellingPrice.compareTo(BigDecimal.ZERO) > 0) {
                profitMargin = newSellingPrice.subtract(newPurchasePrice)
                        .divide(newSellingPrice, 4, BigDecimal.ROUND_HALF_UP)
                        .multiply(BigDecimal.valueOf(100));
            }

            // Markup percent = (selling - purchase) / purchase * 100
            markupPercent = newSellingPrice.subtract(newPurchasePrice)
                    .divide(newPurchasePrice, 4, BigDecimal.ROUND_HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
        }
    }

    // Getters и Setters (генерирани автоматично, но добавени за пълнота)
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getImportEventId() { return importEventId; }
    public void setImportEventId(Long importEventId) { this.importEventId = importEventId; }

    public ImportActionTypeEnum getActionType() { return actionType; }
    public void setActionType(ImportActionTypeEnum actionType) { this.actionType = actionType; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public String getProductSku() { return productSku; }
    public void setProductSku(String productSku) { this.productSku = productSku; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getProductCategory() { return productCategory; }
    public void setProductCategory(String productCategory) { this.productCategory = productCategory; }

    public String getProductDescription() { return productDescription; }
    public void setProductDescription(String productDescription) { this.productDescription = productDescription; }

    public String getProductUnit() { return productUnit; }
    public void setProductUnit(String productUnit) { this.productUnit = productUnit; }

    public Boolean getProductActive() { return productActive; }
    public void setProductActive(Boolean productActive) { this.productActive = productActive; }

    public Integer getOldQuantity() { return oldQuantity; }
    public void setOldQuantity(Integer oldQuantity) { this.oldQuantity = oldQuantity; }

    public Integer getNewQuantity() { return newQuantity; }
    public void setNewQuantity(Integer newQuantity) { this.newQuantity = newQuantity; }

    public Integer getQuantityChange() { return quantityChange; }
    public void setQuantityChange(Integer quantityChange) { this.quantityChange = quantityChange; }

    public BigDecimal getOldPurchasePrice() { return oldPurchasePrice; }
    public void setOldPurchasePrice(BigDecimal oldPurchasePrice) { this.oldPurchasePrice = oldPurchasePrice; }

    public BigDecimal getNewPurchasePrice() { return newPurchasePrice; }
    public void setNewPurchasePrice(BigDecimal newPurchasePrice) { this.newPurchasePrice = newPurchasePrice; }

    public BigDecimal getPurchasePriceChange() { return purchasePriceChange; }
    public void setPurchasePriceChange(BigDecimal purchasePriceChange) { this.purchasePriceChange = purchasePriceChange; }

    public BigDecimal getPurchasePriceChangePercent() { return purchasePriceChangePercent; }
    public void setPurchasePriceChangePercent(BigDecimal purchasePriceChangePercent) { this.purchasePriceChangePercent = purchasePriceChangePercent; }

    public BigDecimal getOldSellingPrice() { return oldSellingPrice; }
    public void setOldSellingPrice(BigDecimal oldSellingPrice) { this.oldSellingPrice = oldSellingPrice; }

    public BigDecimal getNewSellingPrice() { return newSellingPrice; }
    public void setNewSellingPrice(BigDecimal newSellingPrice) { this.newSellingPrice = newSellingPrice; }

    public BigDecimal getSellingPriceChange() { return sellingPriceChange; }
    public void setSellingPriceChange(BigDecimal sellingPriceChange) { this.sellingPriceChange = sellingPriceChange; }

    public BigDecimal getSellingPriceChangePercent() { return sellingPriceChangePercent; }
    public void setSellingPriceChangePercent(BigDecimal sellingPriceChangePercent) { this.sellingPriceChangePercent = sellingPriceChangePercent; }

    public BigDecimal getTotalPurchaseValue() { return totalPurchaseValue; }
    public void setTotalPurchaseValue(BigDecimal totalPurchaseValue) { this.totalPurchaseValue = totalPurchaseValue; }

    public BigDecimal getTotalSellingValue() { return totalSellingValue; }
    public void setTotalSellingValue(BigDecimal totalSellingValue) { this.totalSellingValue = totalSellingValue; }

    public BigDecimal getProfitMargin() { return profitMargin; }
    public void setProfitMargin(BigDecimal profitMargin) { this.profitMargin = profitMargin; }

    public BigDecimal getMarkupPercent() { return markupPercent; }
    public void setMarkupPercent(BigDecimal markupPercent) { this.markupPercent = markupPercent; }
}