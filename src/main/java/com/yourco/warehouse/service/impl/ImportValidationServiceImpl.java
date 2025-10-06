package com.yourco.warehouse.service.impl;


import com.yourco.warehouse.dto.importSystem.*;
import com.yourco.warehouse.entity.ProductEntity;
import com.yourco.warehouse.entity.PurchasePriceHistoryEntity;
import com.yourco.warehouse.entity.enums.ValidationStatusEnum;
import com.yourco.warehouse.repository.ProductRepository;
import com.yourco.warehouse.repository.PurchasePriceHistoryRepository;
import com.yourco.warehouse.service.ImportValidationService;
import com.yourco.warehouse.service.PricingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Имплементация на ImportValidationService.
 * Оптимизирана за бързо валидиране на големи импорти чрез batch queries.
 */
@Service
public class ImportValidationServiceImpl implements ImportValidationService {

    private final ProductRepository productRepository;
    private final PurchasePriceHistoryRepository priceHistoryRepository;
    private final PricingService pricingService;

    // Threshold за предупреждение при голяма промяна в цената (50%)
    private static final BigDecimal PRICE_CHANGE_WARNING_THRESHOLD = new BigDecimal("50");

    @Autowired
    public ImportValidationServiceImpl(
            ProductRepository productRepository,
            PurchasePriceHistoryRepository priceHistoryRepository,
            PricingService pricingService) {
        this.productRepository = productRepository;
        this.priceHistoryRepository = priceHistoryRepository;
        this.pricingService = pricingService;
    }

    @Override
    public ValidationResultDTO validateImportData(ParsedFileDataDTO parsedData, ColumnMappingDTO columnMapping) {
        ValidationResultDTO result = new ValidationResultDTO();

        // Проверка дали column mapping има задължителните полета
        if (!columnMapping.hasRequiredFields()) {
            throw new IllegalArgumentException("Column mapping не съдържа всички задължителни полета");
        }

        // Извличаме всички SKU кодове от данните за batch query
        List<String> allSkus = new ArrayList<>();
        for (Map<String, String> row : parsedData.getRows()) {
            String sku = getFieldValue(row, columnMapping, "sku");
            if (sku != null && !sku.isEmpty()) {
                allSkus.add(sku);
            }
        }

        // Batch заявка за всички products с тези SKU кодове
        // Това е критична оптимизация - вместо N заявки правим една
        Map<String, ProductEntity> existingProductsMap = new HashMap<>();
        if (!allSkus.isEmpty()) {
            List<ProductEntity> existingProducts = productRepository.findBySkuIn(allSkus);
            for (ProductEntity product : existingProducts) {
                existingProductsMap.put(product.getSku(), product);
            }
        }

        // Batch заявка за price history на всички existing products
        Map<Long, List<PurchasePriceHistoryEntity>> priceHistoryMap = new HashMap<>();
        if (!existingProductsMap.isEmpty()) {
            List<Long> productIds = existingProductsMap.values().stream()
                    .map(ProductEntity::getId)
                    .collect(Collectors.toList());

            List<PurchasePriceHistoryEntity> allHistory = priceHistoryRepository.findLatestPricesForProducts(productIds);
            for (PurchasePriceHistoryEntity history : allHistory) {
                priceHistoryMap.computeIfAbsent(history.getProduct().getId(), k -> new ArrayList<>()).add(history);
            }
        }

        // Валидираме всеки ред от файла
        int rowNumber = 1; // Започваме от 1 защото ред 0 е header
        for (Map<String, String> row : parsedData.getRows()) {
            ValidatedItemDTO item = validateRow(row, columnMapping, rowNumber, existingProductsMap, priceHistoryMap);
            result.addItem(item);
            rowNumber++;
        }

        return result;
    }



