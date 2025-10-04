package com.yourco.warehouse.service.impl;

import com.yourco.warehouse.dto.importSystem.*;
import com.yourco.warehouse.entity.*;
import com.yourco.warehouse.entity.enums.ImportActionTypeEnum;
import com.yourco.warehouse.entity.enums.ImportSessionStatusEnum;
import com.yourco.warehouse.entity.enums.ImportStatusEnum;
import com.yourco.warehouse.repository.*;
import com.yourco.warehouse.service.FileParserService;
import com.yourco.warehouse.service.ImportStockService;
import com.yourco.warehouse.service.ImportValidationService;
import com.yourco.warehouse.service.PricingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Имплементация на ImportStockService.
 * Управлява целия multi-step импорт процес от качване на файл до финално записване в базата.
 *
 * Import sessions се пазят в паметта с ConcurrentHashMap за thread safety.
 * За production среда с множество сървъри можеш да замениш това с Redis или database storage.
 */
@Service
public class ImportStockServiceImpl implements ImportStockService {

    private final FileParserService fileParserService;
    private final ImportValidationService validationService;
    private final PricingService pricingService;
    private final ProductRepository productRepository;
    private final ImportEventRepository importEventRepository;
    private final ImportEventItemRepository importEventItemRepository;
    private final PurchasePriceHistoryRepository priceHistoryRepository;
    private final InventoryAdjustmentRepository adjustmentRepository;

    // In-memory storage за import sessions
    // За production с множество сървъри използвай Redis или database
    private final Map<String, ImportSessionDTO> sessions = new ConcurrentHashMap<>();

    @Autowired
    public ImportStockServiceImpl(
            FileParserService fileParserService,
            ImportValidationService validationService,
            PricingService pricingService,
            ProductRepository productRepository,
            ImportEventRepository importEventRepository,
            ImportEventItemRepository importEventItemRepository,
            PurchasePriceHistoryRepository priceHistoryRepository,
            InventoryAdjustmentRepository adjustmentRepository) {
        this.fileParserService = fileParserService;
        this.validationService = validationService;
        this.pricingService = pricingService;
        this.productRepository = productRepository;
        this.importEventRepository = importEventRepository;
        this.importEventItemRepository = importEventItemRepository;
        this.priceHistoryRepository = priceHistoryRepository;
        this.adjustmentRepository = adjustmentRepository;
    }

    @Override
    public ImportSessionDTO uploadAndParseFile(MultipartFile file, String uploadedBy) {
        // Валидация на входните данни
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Файлът е празен или липсва");
        }

        if (uploadedBy == null || uploadedBy.trim().isEmpty()) {
            throw new IllegalArgumentException("Username на потребителя е задължителен");
        }

        // Парсваме файла използвайки FileParserService
        ParsedFileDataDTO parsedData = fileParserService.parseFile(file);

        // Генерираме уникален UUID за тази import session
        String uuid = UUID.randomUUID().toString();

        // Създаваме нова session и я запазваме
        ImportSessionDTO session = new ImportSessionDTO(uuid, uploadedBy);
        session.setParsedData(parsedData);
        session.setStatus(ImportSessionStatusEnum.UPLOADED);

        sessions.put(uuid, session);

