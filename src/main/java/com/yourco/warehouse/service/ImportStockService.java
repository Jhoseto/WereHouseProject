package com.yourco.warehouse.service;

import com.yourco.warehouse.dto.importSystem.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;

/**
 * Главен service за управление на импорт на стоки процеса.
 * Координира всички стъпки от wizard-а и управлява import sessions.
 * Това е facade който опростява сложния multi-step процес за масово зареждане на стока.
 */
public interface ImportStockService {

    /**
     * Стъпка първа от wizard процеса: Качва и парсва файл.
     * Създава нова import session и запазва парснатите данни.
     * Файлът се парсва веднага и данните се структурират за следващите стъпки.
     *
     * @param file Качен файл от потребителя (Excel или CSV)
     * @param uploadedBy Username на потребителя който прави импорта
     * @return ImportSessionDTO с UUID и парснати данни
     * @throws IllegalArgumentException ако файлът е невалиден или формата не се поддържа
     */
    ImportSessionDTO uploadAndParseFile(MultipartFile file, String uploadedBy);

    /**
     * Стъпка втора от wizard процеса: Запазва column mapping за дадена import session.
     * Column mapping дефинира коя колона от файла съответства на кое поле в системата.
     * Например колона нула може да е SKU, колона едно може да е име на продукт и т.н.
     *
     * @param uuid UUID на import session
     * @param columnMapping Мапване на колони към product полета
     * @return Актуализиран ImportSessionDTO със статус MAPPED
     * @throws IllegalArgumentException ако uuid не съществува или mapping е невалиден
     */
    ImportSessionDTO saveColumnMapping(String uuid, ColumnMappingDTO columnMapping);

    /**
     * Стъпка трета от wizard процеса: Валидира данните от файла.
     * Проверява всеки артикул за валидност на данните и детектира conflicts със съществуващи продукти.
     * За existing products зарежда price history за да можем да сравняваме цените.
     * Тази операция използва batch queries за максимална производителност.
     *
     * @param uuid UUID на import session
     * @return ValidationResultDTO с детайли за всички артикули и тяхното състояние
     * @throws IllegalArgumentException ако uuid не съществува или липсва column mapping
     */
    ValidationResultDTO validateData(String uuid);

    /**
     * Стъпка четвърта от wizard процеса: Прилага ценообразуваща формула към селектирани артикули.
     * Изчислява продажни цени базирани на доставните цени използвайки дадената формула.
     * Например може да зададе продажна цена която е тридесет процента над доставната цена.
     *
     * @param uuid UUID на import session
     * @param skus Списък от SKU кодове на артикулите към които да се приложи формулата
     * @param formula Формула за изчисление на цени (markup percent, fixed amount или multiplier)
     * @return Актуализиран ValidationResultDTO с новите изчислени цени
     * @throws IllegalArgumentException ако uuid не съществува или някой SKU не се намира
     */
    ValidationResultDTO applyPricing(String uuid, List<String> skus, PricingFormulaDTO formula);

    /**
     * Стъпка четвърта алтернатива: Задава продажна цена ръчно за конкретен артикул.
     * Използва се когато администраторът иска да зададе специфична цена която не следва формула.
     *
     * @param uuid UUID на import session
     * @param sku SKU код на артикула
     * @param sellingPrice Новата продажна цена която да се зададе
     * @throws IllegalArgumentException ако uuid не съществува или SKU не се намира
     */
    void setManualPrice(String uuid, String sku, BigDecimal sellingPrice);

    /**
     * Стъпка пета от wizard процеса: Взема финален summary за преглед преди потвърждение.
     * Summary-то съдържа обобщена статистика и пълна информация за всички артикули които ще се импортират.
     * Администраторът вижда точно какво ще се случи когато потвърди импорта.
     *
     * @param uuid UUID на import session
     * @param metadata Метаданни за импорта (supplier name, invoice number, notes и т.н.)
     * @return ImportSummaryDTO с пълна информация включително очаквана печалба и маржове
     * @throws IllegalArgumentException ако uuid не съществува
     */
    ImportSummaryDTO getSummary(String uuid, ImportMetadataDTO metadata);

    /**
     * Стъпка шеста финална: Финализира импорта и записва всичко в базата данни.
     * Това е транзакционна операция която създава или update-ва products, създава price history записи,
     * създава inventory adjustments и запазва пълен audit trail в ImportEvent таблицата.
     * Операцията е atomic - или всичко успява или нищо не се променя при грешка.
     *
     * @param uuid UUID на import session
     * @return ID на създадения ImportEvent за референция
     * @throws IllegalArgumentException ако uuid не съществува или данните не са готови
     * @throws RuntimeException ако има database грешка (transaction се rollback-ва автоматично)
     */
    Long confirmImport(String uuid);

    /**
     * Взема съществуваща import session по UUID.
     * Полезно ако потребителят refresh-не браузъра или иска да продължи импорт от по-ранна сесия.
     *
     * @param uuid UUID на import session
     * @return ImportSessionDTO или null ако не съществува или е expired
     */
    ImportSessionDTO getSession(String uuid);

    /**
     * Изтрива import session и всички temporary данни.
     * Използва се когато потребителят откаже импорта преди да го финализира.
     *
     * @param uuid UUID на import session
     */
    void cancelImport(String uuid);

    void syncValidationData(String uuid, List<ValidatedItemDTO> updatedItems);
}