package com.yourco.warehouse.entity.enums;

public enum ValidationStatusEnum {
    VALID,      // Всичко е ок, готов за импорт
    WARNING,    // Има предупреждения но може да се импортира
    ERROR       // Има грешки, не може да се импортира
}
