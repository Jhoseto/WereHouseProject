package com.yourco.warehouse.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * DTO за отговор от API
 */
public class CatalogResponseDTO {

    @JsonProperty("products")
    private List<ProductCatalogDTO> products;

    @JsonProperty("metadata")
    private CatalogMetadataDTO metadata;

    @JsonProperty("success")
    private boolean success;

    @JsonProperty("message")
    private String message;

    // Constructors
    public CatalogResponseDTO() {}

    public CatalogResponseDTO(List<ProductCatalogDTO> products, CatalogMetadataDTO metadata) {
        this.products = products;
        this.metadata = metadata;
        this.success = true;
        this.message = "Success";
    }

    public static CatalogResponseDTO success(List<ProductCatalogDTO> products) {
        CatalogResponseDTO response = new CatalogResponseDTO();
        response.products = products;
        response.success = true;
        response.message = "Success";
        return response;
    }

    public static CatalogResponseDTO error(String message) {
        CatalogResponseDTO response = new CatalogResponseDTO();
        response.success = false;
        response.message = message;
        return response;
    }

    // Getters and Setters
    public List<ProductCatalogDTO> getProducts() { return products; }
    public void setProducts(List<ProductCatalogDTO> products) { this.products = products; }

    public CatalogMetadataDTO getMetadata() { return metadata; }
    public void setMetadata(CatalogMetadataDTO metadata) { this.metadata = metadata; }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}