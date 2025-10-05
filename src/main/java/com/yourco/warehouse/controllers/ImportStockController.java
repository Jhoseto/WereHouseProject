package com.yourco.warehouse.controllers;

import com.yourco.warehouse.dto.importSystem.*;
import com.yourco.warehouse.service.ImportStockService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/admin/inventory/importStock")
public class ImportStockController {

    private final ImportStockService importStockService;

    @Autowired
    public ImportStockController(ImportStockService importStockService) {
        this.importStockService = importStockService;
    }

    @PostMapping("/upload")
    public ResponseEntity<ImportSessionDTO> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("uploadedBy") String uploadedBy) {

        ImportSessionDTO session = importStockService.uploadAndParseFile(file, uploadedBy);
        return ResponseEntity.ok(session);
    }

    @PostMapping("/{uuid}/mapping")
    public ResponseEntity<ImportSessionDTO> saveMapping(
            @PathVariable String uuid,
            @RequestBody ColumnMappingDTO columnMapping) {

        ImportSessionDTO session = importStockService.saveColumnMapping(uuid, columnMapping);
        return ResponseEntity.ok(session);
    }

    @PostMapping("/{uuid}/validate")
    public ResponseEntity<ValidationResultDTO> validateData(@PathVariable String uuid) {
        ValidationResultDTO result = importStockService.validateData(uuid);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{uuid}/pricing")
    public ResponseEntity<ValidationResultDTO> applyPricing(
            @PathVariable String uuid,
            @RequestBody PricingRequestDTO request) {

        ValidationResultDTO result = importStockService.applyPricing(
                uuid,
                request.getSkus(),
                request.getFormula()
        );
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{uuid}/pricing/manual")
    public ResponseEntity<Void> setManualPrice(
            @PathVariable String uuid,
            @RequestBody ManualPriceDTO request) {

        importStockService.setManualPrice(uuid, request.getSku(), request.getSellingPrice());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{uuid}/summary")
    public ResponseEntity<ImportSummaryDTO> getSummary(@PathVariable String uuid) {
        // Metadata не е критично за summary - може да се вземе от session

        ImportSummaryDTO summary = importStockService.getSummary(uuid, null);
        return ResponseEntity.ok(summary);
    }

    @PostMapping("/{uuid}/confirm")
    public ResponseEntity<Long> confirmImport(@PathVariable String uuid) {
        Long importEventId = importStockService.confirmImport(uuid);
        return ResponseEntity.status(HttpStatus.CREATED).body(importEventId);
    }

    @GetMapping("/{uuid}")
    public ResponseEntity<ImportSessionDTO> getSession(@PathVariable String uuid) {
        ImportSessionDTO session = importStockService.getSession(uuid);
        if (session == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(session);
    }

    @DeleteMapping("/{uuid}")
    public ResponseEntity<Void> cancelImport(@PathVariable String uuid) {
        importStockService.cancelImport(uuid);
        return ResponseEntity.noContent().build();
    }
}