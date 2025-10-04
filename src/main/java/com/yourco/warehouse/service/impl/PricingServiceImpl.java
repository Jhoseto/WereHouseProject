package com.yourco.warehouse.service.impl;

import com.yourco.warehouse.dto.importSystem.PricingFormulaDTO;
import com.yourco.warehouse.service.PricingService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Имплементация на PricingService.
 * Всички изчисления използват BigDecimal за точност при работа с пари.
 */
@Service
public class PricingServiceImpl implements PricingService {

    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");
    private static final BigDecimal MIN_ACCEPTABLE_MARGIN = new BigDecimal("10");
    private static final BigDecimal MAX_ACCEPTABLE_MARGIN = new BigDecimal("100");

    @Override
    public BigDecimal calculateSellingPrice(BigDecimal purchasePrice, PricingFormulaDTO formula) {
        if (purchasePrice == null || purchasePrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Доставната цена трябва да е положително число");
        }

        if (formula == null) {
            throw new IllegalArgumentException("Формулата не може да е null");
        }

        BigDecimal result;

        switch (formula.getFormulaType()) {
            case MARKUP_PERCENT:
                // Доставна цена + X процента
                // Например: 10 лв + 30% = 10 + (10 * 0.30) = 13 лв
                BigDecimal percentMultiplier = formula.getValue().divide(ONE_HUNDRED, 4, RoundingMode.HALF_UP);
                BigDecimal markup = purchasePrice.multiply(percentMultiplier);
                result = purchasePrice.add(markup);
                break;

            case FIXED_AMOUNT:
                // Доставна цена + фиксирана сума
                // Например: 10 лв + 2.50 лв = 12.50 лв
                result = purchasePrice.add(formula.getValue());
                break;

            case MULTIPLIER:
                // Доставна цена × множител
                // Например: 10 лв × 1.4 = 14 лв
                result = purchasePrice.multiply(formula.getValue());
                break;

            default:
                throw new IllegalArgumentException("Неизвестен тип формула: " + formula.getFormulaType());
        }

        // Закръгляне ако е зададено
        if (formula.getRoundTo() != null && formula.getRoundTo().compareTo(BigDecimal.ZERO) > 0) {
            result = roundPrice(result, formula.getRoundTo());
        }

        // Закръгляме на 2 decimal места за финалната цена
        return result.setScale(2, RoundingMode.HALF_UP);
    }

    @Override
    public BigDecimal calculateMarginPercent(BigDecimal purchasePrice, BigDecimal sellingPrice) {
        if (purchasePrice == null || purchasePrice.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        if (sellingPrice == null || sellingPrice.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        // Марж = ((Продажна - Доставна) / Доставна) * 100
        BigDecimal difference = sellingPrice.subtract(purchasePrice);
        BigDecimal margin = difference.divide(purchasePrice, 4, RoundingMode.HALF_UP);
        BigDecimal marginPercent = margin.multiply(ONE_HUNDRED);

        return marginPercent.setScale(2, RoundingMode.HALF_UP);
    }

    @Override
    public BigDecimal roundPrice(BigDecimal price, BigDecimal roundTo) {
        if (price == null || roundTo == null || roundTo.compareTo(BigDecimal.ZERO) <= 0) {
            return price;
        }

        // Закръгляме до най-близкото кратно на roundTo
        // Например: 12.73 лв закръглено до 0.50 лв = 12.50 лв
        // Алгоритъм: (цена / roundTo).round() * roundTo
        BigDecimal divided = price.divide(roundTo, 0, RoundingMode.HALF_UP);
        return divided.multiply(roundTo);
    }

    @Override
    public boolean isMarginAcceptable(BigDecimal marginPercent) {
        if (marginPercent == null) {
            return false;
        }

        // Приемлив марж е между 10% и 100%
        return marginPercent.compareTo(MIN_ACCEPTABLE_MARGIN) >= 0
                && marginPercent.compareTo(MAX_ACCEPTABLE_MARGIN) <= 0;
    }
}