    /**
     * Валидира един ред от файла.
     * Проверява формат на данните, дали продуктът съществува, и разлики в цените.
     */
    private ValidatedItemDTO validateRow(
            Map<String, String> row,
            ColumnMappingDTO columnMapping,
            int rowNumber,
            Map<String, ProductEntity> existingProductsMap,
            Map<Long, List<PurchasePriceHistoryEntity>> priceHistoryMap) {

        ValidatedItemDTO item = new ValidatedItemDTO();
        item.setRowNumber(rowNumber);
        item.setStatus(ValidationStatusEnum.VALID);

        // Извличаме полетата от реда използвайки column mapping
        String sku = getFieldValue(row, columnMapping, "sku");
        String name = getFieldValue(row, columnMapping, "name");
        String quantityStr = getFieldValue(row, columnMapping, "quantity");
        String purchasePriceStr = getFieldValue(row, columnMapping, "purchasePrice");
        String category = getFieldValue(row, columnMapping, "category");
        String description = getFieldValue(row, columnMapping, "description");
        String barcode = getFieldValue(row, columnMapping, "barcode");

        // Задаваме основните полета
        item.setSku(sku);
        item.setName(name);
        item.setCategory(category);
        item.setDescription(description);
        item.setBarcode(barcode);

        // Валидация на SKU - задължително поле
        if (sku == null || sku.trim().isEmpty()) {
            item.setNewProduct(true); // Без SKU не може да е в базата
            item.addError("SKU кодът липсва");
            return item;
        }

        // КРИТИЧНА ВАЛИДАЦИЯ: Проверка на формата на SKU според entity constraint
        // SKU може да съдържа само главни букви, цифри, тире и долна черта
        if (!sku.matches("^[A-Z0-9-_]+$")) {
            item.addError("SKU може да съдържа само главни букви, цифри, тире и долна черта");
            // НЕ return-ваме тук - продължаваме да проверяваме дали е нов или съществуващ
            // защото тази информация е полезна дори когато има грешка във формата на SKU
        }

        // ============================================================
        // КРИТИЧНО: ОПРЕДЕЛЯМЕ НОВ/СЪЩЕСТВУВАЩ ПРОДУКТ ВЕДНАГА СЛЕД SKU
        // Това НЕ зависи от валидността на quantity и price!
        // ============================================================
        ProductEntity existingProduct = existingProductsMap.get(sku);

        if (existingProduct != null) {
            // Съществуващ продукт
            item.setNewProduct(false);
            item.setExistingProductId(existingProduct.getId());
            item.setExistingQuantity(existingProduct.getQuantityAvailable());
            item.setExistingPurchasePrice(existingProduct.getPurchasePrice());
            item.setExistingSellingPrice(existingProduct.getPrice());

            // Зареждаме price history
            List<PurchasePriceHistoryEntity> history = priceHistoryMap.get(existingProduct.getId());
            if (history != null && !history.isEmpty()) {
                List<PriceHistoryItemDTO> historyItems = history.stream()
                        .limit(5)
                        .map(h -> new PriceHistoryItemDTO(h.getPurchasePrice(), h.getPurchaseDate()))
                        .collect(Collectors.toList());
                item.setPriceHistory(historyItems);
            }
        } else {
            // Нов продукт
            item.setNewProduct(true);
        }

        // ============================================================
        // валидираме quantity и price
        // Вече знаем дали е нов или съществуващ!
        // ============================================================

        // Валидация на quantity - задължително поле и трябва да е положително число
        Integer quantity = null;
        try {
            quantity = Integer.parseInt(quantityStr);
            if (quantity <= 0) {
                item.addError("Количеството трябва да е положително число");
            } else {
                item.setQuantity(quantity);
            }
        } catch (NumberFormatException e) {
            item.addError("Количеството не е валидно число: " + quantityStr);
        }

        // Валидация на purchase price - задължително поле и трябва да е положително число
        BigDecimal purchasePrice = null;
        try {
            purchasePrice = new BigDecimal(purchasePriceStr);
            if (purchasePrice.compareTo(BigDecimal.ZERO) <= 0) {
                item.addError("Доставната цена трябва да е положително число");
            } else {
                item.setPurchasePrice(purchasePrice);
            }
        } catch (NumberFormatException e) {
            item.addError("Доставната цена не е валидно число: " + purchasePriceStr);
        }

        // Ако има грешки до тук, артикулът вече има правилно зададено newProduct поле!
        if (item.getStatus() == ValidationStatusEnum.ERROR) {
            return item;
        }

        // ============================================================
        // ДОПЪЛНИТЕЛНА ЛОГИКА САМО ЗА ВАЛИДНИ АРТИКУЛИ
        // ============================================================

        // За нови продукти името е задължително
        if (item.isNewProduct()) {
            if (name == null || name.trim().isEmpty()) {
                item.addError("Името на продукта липсва (задължително за нови артикули)");
            }
        }

        // За съществуващи продукти правим price comparison
        if (!item.isNewProduct() && existingProduct != null) {
            List<PurchasePriceHistoryEntity> history = priceHistoryMap.get(existingProduct.getId());
            if (history != null && !history.isEmpty()) {
                BigDecimal lastPrice = history.get(0).getPurchasePrice();
                BigDecimal priceDiff = purchasePrice.subtract(lastPrice);
                BigDecimal priceDiffPercent = priceDiff
                        .divide(lastPrice, 4, BigDecimal.ROUND_HALF_UP)
                        .multiply(new BigDecimal("100"))
                        .setScale(2, BigDecimal.ROUND_HALF_UP);

                item.setPriceDifferencePercent(priceDiffPercent);

                // Предупреждение ако има голяма промяна в цената
                if (priceDiffPercent.abs().compareTo(PRICE_CHANGE_WARNING_THRESHOLD) > 0) {
                    if (priceDiffPercent.compareTo(BigDecimal.ZERO) > 0) {
                        item.addWarning("Доставната цена е оскъпнала с " + priceDiffPercent + "% спрямо последната доставка");
                    } else {
                        item.addWarning("Доставната цена е намаляла с " + priceDiffPercent.abs() + "% спрямо последната доставка");
                    }
                }
            }
        }

        return item;
    }

    /**
     * Извлича стойност на поле от ред използвайки column mapping.
     */
    private String getFieldValue(Map<String, String> row, ColumnMappingDTO columnMapping, String fieldName) {
        // Намираме коя колона е мапната към това поле
        for (Map.Entry<String, String> entry : columnMapping.getMappings().entrySet()) {
            if (entry.getValue().equals(fieldName)) {
                String columnKey = entry.getKey();
                return row.get(columnKey);
            }
        }
        return null;
    }
}