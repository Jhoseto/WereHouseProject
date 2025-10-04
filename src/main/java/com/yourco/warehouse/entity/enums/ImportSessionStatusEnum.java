package com.yourco.warehouse.entity.enums;

public enum ImportSessionStatusEnum {
    UPLOADED,      // Файлът е качен и парснат
    MAPPED,        // Колоните са мапнати
    VALIDATED,     // Данните са валидирани
    PRICED,        // Цените са зададени
    READY
}
