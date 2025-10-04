package com.yourco.warehouse.dto.importSystem;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * DTO който съдържа резултата от парсването на файл.
 * Съдържа имената на колоните и всички редове като структурирани данни.
 */
public class ParsedFileDataDTO {

    private String fileName;
    private Long fileSize;
    private List<String> columnNames;
    private List<Map<String, String>> rows;
    private Integer totalRows;

    public ParsedFileDataDTO() {
        this.columnNames = new ArrayList<>();
        this.rows = new ArrayList<>();
        this.totalRows = 0;
    }

    // Getters и Setters

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    public List<String> getColumnNames() {
        return columnNames;
    }

    public void setColumnNames(List<String> columnNames) {
        this.columnNames = columnNames;
    }

    public List<Map<String, String>> getRows() {
        return rows;
    }

    public void setRows(List<Map<String, String>> rows) {
        this.rows = rows;
    }

    public Integer getTotalRows() {
        return totalRows;
    }

    public void setTotalRows(Integer totalRows) {
        this.totalRows = totalRows;
    }
}