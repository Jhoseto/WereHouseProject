package com.yourco.warehouse.service.impl;



import com.yourco.warehouse.dto.importSystem.ParsedFileDataDTO;
import com.yourco.warehouse.service.FileParserService;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * Имплементация на FileParserService.
 * Използва Apache POI за Excel и OpenCSV за CSV файлове.
 * Оптимизирана за бързо четене на големи файлове.
 */
@Service
public class FileParserServiceImpl implements FileParserService {

    private static final int MAX_PREVIEW_ROWS = 5;
    private static final Set<String> EXCEL_EXTENSIONS = Set.of("xlsx", "xls");
    private static final Set<String> CSV_EXTENSIONS = Set.of("csv", "txt");

    @Override
    public ParsedFileDataDTO parseFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Файлът е празен или липсва");
        }

        String fileName = file.getOriginalFilename();
        if (fileName == null) {
            throw new IllegalArgumentException("Файлът няма име");
        }

        String extension = getFileExtension(fileName).toLowerCase();

        if (EXCEL_EXTENSIONS.contains(extension)) {
            return parseExcelFile(file);
        } else if (CSV_EXTENSIONS.contains(extension)) {
            return parseCsvFile(file);
        } else {
            throw new IllegalArgumentException("Неподдържан файлов формат: " + extension);
        }
    }

    @Override
    public boolean isSupportedFormat(String fileName) {
        if (fileName == null) {
            return false;
        }
        String extension = getFileExtension(fileName).toLowerCase();
        return EXCEL_EXTENSIONS.contains(extension) || CSV_EXTENSIONS.contains(extension);
    }

    /**
     * Парсва Excel файл (XLS или XLSX).
     * Използва Apache POI който работи директно с binary формата на Excel.
     * Чете първия sheet по подразбиране.
     */
    private ParsedFileDataDTO parseExcelFile(MultipartFile file) {
        try {
            Workbook workbook;
            String fileName = file.getOriginalFilename();

            if (fileName.endsWith(".xlsx")) {
                workbook = new XSSFWorkbook(file.getInputStream());
            } else {
                workbook = new HSSFWorkbook(file.getInputStream());
            }

            Sheet sheet = workbook.getSheetAt(0);

            // 🔥 Намираме header реда интелигентно
            Row headerRow = null;
            int headerRowIndex = -1;
            int lastRowNum = sheet.getLastRowNum();

            for (int i = 0; i <= Math.min(lastRowNum, 10); i++) { // Търсим в първите 10 реда
                Row row = sheet.getRow(i);
                if (row == null) continue;

                Cell firstCell = row.getCell(0);
                if (firstCell != null) {
                    String cellValue = getCellValueAsString(firstCell).toLowerCase();
                    // Търсим ключови думи характерни за header
                    if (cellValue.contains("арт") || cellValue.contains("sku") ||
                            cellValue.contains("код") || cellValue.contains("наименование")) {
                        headerRow = row;
                        headerRowIndex = i;
                        break;
                    }
                }
            }

            // Ако не намерим header с ключови думи, използваме първия непразен ред
            if (headerRow == null) {
                headerRow = sheet.getRow(0);
                headerRowIndex = 0;
            }

            if (headerRow == null) {
                workbook.close();
                throw new IllegalArgumentException("Файлът е празен - няма header ред");
            }

            // Извличаме имената на колоните
            List<String> columnNames = new ArrayList<>();
            int columnCount = headerRow.getLastCellNum();

            for (int i = 0; i < columnCount; i++) {
                Cell cell = headerRow.getCell(i);
                String columnName = cell != null ? getCellValueAsString(cell) : "Колона " + (i + 1);
                columnNames.add(columnName.trim());
            }

            // Четем всички редове с данни СЛЕД header реда
            List<Map<String, String>> rows = new ArrayList<>();
            int rowCount = sheet.getLastRowNum();

            // 🔥 КРИТИЧНА ПРОМЯНА: Започваме от реда СЛЕД header-а
            for (int rowIndex = headerRowIndex + 1; rowIndex <= rowCount; rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null || isRowEmpty(row)) {
                    continue;
                }

                Map<String, String> rowData = new LinkedHashMap<>();
                for (int colIndex = 0; colIndex < columnCount; colIndex++) {
                    Cell cell = row.getCell(colIndex);
                    String cellValue = cell != null ? getCellValueAsString(cell) : "";
                    rowData.put("column_" + colIndex, cellValue.trim());
                }

                rows.add(rowData);
            }

            workbook.close();

            // Създаваме резултата
            ParsedFileDataDTO result = new ParsedFileDataDTO();
            result.setFileName(file.getOriginalFilename());
            result.setFileSize(file.getSize());
            result.setColumnNames(columnNames);
            result.setRows(rows);
            result.setTotalRows(rows.size());

            return result;

        } catch (IOException e) {
            throw new RuntimeException("Грешка при четене на Excel файла: " + e.getMessage(), e);
        }
    }


    /**
     * Парсва CSV файл.
     * Използва OpenCSV който се справя добре с различни delimiters и encoding-и.
     * Автоматично разпознава delimiter-а (запетая, точка и запетая, tab).
     */
    private ParsedFileDataDTO parseCsvFile(MultipartFile file) {
        try {
            // Четем файла с UTF-8 encoding
            BufferedReader reader = new BufferedReader(
                    new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8)
            );

            // OpenCSV автоматично parse-ва CSV формата
            CSVReader csvReader = new CSVReaderBuilder(reader)
                    .withSkipLines(0) // Не пропускаме никакви редове
                    .build();

            List<String[]> allRows = csvReader.readAll();
            csvReader.close();

            if (allRows.isEmpty()) {
                throw new IllegalArgumentException("CSV файлът е празен");
            }

            // Първият ред е header
            String[] headerRow = allRows.get(0);
            List<String> columnNames = new ArrayList<>();

            for (int i = 0; i < headerRow.length; i++) {
                String columnName = headerRow[i] != null && !headerRow[i].trim().isEmpty()
                        ? headerRow[i].trim()
                        : "Колона " + (i + 1);
                columnNames.add(columnName);
            }

            // Четем всички редове с данни
            List<Map<String, String>> rows = new ArrayList<>();

            for (int rowIndex = 1; rowIndex < allRows.size(); rowIndex++) {
                String[] rowArray = allRows.get(rowIndex);

                // Проверка дали редът е празен
                if (isArrayEmpty(rowArray)) {
                    continue;
                }

                Map<String, String> rowData = new LinkedHashMap<>();

                for (int colIndex = 0; colIndex < headerRow.length; colIndex++) {
                    String cellValue = colIndex < rowArray.length && rowArray[colIndex] != null
                            ? rowArray[colIndex].trim()
                            : "";
                    rowData.put("column_" + colIndex, cellValue);
                }

                rows.add(rowData);
            }

            // Създаваме резултата
            ParsedFileDataDTO result = new ParsedFileDataDTO();
            result.setFileName(file.getOriginalFilename());
            result.setFileSize(file.getSize());
            result.setColumnNames(columnNames);
            result.setRows(rows);
            result.setTotalRows(rows.size());

            return result;

        } catch (Exception e) {
            throw new RuntimeException("Грешка при четене на CSV файла: " + e.getMessage(), e);
        }
    }

    /**
     * Извлича стойността на Excel cell като String.
     * Обработва различните типове клетки - число, текст, формула, дата.
     */
    private String getCellValueAsString(Cell cell) {
        if (cell == null) {
            return "";
        }

        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();

            case NUMERIC:
                // Проверяваме дали е дата или просто число
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getDateCellValue().toString();
                } else {
                    // Форматираме числото без научна нотация
                    double numericValue = cell.getNumericCellValue();
                    // Ако е цяло число показваме го без decimal точка
                    if (numericValue == Math.floor(numericValue)) {
                        return String.valueOf((long) numericValue);
                    } else {
                        return String.valueOf(numericValue);
                    }
                }

            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());

            case FORMULA:
                // За формули вземаме изчислената стойност а не самата формула
                try {
                    return String.valueOf(cell.getNumericCellValue());
                } catch (IllegalStateException e) {
                    try {
                        return cell.getStringCellValue();
                    } catch (IllegalStateException e2) {
                        return "";
                    }
                }

            case BLANK:
                return "";

            default:
                return "";
        }
    }

    /**
     * Проверява дали Excel ред е празен.
     * Празен ред е ред където всички клетки са празни или null.
     */
    private boolean isRowEmpty(Row row) {
        if (row == null) {
            return true;
        }

        for (int i = 0; i < row.getLastCellNum(); i++) {
            Cell cell = row.getCell(i);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                String value = getCellValueAsString(cell);
                if (!value.trim().isEmpty()) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Проверява дали масив от String-ове е празен.
     */
    private boolean isArrayEmpty(String[] array) {
        if (array == null || array.length == 0) {
            return true;
        }

        for (String value : array) {
            if (value != null && !value.trim().isEmpty()) {
                return false;
            }
        }

        return true;
    }

    /**
     * Извлича file extension от име на файл.
     */
    private String getFileExtension(String fileName) {
        int lastDotIndex = fileName.lastIndexOf('.');
        if (lastDotIndex > 0 && lastDotIndex < fileName.length() - 1) {
            return fileName.substring(lastDotIndex + 1);
        }
        return "";
    }
}