        return session;
    }

    @Override
    public ImportSessionDTO saveColumnMapping(String uuid, ColumnMappingDTO columnMapping) {
        // Взимаме session-а
        ImportSessionDTO session = getSessionOrThrow(uuid);

        // Валидация на column mapping
        if (columnMapping == null) {
            throw new IllegalArgumentException("Column mapping не може да е null");
        }

        if (!columnMapping.hasRequiredFields()) {
            throw new IllegalArgumentException("Column mapping трябва да съдържа задължителните полета: sku, quantity, purchasePrice");
        }

        // Запазваме mapping-а и update-ваме статуса
        session.setColumnMapping(columnMapping);
        session.setStatus(ImportSessionStatusEnum.MAPPED);

        return session;
    }

    @Override
    public ValidationResultDTO validateData(String uuid) {
        // Взимаме session-а
        ImportSessionDTO session = getSessionOrThrow(uuid);

        // Проверка дали имаме parsed data и column mapping
        if (session.getParsedData() == null) {
            throw new IllegalArgumentException("Липсват парснати данни. Първо качи файл.");
        }

        if (session.getColumnMapping() == null) {
            throw new IllegalArgumentException("Липсва column mapping. Първо мапни колоните.");
        }

        // Валидираме данните използвайки ImportValidationService
        ValidationResultDTO result = validationService.validateImportData(
                session.getParsedData(),
                session.getColumnMapping()
        );

        // Запазваме резултата в session-а и update-ваме статуса
        session.setValidationResult(result);
        session.setStatus(ImportSessionStatusEnum.VALIDATED);

        return result;
    }

    @Override
    public ValidationResultDTO applyPricing(String uuid, List<String> skus, PricingFormulaDTO formula) {
        // Взимаме session-а
        ImportSessionDTO session = getSessionOrThrow(uuid);

        // Проверка дали имаме validation result
        ValidationResultDTO validation = session.getValidationResult();
        if (validation == null) {
            throw new IllegalArgumentException("Липсват validation данни. Първо валидирай данните.");
        }

        // Валидация на входните данни
        if (skus == null || skus.isEmpty()) {
            throw new IllegalArgumentException("Списъкът от SKU кодове е празен");
        }

        if (formula == null) {
            throw new IllegalArgumentException("Формулата не може да е null");
        }

        // Прилагаме формулата към всички селектирани артикули
        for (ValidatedItemDTO item : validation.getItems()) {
            if (skus.contains(item.getSku())) {
                // Изчисляваме нова продажна цена
                BigDecimal sellingPrice = pricingService.calculateSellingPrice(
                        item.getPurchasePrice(),
                        formula
                );
                item.setExistingSellingPrice(sellingPrice);
            }
        }

        // Update-ваме статуса
        session.setStatus(ImportSessionStatusEnum.PRICED);

        return validation;
    }

    @Override
    public void setManualPrice(String uuid, String sku, BigDecimal sellingPrice) {
        // Взимаме session-а
        ImportSessionDTO session = getSessionOrThrow(uuid);

        // Проверка дали имаме validation result
        ValidationResultDTO validation = session.getValidationResult();
        if (validation == null) {
            throw new IllegalArgumentException("Липсват validation данни. Първо валидирай данните.");
        }

        // Валидация на входните данни
        if (sku == null || sku.trim().isEmpty()) {
            throw new IllegalArgumentException("SKU кодът е задължителен");
        }

        if (sellingPrice == null || sellingPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Продажната цена трябва да е положително число");
        }

        // Намираме артикула и задаваме цената
        ValidatedItemDTO item = validation.getItems().stream()
                .filter(i -> sku.equals(i.getSku()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Артикул със SKU " + sku + " не е намерен"));

        item.setExistingSellingPrice(sellingPrice);

        // Update-ваме статуса
        session.setStatus(ImportSessionStatusEnum.PRICED);
    }

    @Override
    public ImportSummaryDTO getSummary(String uuid, ImportMetadataDTO metadata) {
        // Взимаме session-а
        ImportSessionDTO session = getSessionOrThrow(uuid);

        // Проверка дали имаме validation result
        ValidationResultDTO validation = session.getValidationResult();
        if (validation == null) {
            throw new IllegalArgumentException("Липсват validation данни. Първо валидирай данните.");
        }

        // Запазваме metadata в session-а
        session.setMetadata(metadata);

        // Създаваме summary обект
        ImportSummaryDTO summary = new ImportSummaryDTO();
        summary.setMetadata(metadata);

        // Филтрираме само selected артикулите за импорт
        List<ValidatedItemDTO> selectedItems = validation.getItems().stream()
                .filter(ValidatedItemDTO::isSelected)
                .collect(Collectors.toList());

        summary.setItems(selectedItems);

        // Изчисляваме статистики
        int totalItems = selectedItems.size();
        int newItems = (int) selectedItems.stream().filter(ValidatedItemDTO::isNew).count();
        int updatedItems = totalItems - newItems;

        summary.setTotalItems(totalItems);
        summary.setNewItems(newItems);
        summary.setUpdatedItems(updatedItems);

        // Изчисляваме финансови метрики
        int totalQuantity = 0;
        BigDecimal totalPurchaseValue = BigDecimal.ZERO;
        BigDecimal totalSellingValue = BigDecimal.ZERO;
        List<BigDecimal> margins = new ArrayList<>();

        for (ValidatedItemDTO item : selectedItems) {
            totalQuantity += item.getQuantity();

            BigDecimal itemPurchaseValue = item.getPurchasePrice()
                    .multiply(new BigDecimal(item.getQuantity()));
            totalPurchaseValue = totalPurchaseValue.add(itemPurchaseValue);

            if (item.getExistingSellingPrice() != null) {
                BigDecimal itemSellingValue = item.getExistingSellingPrice()
                        .multiply(new BigDecimal(item.getQuantity()));
                totalSellingValue = totalSellingValue.add(itemSellingValue);

                // Изчисляваме марж за този артикул
                BigDecimal margin = pricingService.calculateMarginPercent(
                        item.getPurchasePrice(),
                        item.getExistingSellingPrice()
                );
                margins.add(margin);
            }
        }

        summary.setTotalQuantity(totalQuantity);
        summary.setTotalPurchaseValue(totalPurchaseValue.setScale(2, RoundingMode.HALF_UP));
        summary.setTotalSellingValue(totalSellingValue.setScale(2, RoundingMode.HALF_UP));

        BigDecimal expectedProfit = totalSellingValue.subtract(totalPurchaseValue);
        summary.setExpectedProfit(expectedProfit.setScale(2, RoundingMode.HALF_UP));

        // Среден марж
        if (!margins.isEmpty()) {
            BigDecimal avgMargin = margins.stream()
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(new BigDecimal(margins.size()), 2, RoundingMode.HALF_UP);
            summary.setAverageMargin(avgMargin);
        } else {
            summary.setAverageMargin(BigDecimal.ZERO);
        }

        // Update-ваме статуса
        session.setStatus(ImportSessionStatusEnum.READY);

        return summary;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long confirmImport(String uuid) {
        // Взимаме session-а
        ImportSessionDTO session = getSessionOrThrow(uuid);

        // Проверка дали session-ът е готов за финализиране
        if (session.getStatus() != ImportSessionStatusEnum.READY) {
            throw new IllegalArgumentException("Import session не е готов за финализиране. Моля премини през всички стъпки.");
        }

        ValidationResultDTO validation = session.getValidationResult();
        if (validation == null) {
            throw new IllegalArgumentException("Липсват validation данни");
        }

        // Създаваме ImportEvent запис
        ImportEventEntity importEvent = new ImportEventEntity();
        importEvent.setUuid(uuid);
        importEvent.setFileName(session.getParsedData().getFileName());
        importEvent.setUploadedBy(session.getUploadedBy());
        importEvent.setStatus(ImportStatusEnum.IN_PROGRESS);

        // Добавяме metadata ако има
        if (session.getMetadata() != null) {
            importEvent.setSupplierName(session.getMetadata().getSupplierName());
            importEvent.setInvoiceNumber(session.getMetadata().getInvoiceNumber());
            importEvent.setInvoiceDate(session.getMetadata().getInvoiceDate());
            importEvent.setNotes(session.getMetadata().getNotes());
        }

        // Запазваме ImportEvent за да получим ID
        importEvent = importEventRepository.save(importEvent);

        try {
            // Обработваме всеки selected артикул
            List<ValidatedItemDTO> selectedItems = validation.getItems().stream()
                    .filter(ValidatedItemDTO::isSelected)
                    .collect(Collectors.toList());

            for (ValidatedItemDTO item : selectedItems) {
                if (item.isNew()) {
                    processNewProduct(item, importEvent);
                } else {
                    processExistingProduct(item, importEvent);
                }
            }

            // Маркираме импорта като завършен
            importEvent.markAsCompleted();
            importEventRepository.save(importEvent);

            // Изтриваме session-а от паметта
            sessions.remove(uuid);

            return importEvent.getId();

        } catch (Exception e) {
            // При грешка маркираме импорта като провален
            importEvent.markAsFailed(e.getMessage());
            importEventRepository.save(importEvent);

            // Re-throw exception за да trigger-не transaction rollback
            throw new RuntimeException("Грешка при импортиране: " + e.getMessage(), e);
        }
    }

    /**
     * Обработва нов продукт който не съществува в системата.
     * Създава нов ProductEntity, PurchasePriceHistory и InventoryAdjustment записи.
     */
    private void processNewProduct(ValidatedItemDTO item, ImportEventEntity importEvent) {
        // Създаваме нов продукт
        ProductEntity product = new ProductEntity();
        product.setSku(item.getSku());
        product.setName(item.getName());
        product.setCategory(item.getCategory());
        product.setDescription(item.getDescription());
        product.setSku(item.getBarcode());
        product.sellQuantity(item.getQuantity());
        product.setPurchasePrice(item.getPurchasePrice());
        product.setPrice(item.getExistingSellingPrice());
        product.setLastPurchaseDate(LocalDate.now());

        product = productRepository.save(product);

        // Създаваме price history запис
        PurchasePriceHistoryEntity priceHistory = new PurchasePriceHistoryEntity();
        priceHistory.setProduct(product);
        priceHistory.setPurchasePrice(item.getPurchasePrice());
        priceHistory.setPurchaseDate(LocalDate.now());
        priceHistory.setImportEvent(importEvent);

        if (importEvent.getSupplierName() != null) {
            priceHistory.setSupplierName(importEvent.getSupplierName());
        }
        if (importEvent.getInvoiceNumber() != null) {
            priceHistory.setInvoiceNumber(importEvent.getInvoiceNumber());
        }

        priceHistoryRepository.save(priceHistory);

        // Създаваме inventory adjustment за начално количество
        InventoryAdjustmentEntity adjustment = new InventoryAdjustmentEntity();
        adjustment.setProduct(product);
        adjustment.setQuantityChange(item.getQuantity());
        adjustment.setReason("Импорт на нов продукт от фактура " +
                (importEvent.getInvoiceNumber() != null ? importEvent.getInvoiceNumber() : "без номер"));
        adjustment.setImportEventEnum(importEvent);

        adjustmentRepository.save(adjustment);

        // Създаваме import event item за tracking
        ImportEventItemEntity eventItem = new ImportEventItemEntity();
        eventItem.setImportEvent(importEvent);
        eventItem.setProduct(product);
        eventItem.setActionType(ImportActionTypeEnum.CREATED);
        eventItem.setNewQuantity(item.getQuantity());
        eventItem.setNewPurchasePrice(item.getPurchasePrice());
        eventItem.setNewSellingPrice(item.getExistingSellingPrice());

        importEventItemRepository.save(eventItem);

        // Update-ваме counters на import event
        importEvent.incrementNewItems();
    }

    /**
     * Обработва съществуващ продукт който вече е в системата.
     * Update-ва ProductEntity, добавя PurchasePriceHistory и създава InventoryAdjustment.
     */
    private void processExistingProduct(ValidatedItemDTO item, ImportEventEntity importEvent) {
        // Намираме existing product
        ProductEntity product = productRepository.findById(item.getExistingProductId())
                .orElseThrow(() -> new RuntimeException("Продукт с ID " + item.getExistingProductId() + " не е намерен"));

        // Запазваме старите стойности за import event item
        Integer oldQuantity = product.getQuantityAvailable();
        BigDecimal oldPurchasePrice = product.getPurchasePrice();
        BigDecimal oldSellingPrice = product.getPrice();

        // Update-ваме продукта
        product.setQuantityAvailable(product.getQuantityAvailable() + item.getQuantity());
        product.setPurchasePrice(item.getPurchasePrice());
        product.setLastPurchaseDate(LocalDate.now());

        // Update-ваме selling price само ако е зададена нова
        if (item.getExistingSellingPrice() != null) {
            product.setPrice(item.getExistingSellingPrice());
        }

        productRepository.save(product);

        // Създаваме price history запис
        PurchasePriceHistoryEntity priceHistory = new PurchasePriceHistoryEntity();
        priceHistory.setProduct(product);
        priceHistory.setPurchasePrice(item.getPurchasePrice());
        priceHistory.setPurchaseDate(LocalDate.now());
        priceHistory.setImportEvent(importEvent);

        if (importEvent.getSupplierName() != null) {
            priceHistory.setSupplierName(importEvent.getSupplierName());
        }
        if (importEvent.getInvoiceNumber() != null) {
            priceHistory.setInvoiceNumber(importEvent.getInvoiceNumber());
        }

        priceHistoryRepository.save(priceHistory);

        // Създаваме inventory adjustment за увеличение на количеството
        InventoryAdjustmentEntity adjustment = new InventoryAdjustmentEntity();
        adjustment.setProduct(product);
        adjustment.setQuantityChange(item.getQuantity());
        adjustment.setReason("Импорт на стока от фактура " +
                (importEvent.getInvoiceNumber() != null ? importEvent.getInvoiceNumber() : "без номер"));
        adjustment.setImportEvent(importEvent);

        adjustmentRepository.save(adjustment);

        // Създаваме import event item за tracking
        ImportEventItemEntity eventItem = new ImportEventItemEntity();
        eventItem.setImportEvent(importEvent);
        eventItem.setProduct(product);
        eventItem.setActionType(ImportActionTypeEnum.UPDATED);
        eventItem.setOldQuantity(oldQuantity);
        eventItem.setOldPurchasePrice(oldPurchasePrice);
        eventItem.setOldSellingPrice(oldSellingPrice);
        eventItem.setNewQuantity(product.getQuantityAvailable());
        eventItem.setNewPurchasePrice(item.getPurchasePrice());
        eventItem.setNewSellingPrice(product.getPrice());

        importEventItemRepository.save(eventItem);

        // Update-ваме counters на import event
        importEvent.incrementUpdatedItems();
    }

    @Override
    public ImportSessionDTO getSession(String uuid) {
        return sessions.get(uuid);
    }

    @Override
    public void cancelImport(String uuid) {
        sessions.remove(uuid);
    }

    /**
     * Helper метод който взима session или хвърля exception ако не съществува.
     */
    private ImportSessionDTO getSessionOrThrow(String uuid) {
        ImportSessionDTO session = sessions.get(uuid);
        if (session == null) {
            throw new IllegalArgumentException("Import session с UUID " + uuid + " не е намерен или е изтекъл");
        }
        return session;
    }
}