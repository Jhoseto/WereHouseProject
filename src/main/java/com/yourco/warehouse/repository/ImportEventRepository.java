package com.yourco.warehouse.repository;


import com.yourco.warehouse.entity.ImportEventEntity;
import com.yourco.warehouse.entity.enums.ImportStatusEnum;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository за импорт евенти.
 * Оптимизиран за бързи заявки при показване на история и търсене.
 */
@Repository
public interface ImportEventRepository extends JpaRepository<ImportEventEntity, Long> {

    /**
     * Намира импорт евент по UUID.
     * Използва unique индекса idx_uuid за моментален lookup.
     * Това е критична заявка защото я използваме през целия wizard процес.
     */
    Optional<ImportEventEntity> findByUuid(String uuid);

    /**
     * Взима всички импорти на даден потребител сортирани по дата.
     * Използва композитния индекс idx_uploaded_by_date за бърза заявка.
     */
    List<ImportEventEntity> findByUploadedByOrderByUploadedAtDesc(String uploadedBy);

    /**
     * Paginated версия на горната заявка за показване на история с pagination.
     * Много по-ефективно от зареждане на всички импорти наведнъж.
     */
    Page<ImportEventEntity> findByUploadedByOrderByUploadedAtDesc(String uploadedBy, Pageable pageable);

    /**
     * Взима импорти по статус.
     * Използва индекса idx_status за бърза заявка.
     * Полезно за мониторинг на провалени или висящи импорти.
     */
    List<ImportEventEntity> findByStatusOrderByUploadedAtDesc(ImportStatusEnum status);

    /**
     * Взима импорти в определен период от време.
     * Composite индексът на uploaded_by и uploaded_at прави това бързо.
     */
    List<ImportEventEntity> findByUploadedByAndUploadedAtBetweenOrderByUploadedAtDesc(
            String uploadedBy, LocalDateTime start, LocalDateTime end);

    /**
     * Custom query за статистика на импортите.
     * Използва aggregation функции за бързо изчисляване без да товарим application слоя.
     */
    @Query("SELECT COUNT(ie), SUM(ie.totalItems), SUM(ie.newItems), SUM(ie.updatedItems) " +
            "FROM ImportEventEntity ie WHERE ie.uploadedBy = :uploadedBy AND ie.status = :status")
    Object[] getImportStatistics(@Param("uploadedBy") String uploadedBy, @Param("status") ImportStatusEnum status);

    /**
     * Намира висящи импорти които са започнати преди определено време.
     * Това е cleanup query за намиране на импорти които са останали IN_PROGRESS
     * заради crash или друг проблем.
     */
    List<ImportEventEntity> findByStatusAndUploadedAtBefore(ImportStatusEnum status, LocalDateTime before);
}