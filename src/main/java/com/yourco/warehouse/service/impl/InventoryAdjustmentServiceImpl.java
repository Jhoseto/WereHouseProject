package com.yourco.warehouse.service.impl;

import com.yourco.warehouse.dto.InventoryAdjustmentDTO;
import com.yourco.warehouse.dto.ProductAdminDTO;
import com.yourco.warehouse.dto.importSystem.ImportEventDTO;
import com.yourco.warehouse.dto.importSystem.ImportEventItemDTO;
import com.yourco.warehouse.entity.ImportEventEntity;
import com.yourco.warehouse.entity.ImportEventItemEntity;
import com.yourco.warehouse.entity.InventoryAdjustmentEntity;
import com.yourco.warehouse.entity.ProductEntity;
import com.yourco.warehouse.entity.enums.AdjustmentTypeEnum;
import com.yourco.warehouse.entity.enums.ImportStatusEnum;
import com.yourco.warehouse.repository.ImportEventItemRepository;
import com.yourco.warehouse.repository.ImportEventRepository;
import com.yourco.warehouse.repository.InventoryAdjustmentRepository;
import com.yourco.warehouse.repository.ProductRepository;
import com.yourco.warehouse.service.InventoryAdjustmentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class InventoryAdjustmentServiceImpl implements InventoryAdjustmentService {

    private static final Logger log = LoggerFactory.getLogger(InventoryAdjustmentServiceImpl.class);

    private final InventoryAdjustmentRepository adjustmentRepository;
    private final ProductRepository productRepository;
    private final ImportEventRepository importEventRepository;
    private final ImportEventItemRepository importEventItemRepository;

    public InventoryAdjustmentServiceImpl(InventoryAdjustmentRepository adjustmentRepository,
                                          ProductRepository productRepository,
                                          ImportEventRepository importEventRepository,
                                          ImportEventItemRepository importEventItemRepository) {
        this.adjustmentRepository = adjustmentRepository;
        this.productRepository = productRepository;
        this.importEventRepository = importEventRepository;
        this.importEventItemRepository = importEventItemRepository;
    }

    @Override
    @Transactional
    public ProductAdminDTO createAdjustment(InventoryAdjustmentDTO dto, String username) {
        log.info("Creating adjustment for product: {}, type: {}", dto.getProductId(), dto.getAdjustmentType());

        ProductEntity product = productRepository.findById(dto.getProductId())
                .orElseThrow(() -> new IllegalArgumentException("Продуктът не е намерен"));

        int currentQty = product.getQuantityAvailable() != null ? product.getQuantityAvailable() : 0;
        int newQty;
        int change;

        if (dto.getAdjustmentType() == AdjustmentTypeEnum.REMOVE) {
            // При премахване reason е задължителен
            if (dto.getReason() == null) {
                throw new IllegalArgumentException("Причината е задължителна при премахване на бройки");
            }

            // Проверка дали има достатъчно количество
            if (currentQty < dto.getQuantity()) {
                throw new IllegalArgumentException(
                        "Недостатъчно количество за премахване. Налично: " + currentQty);
            }

            newQty = currentQty - dto.getQuantity();
            change = -dto.getQuantity();

        } else if (dto.getAdjustmentType() == AdjustmentTypeEnum.INITIAL) {
            // Начално количество при създаване
            newQty = dto.getQuantity();
            change = dto.getQuantity();
        } else {
            throw new IllegalArgumentException("Невалиден тип корекция: " + dto.getAdjustmentType());
        }

        // Създаваме adjustment record
        InventoryAdjustmentEntity adjustment = new InventoryAdjustmentEntity();
        adjustment.setProduct(product);
        adjustment.setAdjustmentType(dto.getAdjustmentType());
        adjustment.setQuantityChange(change);
        adjustment.setQuantityBefore(currentQty);
        adjustment.setQuantityAfter(newQty);
        adjustment.setReason(dto.getReason());
        adjustment.setNote(dto.getNote());
        adjustment.setPerformedBy(username);
        adjustment.setPerformedAt(LocalDateTime.now());

        adjustmentRepository.save(adjustment);

        // Обновяваме количеството на продукта
        product.setQuantityAvailable(newQty);
        productRepository.save(product);

        log.info("Adjustment created successfully. Product {} quantity: {} -> {}",
                product.getId(), currentQty, newQty);

        return ProductAdminDTO.from(product);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryAdjustmentDTO> getAdjustmentHistory(Long productId) {
        return adjustmentRepository.findByProductIdOrderByPerformedAtDesc(productId)
                .stream()
                .map(InventoryAdjustmentDTO::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryAdjustmentDTO> getRecentAdjustments(int limit) {
        return adjustmentRepository.findRecentAdjustments(PageRequest.of(0, limit))
                .stream()
                .map(InventoryAdjustmentDTO::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryAdjustmentDTO> getAllAdjustments() {
        try {
            List<InventoryAdjustmentEntity> adjustments = adjustmentRepository.findAll();

            // Defensive programming - винаги връщаме валиден списък
            if (adjustments.isEmpty()) {
                return Collections.emptyList();
            }

            return adjustments.stream()
                    .map(InventoryAdjustmentDTO::from)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Error getting all adjustments: {}", e.getMessage(), e);
            // Вместо да хвърляме exception, връщаме празен списък
            return Collections.emptyList();
        }
    }

    @Override
    @Transactional
    public Map<String, Object> getMixedHistory() {

        try {
            // Зареждаме adjustments (последните 50)
            List<InventoryAdjustmentEntity> adjustmentEntities = adjustmentRepository
                    .findRecentAdjustments(PageRequest.of(0, 50));

            List<InventoryAdjustmentDTO> adjustments = adjustmentEntities.stream()
                    .map(InventoryAdjustmentDTO::from)
                    .collect(Collectors.toList());

            // Зареждаме import events (само завършените)
            List<ImportEventEntity> importEventEntities = importEventRepository
                    .findByStatusOrderByUploadedAtDesc(ImportStatusEnum.COMPLETED);

            List<ImportEventDTO> importEvents = importEventEntities.stream()
                    .limit(50) // Ограничаваме до последните 50
                    .map(ImportEventDTO::from)
                    .collect(Collectors.toList());

            // Връщаме мапа с двата типа записи
            Map<String, Object> result = new HashMap<>();
            result.put("adjustments", adjustments);
            result.put("importEvents", importEvents);
            result.put("totalAdjustments", adjustments.size());
            result.put("totalImportEvents", importEvents.size());

            return result;

        } catch (Exception e) {
            log.error("Error loading mixed history", e);
            throw new RuntimeException("Грешка при зареждане на историята", e);
        }
    }

    @Override
    @Transactional
    public ImportEventDTO getImportEventDetails(Long importEventId) {
        try {
            ImportEventEntity importEventEntity = importEventRepository.findById(importEventId)
                    .orElseThrow(() -> new IllegalArgumentException("Import event не е намерен: " + importEventId));

            ImportEventDTO importEventDTO = ImportEventDTO.from(importEventEntity);

            List<ImportEventItemEntity> itemEntities = importEventItemRepository.findByImportEventId(importEventId);

            List<ImportEventItemDTO> itemDTOs = itemEntities.stream()
                    .map(ImportEventItemDTO::from)
                    .collect(Collectors.toList());

            importEventDTO.setItems(itemDTOs);

            // Статистики
            int totalItems = itemDTOs.size();
            int newItems = (int) itemDTOs.stream()
                    .filter(item -> item.getOldQuantity() == null || item.getOldQuantity() == 0)
                    .count();
            int updatedItems = totalItems - newItems;

            BigDecimal totalPurchaseValue = itemDTOs.stream()
                    .map(ImportEventItemDTO::getTotalPurchaseValue)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal totalSellingValue = itemDTOs.stream()
                    .map(ImportEventItemDTO::getTotalSellingValue)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal averageMarkup = BigDecimal.ZERO;
            if (totalItems > 0) {
                averageMarkup = itemDTOs.stream()
                        .map(ImportEventItemDTO::getMarkupPercent)
                        .reduce(BigDecimal.ZERO, BigDecimal::add)
                        .divide(BigDecimal.valueOf(totalItems), 2, RoundingMode.HALF_UP);
            }

            importEventDTO.setTotalItems(totalItems);
            importEventDTO.setNewItems(newItems);
            importEventDTO.setUpdatedItems(updatedItems);
            importEventDTO.setTotalPurchaseValue(totalPurchaseValue.setScale(2, RoundingMode.HALF_UP));
            importEventDTO.setTotalSellingValue(totalSellingValue.setScale(2, RoundingMode.HALF_UP));
            importEventDTO.setAverageMarkup(averageMarkup);
            importEventDTO.setNotes(importEventEntity.getNotes());

            return importEventDTO;

        } catch (Exception e) {
            log.error("Error loading import event details for ID: {}", importEventId, e);
            throw new RuntimeException("Грешка при зареждане на детайли за импорт", e);
        }
    }


    @Override
    public List<ImportEventDTO> getImportEventsForNavigation() {

        try {
            // Зареждаме всички завършени import events но БЕЗ items за скорост
            List<ImportEventEntity> entities = importEventRepository
                    .findByStatusOrderByUploadedAtDesc(ImportStatusEnum.COMPLETED);

            // Конвертираме към lightweight DTO-та без items
            List<ImportEventDTO> dtos = entities.stream()
                    .map(ImportEventDTO::from)
                    .collect(Collectors.toList());

            return dtos;

        } catch (Exception e) {
            log.error("Error loading import events for navigation", e);
            throw new RuntimeException("Грешка при зареждане на импорт събития", e);
        }
    }
}