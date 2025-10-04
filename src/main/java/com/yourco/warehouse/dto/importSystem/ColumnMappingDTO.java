package com.yourco.warehouse.dto.importSystem;

import java.util.HashMap;
import java.util.Map;

/**
 * DTO за мапване на колони от файл към полета в системата.
 * Key е column_0, column_1 и т.н. (позицията в файла)
 * Value е полето в системата - sku, name, quantity, purchasePrice и т.н.
 */
public class ColumnMappingDTO {

    private Map<String, String> mappings;

    public ColumnMappingDTO() {
        this.mappings = new HashMap<>();
    }

    /**
     * Добавя мапване на колона към поле.
     *
     * @param columnKey column_0, column_1 и т.н.
     * @param fieldName име на полето - sku, name, quantity, purchasePrice
     */
    public void addMapping(String columnKey, String fieldName) {
        this.mappings.put(columnKey, fieldName);
    }

    /**
     * Взима полето което съответства на дадена колона.
     *
     * @param columnKey column_0, column_1 и т.н.
     * @return име на полето или null ако няма мапване
     */
    public String getFieldForColumn(String columnKey) {
        return this.mappings.get(columnKey);
    }

    /**
     * Проверява дали задължително поле е мапнато.
     * Задължителни полета са sku, name, quantity, purchasePrice.
     */
    public boolean hasRequiredFields() {
        return mappings.containsValue("sku")
                && mappings.containsValue("quantity")
                && mappings.containsValue("purchasePrice");
    }

    public Map<String, String> getMappings() {
        return mappings;
    }

    public void setMappings(Map<String, String> mappings) {
        this.mappings = mappings;
    }
}