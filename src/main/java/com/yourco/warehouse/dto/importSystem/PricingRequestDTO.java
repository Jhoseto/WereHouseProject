package com.yourco.warehouse.dto.importSystem;

import java.util.List;

public class PricingRequestDTO {

    private List<String> skus;
    private PricingFormulaDTO formula;

    public PricingRequestDTO() {
    }

    public List<String> getSkus() {
        return skus;
    }

    public void setSkus(List<String> skus) {
        this.skus = skus;
    }

    public PricingFormulaDTO getFormula() {
        return formula;
    }

    public void setFormula(PricingFormulaDTO formula) {
        this.formula = formula;
    }
}