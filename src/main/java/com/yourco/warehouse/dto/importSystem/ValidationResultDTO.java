package com.yourco.warehouse.dto.importSystem;

import com.yourco.warehouse.entity.enums.ValidationStatusEnum;

import java.util.ArrayList;
import java.util.List;

/**
 * DTO съдържащ резултатите от валидацията на импорт данни.
 * Съдържа списък с всички валидирани артикули и обща статистика.
 */
public class ValidationResultDTO {

    private List<ValidatedItemDTO> items;
    private Integer totalItems;
    private Integer validItems;
    private Integer itemsWithWarnings;
    private Integer itemsWithErrors;
    private Integer newProducts;
    private Integer existingProducts;

    public ValidationResultDTO() {
        this.items = new ArrayList<>();
        this.totalItems = 0;
        this.validItems = 0;
        this.itemsWithWarnings = 0;
        this.itemsWithErrors = 0;
        this.newProducts = 0;
        this.existingProducts = 0;
    }

    /**
     * Добавя валидиран артикул и update-ва статистиката.
     */
    public void addItem(ValidatedItemDTO item) {
        this.items.add(item);
        this.totalItems++;

        switch (item.getStatus()) {
            case VALID:
                this.validItems++;
                break;
            case WARNING:
                this.itemsWithWarnings++;
                break;
            case ERROR:
                this.itemsWithErrors++;
                break;
        }

        if (item.isNewProduct()) {
            this.newProducts++;
        } else {
            this.existingProducts++;
        }
    }

    public void recalculateStatistics() {
        this.totalItems = items.size();
        this.validItems = (int) items.stream().filter(i -> i.getStatus() == ValidationStatusEnum.VALID).count();
        this.itemsWithWarnings = (int) items.stream().filter(i -> i.getStatus() == ValidationStatusEnum.WARNING).count();
        this.itemsWithErrors = (int) items.stream().filter(i -> i.getStatus() == ValidationStatusEnum.ERROR).count();
        this.newProducts = (int) items.stream().filter(ValidatedItemDTO::isNewProduct).count();
        this.existingProducts = totalItems - newProducts;
    }


    /**
     * Проверява дали има артикули готови за импорт.
     */
    public boolean hasValidItems() {
        return validItems > 0 || itemsWithWarnings > 0;
    }

    // Getters и Setters

    public List<ValidatedItemDTO> getItems() {
        return items;
    }

    public void setItems(List<ValidatedItemDTO> items) {
        this.items = items;
    }

    public Integer getTotalItems() {
        return totalItems;
    }

    public void setTotalItems(Integer totalItems) {
        this.totalItems = totalItems;
    }

    public Integer getValidItems() {
        return validItems;
    }

    public void setValidItems(Integer validItems) {
        this.validItems = validItems;
    }

    public Integer getItemsWithWarnings() {
        return itemsWithWarnings;
    }

    public void setItemsWithWarnings(Integer itemsWithWarnings) {
        this.itemsWithWarnings = itemsWithWarnings;
    }

    public Integer getItemsWithErrors() {
        return itemsWithErrors;
    }

    public void setItemsWithErrors(Integer itemsWithErrors) {
        this.itemsWithErrors = itemsWithErrors;
    }

    public Integer getNewProducts() {
        return newProducts;
    }

    public void setNewProducts(Integer newProducts) {
        this.newProducts = newProducts;
    }

    public Integer getExistingProducts() {
        return existingProducts;
    }

    public void setExistingProducts(Integer existingProducts) {
        this.existingProducts = existingProducts;
    }
}