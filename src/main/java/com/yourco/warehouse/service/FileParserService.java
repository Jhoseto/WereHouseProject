package com.yourco.warehouse.service;

import com.yourco.warehouse.dto.importSystem.ParsedFileDataDTO;
import org.springframework.web.multipart.MultipartFile;

/**
 * Service за парсване на различни файлови формати.
 * Поддържа Excel (XLS, XLSX) и CSV файлове.
 * Извлича данните в структуриран формат готов за обработка.
 */
public interface FileParserService {

    /**
     * Парсва качен файл и извлича данните.
     * Автоматично разпознава формата на файла и използва правилния парсер.
     *
     * @param file Качен файл от потребителя
     * @return Структурирани данни от файла с колони и редове
     * @throws IllegalArgumentException ако форматът не се поддържа
     * @throws RuntimeException ако има грешка при четенето
     */
    ParsedFileDataDTO parseFile(MultipartFile file);

    /**
     * Проверява дали даден файл е в поддържан формат.
     *
     * @param fileName Име на файла
     * @return true ако форматът се поддържа
     */
    boolean isSupportedFormat(String fileName);
}