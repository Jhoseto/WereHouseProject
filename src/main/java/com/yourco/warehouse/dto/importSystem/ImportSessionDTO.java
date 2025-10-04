package com.yourco.warehouse.dto.importSystem;

import com.yourco.warehouse.entity.enums.ImportSessionStatusEnum;

/**
 * DTO съдържащ всички данни за една импорт сесия.
 * Този обект се пази в сесията или в temporary storage докато импортът не се финализира.
 */
public class ImportSessionDTO {

    private String uuid;
    private String uploadedBy;
    private ParsedFileDataDTO parsedData;
    private ColumnMappingDTO columnMapping;
    private ValidationResultDTO validationResult;
    private ImportMetadataDTO metadata;
    private ImportSessionStatusEnum status;

    public ImportSessionDTO() {
    }

    public ImportSessionDTO(String uuid, String uploadedBy) {
        this.uuid = uuid;
        this.uploadedBy = uploadedBy;
        this.status = ImportSessionStatusEnum.UPLOADED;
    }

    // Getters и Setters

    public String getUuid() {
        return uuid;
    }

    public void setUuid(String uuid) {
        this.uuid = uuid;
    }

    public String getUploadedBy() {
        return uploadedBy;
    }

    public void setUploadedBy(String uploadedBy) {
        this.uploadedBy = uploadedBy;
    }

    public ParsedFileDataDTO getParsedData() {
        return parsedData;
    }

    public void setParsedData(ParsedFileDataDTO parsedData) {
        this.parsedData = parsedData;
    }

    public ColumnMappingDTO getColumnMapping() {
        return columnMapping;
    }

    public void setColumnMapping(ColumnMappingDTO columnMapping) {
        this.columnMapping = columnMapping;
    }

    public ValidationResultDTO getValidationResult() {
        return validationResult;
    }

    public void setValidationResult(ValidationResultDTO validationResult) {
        this.validationResult = validationResult;
    }

    public ImportMetadataDTO getMetadata() {
        return metadata;
    }

    public void setMetadata(ImportMetadataDTO metadata) {
        this.metadata = metadata;
    }

    public ImportSessionStatusEnum getStatus() {
        return status;
    }

    public void setStatus(ImportSessionStatusEnum status) {
        this.status = status;
    }

}