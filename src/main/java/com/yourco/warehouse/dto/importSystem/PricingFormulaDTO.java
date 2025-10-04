package com.yourco.warehouse.dto.importSystem;

import com.yourco.warehouse.entity.enums.PriceFormulaTypeEnum;

import java.math.BigDecimal;

/**
 * DTO за ценообразуваща формула.
 * Описва как да се изчисли продажна цена от доставна цена.
 */
public class PricingFormulaDTO {

    private PriceFormulaTypeEnum formulaType;
    private BigDecimal value;
    private BigDecimal roundTo; // Опционално закръгляне

    public PricingFormulaDTO() {
    }

    public PricingFormulaDTO(PriceFormulaTypeEnum formulaType, BigDecimal value) {
        this.formulaType = formulaType;
        this.value = value;
    }

    // Getters и Setters

    public PriceFormulaTypeEnum getFormulaType() {
        return formulaType;
    }

    public void setFormulaType(PriceFormulaTypeEnum formulaType) {
        this.formulaType = formulaType;
    }

    public BigDecimal getValue() {
        return value;
    }

    public void setValue(BigDecimal value) {
        this.value = value;
    }

    public BigDecimal getRoundTo() {
        return roundTo;
    }

    public void setRoundTo(BigDecimal roundTo) {
        this.roundTo = roundTo;
    }

}