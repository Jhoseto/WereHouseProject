package com.yourco.warehouse.service;

import com.yourco.warehouse.dto.DashboardDTO;
import com.yourco.warehouse.entity.enums.OrderStatus;

/**
 * DASHBOARD SERVICE INTERFACE
 * ===========================
 * Дефинира бизнес операциите за dashboard функционалността.
 * Опростена версия с едно унифицирано DTO.
 */
public interface DashboardService {

    /**
     * Получава пълни dashboard данни - статистики + броячи
     * Заменя getDashboardOverview() + getDailyStatistics()
     *
     * @return DashboardDTO с всички необходими данни
     */
    DashboardDTO getFullDashboard();

    /**
     * Получава само основните броячи - за бързи updates
     *
     * @return DashboardDTO само с броячи
     */
    DashboardDTO getCounters();

    /**
     * Получава поръчки по статус
     * Заменя getOrdersByStatusAsDTO()
     *
     * @param status статус на поръчките
     * @param limit максимален брой резултати
     * @return DashboardDTO с поръчки
     */
    DashboardDTO getOrdersByStatus(OrderStatus status, int limit);
}