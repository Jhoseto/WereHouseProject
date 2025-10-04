package com.yourco.warehouse.entity.enums;

public enum PriceFormulaTypeEnum {
    MARKUP_PERCENT,  // Доставна + процент (например +30%)
    FIXED_AMOUNT,    // Доставна + фиксирана сума (например +2.50 лв)
    MULTIPLIER       // Доставна × множител (например ×1.4)
}
