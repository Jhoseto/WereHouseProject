package com.yourco.warehouse.service;


import com.yourco.warehouse.dto.importSystem.ColumnMappingDTO;
import com.yourco.warehouse.dto.importSystem.ParsedFileDataDTO;
import com.yourco.warehouse.dto.importSystem.ValidationResultDTO;

/**
 * Service за валидация на импорт данни.
 * Проверява всеки артикул от файла и определя дали може да се импортира.
 * Детектира conflicts с existing products и събира price history.
 */
public interface ImportValidationService {

    /**
     * Валидира парснати данни от файл използвайки column mapping.
     * За всеки артикул проверява:
     * - Валидност на данните (формат, задължителни полета)
     * - Дали артикулът вече съществува в системата
     * - Разлики в цените спрямо историята
     *
     * @param parsedData Парснати данни от файла
     * @param columnMapping Мапване на колони към полета
     * @return ValidationResult с детайли за всеки артикул
     */
    ValidationResultDTO validateImportData(ParsedFileDataDTO parsedData, ColumnMappingDTO columnMapping);
}