package com.yourco.warehouse.service.impl;

import com.yourco.warehouse.dto.InventoryAdjustmentDTO;
import com.yourco.warehouse.dto.ProductAdminDTO;
import com.yourco.warehouse.entity.InventoryAdjustmentEntity;
import com.yourco.warehouse.entity.ProductEntity;
import com.yourco.warehouse.entity.enums.AdjustmentTypeEnum;
import com.yourco.warehouse.repository.InventoryAdjustmentRepository;
import com.yourco.warehouse.repository.ProductRepository;
import com.yourco.warehouse.service.InventoryAdjustmentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class InventoryAdjustmentServiceImpl implements InventoryAdjustmentService {

    private static final Logger log = LoggerFactory.getLogger(InventoryAdjustmentServiceImpl.class);

    private final InventoryAdjustmentRepository adjustmentRepository;
    private final ProductRepository productRepository;

    public InventoryAdjustmentServiceImpl(InventoryAdjustmentRepository adjustmentRepository,
                                          ProductRepository productRepository) {
        this.adjustmentRepository = adjustmentRepository;
        this.productRepository = productRepository;
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
}