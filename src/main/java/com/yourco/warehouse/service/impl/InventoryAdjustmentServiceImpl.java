package com.yourco.warehouse.service.impl;

import com.yourco.warehouse.dto.InventoryAdjustmentDTO;
import com.yourco.warehouse.dto.ProductAdminDTO;
import com.yourco.warehouse.entity.InventoryAdjustmentEntity;
import com.yourco.warehouse.entity.ProductEntity;
import com.yourco.warehouse.repository.InventoryAdjustmentRepository;
import com.yourco.warehouse.repository.ProductRepository;
import com.yourco.warehouse.service.InventoryAdjustmentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

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
        log.info("Creating adjustment for product: {}, type: {}, quantity: {}",
                dto.getProductId(), dto.getAdjustmentType(), dto.getQuantity());

        // Намираме продукта
        ProductEntity product = productRepository.findById(dto.getProductId())
                .orElseThrow(() -> new IllegalArgumentException("Продуктът не е намерен"));

        int currentQty = product.getQuantityAvailable() != null ? product.getQuantityAvailable() : 0;
        int newQty;
        int change;

        // Изчисляваме новото количество според типа
        switch (dto.getAdjustmentType().toUpperCase()) {
            case "ADD":
                newQty = currentQty + dto.getQuantity();
                change = dto.getQuantity();
                break;
            case "REMOVE":
                newQty = Math.max(0, currentQty - dto.getQuantity());
                change = -(dto.getQuantity());
                break;
            case "SET":
                newQty = dto.getQuantity();
                change = dto.getQuantity() - currentQty;
                break;
            default:
                throw new IllegalArgumentException("Невалиден тип корекция: " + dto.getAdjustmentType());
        }

        // Създаваме adjustment записа
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

        // Запазваме adjustment-a
        adjustmentRepository.save(adjustment);

        // Обновяваме количеството на продукта
        product.setQuantityAvailable(newQty);
        ProductEntity saved = productRepository.save(product);

        log.info("Adjustment created: {} -> {}", currentQty, newQty);
        return ProductAdminDTO.from(saved);
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
        return adjustmentRepository.findAll()
                .stream()
                .map(InventoryAdjustmentDTO::from)
                .toList();
    }
}