package com.yourco.warehouse.service;

import java.util.List;
import java.util.Map;

/**
 * Service за предоставяне на данни за графичните анализи в modal-а.
 * Следва принципа "минимален код за максимални резултати" - един метод който
 * събира всички необходими данни и ги предава на frontend-а за визуализация.
 */
public interface GraphModalService {

    /**
     * Събира всички данни необходими за графичните анализи на продукт(и).
     * Този метод е проектиран да минимизира броя заявки към базата данни като
     * събира всички релевантни данни наведнъж.
     *
     * @param productIds Списък с ID-та на продуктите за анализ.
     *                   Ако е празен или null, връща данни за всички активни продукти
     * @param timeRange Времеви обхват за анализа - "7d", "30d", "90d", "1y", "all"
     * @param includeCategories Дали да включи категорийни анализи
     * @param includeSuppliers Дали да включи доставчик анализи
     * @return Map със структурирани данни за всички графични визуализации
     */
    Map<String, Object> getGraphAnalyticsData(
            List<Long> productIds,
            String timeRange,
            boolean includeCategories,
            boolean includeSuppliers
    );

    /**
     * Върща мета информация за възможните анализи - списъци с налични
     * продукти, категории, доставчици които могат да се използват във филтрите.
     * Този метод се извиква при отваряне на modal-а за попълване на dropdown-ите.
     *
     * @return Map с мета данни за конфигуриране на UI контролите
     */
    Map<String, Object> getAnalyticsMetadata();
}