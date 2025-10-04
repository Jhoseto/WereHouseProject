package com.yourco.warehouse.service;

import com.yourco.warehouse.dto.importSystem.PricingFormulaDTO;

import java.math.BigDecimal;


/**
 * Service за ценообразуване и изчисления на маржове.
 * Съдържа чисто математическа логика без database операции.
 */
public interface PricingService {

    /**
     * Изчислява продажна цена прилагайки формула към доставна цена.
     *
     * @param purchasePrice Доставна цена
     * @param formula Формула за изчисление
     * @return Изчислена продажна цена
     */
    BigDecimal calculateSellingPrice(BigDecimal purchasePrice, PricingFormulaDTO formula);

    /**
     * Изчислява марж процент между доставна и продажна цена.
     * Марж = ((Продажна - Доставна) / Доставна) * 100
     *
     * @param purchasePrice Доставна цена
     * @param sellingPrice Продажна цена
     * @return Марж процент
     */
    BigDecimal calculateMarginPercent(BigDecimal purchasePrice, BigDecimal sellingPrice);

    /**
     * Закръгля цена според зададени правила.
     *
     * @param price Цена за закръгляне
     * @param roundTo До каква стойност да закръгли (например 0.50)
     * @return Закръглена цена
     */
    BigDecimal roundPrice(BigDecimal price, BigDecimal roundTo);

    /**
     * Проверява дали маржът е в приемливи граници.
     *
     * @param marginPercent Марж процент
     * @return true ако маржът е между 10% и 100%
     */
    boolean isMarginAcceptable(BigDecimal marginPercent);
}