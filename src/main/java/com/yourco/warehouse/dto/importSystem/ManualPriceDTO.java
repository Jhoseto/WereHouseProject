package com.yourco.warehouse.dto.importSystem;

import java.math.BigDecimal;

public class ManualPriceDTO {

    private String sku;
    private BigDecimal sellingPrice;

    public ManualPriceDTO() {
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public BigDecimal getSellingPrice() {
        return sellingPrice;
    }

    public void setSellingPrice(BigDecimal sellingPrice) {
        this.sellingPrice = sellingPrice;
    }
}