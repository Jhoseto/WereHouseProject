package com.yourco.warehouse.service.impl;

import com.yourco.warehouse.entity.*;
import com.yourco.warehouse.repository.*;
import com.yourco.warehouse.service.GraphModalService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class GraphModalServiceImpl implements GraphModalService {

    private static final Logger log = LoggerFactory.getLogger(GraphModalServiceImpl.class);

    private final ProductRepository productRepository;
    private final PurchasePriceHistoryRepository priceHistoryRepository;
    private final InventoryAdjustmentRepository adjustmentRepository;
    private final ImportEventItemRepository importEventItemRepository;
    private final OrderRepository orderRepository;

    public GraphModalServiceImpl(ProductRepository productRepository,
                                 PurchasePriceHistoryRepository priceHistoryRepository,
                                 InventoryAdjustmentRepository adjustmentRepository,
                                 ImportEventItemRepository importEventItemRepository,
                                 OrderRepository orderRepository) {
        this.productRepository = productRepository;
        this.priceHistoryRepository = priceHistoryRepository;
        this.adjustmentRepository = adjustmentRepository;
        this.importEventItemRepository = importEventItemRepository;
        this.orderRepository = orderRepository;
    }

    @Override
    public Map<String, Object> getGraphAnalyticsData(List<Long> productIds, String timeRange,
                                                     boolean includeCategories, boolean includeSuppliers) {

        // Изчисляваме времевият диапазон на базата на параметъра
        LocalDateTime startDate = calculateStartDate(timeRange);

        // Стъпка 1: Зареждаме основните продуктови данни
        List<ProductEntity> products = loadProducts(productIds);
        if (products.isEmpty()) {
            return createEmptyResponse();
        }

        // Извличаме ID-тата за batch заявки
        List<Long> actualProductIds = products.stream()
                .map(ProductEntity::getId)
                .collect(Collectors.toList());

        // Стъпка 2: Batch зареждане на всички исторически данни
        Map<String, Object> analyticsData = new HashMap<>();

        // Ценова история за всеки продукт
        analyticsData.put("priceHistory", buildPriceHistoryData(actualProductIds, startDate));

        // Количествени движения
        analyticsData.put("quantityMovements", buildQuantityMovementsData(actualProductIds, startDate));

        // Импорт анализи
        analyticsData.put("importAnalysis", buildImportAnalysisData(actualProductIds, startDate));

        // Продажни данни (ако имаме достъп до Order данни)
        analyticsData.put("salesData", buildSalesData(actualProductIds, startDate));

        // Стъпка 3: Категорийни анализи (ако са заявени)
        if (includeCategories) {
            analyticsData.put("categoryAnalysis", buildCategoryAnalysisData(products, startDate));
        }

        // Стъпка 4: Доставчик анализи (ако са заявени)
        if (includeSuppliers) {
            analyticsData.put("supplierAnalysis", buildSupplierAnalysisData(actualProductIds, startDate));
        }

        // Стъпка 5: Мета данни за продуктите
        analyticsData.put("products", buildProductMetadata(products));
        analyticsData.put("dateRange", Map.of(
                "startDate", startDate.toString(),
                "endDate", LocalDateTime.now().toString(),
                "range", timeRange
        ));

        return analyticsData;
    }

    @Override
    public Map<String, Object> getAnalyticsMetadata() {

        Map<String, Object> metadata = new HashMap<>();

        // Всички активни продукти за product selector
        List<ProductEntity> allProducts = productRepository.findByActiveTrue();
        List<Map<String, Object>> productOptions = allProducts.stream()
                .map(p -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", p.getId());
                    map.put("sku", p.getSku() != null ? p.getSku() : "");
                    map.put("name", p.getName() != null ? p.getName() : "");
                    map.put("category", p.getCategory() != null ? p.getCategory() : "");
                    return map;
                })
                .collect(Collectors.toList());

        metadata.put("products", productOptions);

        // Уникални категории
        Set<String> categories = allProducts.stream()
                .map(ProductEntity::getCategory)
                .filter(Objects::nonNull)
                .filter(c -> !c.trim().isEmpty())
                .collect(Collectors.toSet());

        metadata.put("categories", categories.stream().sorted().collect(Collectors.toList()));

        // Уникални доставчици от price history
        List<String> suppliers = priceHistoryRepository.findDistinctSuppliers();
        metadata.put("suppliers", suppliers);

        // Time range опции
        metadata.put("timeRanges", Arrays.asList(
                Map.of("value", "7d", "label", "Последните 7 дни"),
                Map.of("value", "30d", "label", "Последните 30 дни"),
                Map.of("value", "90d", "label", "Последните 3 месеца"),
                Map.of("value", "1y", "label", "Последната година"),
                Map.of("value", "all", "label", "Всички данни")
        ));

        return metadata;
    }

    // ==========================================
    // PRIVATE HELPER МЕТОДИ - организирани логически
    // ==========================================

    /**
     * Изчислява началната дата на базата на time range параметъра
     */
    private LocalDateTime calculateStartDate(String timeRange) {
        LocalDateTime now = LocalDateTime.now();

        return switch (timeRange) {
            case "7d" -> now.minusDays(7);
            case "30d" -> now.minusDays(30);
            case "90d" -> now.minusDays(90);
            case "1y" -> now.minusYears(1);
            default -> LocalDateTime.of(2020, 1, 1, 0, 0); // "all" - далеч в миналото
        };
    }

    /**
     * Зарежда продуктите - или конкретните от списъка, или всички активни
     */
    private List<ProductEntity> loadProducts(List<Long> productIds) {
        if (productIds == null || productIds.isEmpty()) {
            return productRepository.findByActiveTrue();
        } else {
            return productRepository.findAllById(productIds).stream()
                    .filter(ProductEntity::isActive)
                    .collect(Collectors.toList());
        }
    }

    /**
     * Изгражда данни за ценовата история на продуктите.
     * Този метод събира purchase price данни от PurchasePriceHistoryEntity
     * и selling price данни от ImportEventItemEntity за да покаже пълната картина.
     */
    private Map<String, Object> buildPriceHistoryData(List<Long> productIds, LocalDateTime startDate) {
        Map<String, Object> priceData = new HashMap<>();

        // За всеки продукт събираме неговата price history
        for (Long productId : productIds) {
            Map<String, Object> productPriceData = new HashMap<>();

            // Purchase price история
            List<PurchasePriceHistoryEntity> purchaseHistory =
                    priceHistoryRepository.findByProductIdAndDateAfter(productId, startDate.toLocalDate());

            List<Map<String, Object>> purchasePricePoints = purchaseHistory.stream()
                    .map(ph -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("date", ph.getPurchaseDate().toString());
                        map.put("price", ph.getPurchasePrice());
                        map.put("supplier", ph.getSupplierName() != null ? ph.getSupplierName() : "Unknown");
                        return map;
                    })
                    .collect(Collectors.toList());

            productPriceData.put("purchasePrices", purchasePricePoints);

            // Import selling price промени
            List<ImportEventItemEntity> importItems =
                    importEventItemRepository.findByProductIdWithImportEventOrderByDateDesc(productId);

            List<Map<String, Object>> sellingPricePoints = importItems.stream()
                    .filter(item -> item.getImportEvent().getUploadedAt().isAfter(startDate))
                    .map(item -> {
                        Map<String, Object> point = new HashMap<>();
                        point.put("date", item.getImportEvent().getUploadedAt().toLocalDate().toString());
                        point.put("oldPrice", item.getOldSellingPrice());
                        point.put("newPrice", item.getNewSellingPrice());

                        // Изчисляваме процентната промяна
                        if (item.getOldSellingPrice() != null && item.getNewSellingPrice() != null
                                && item.getOldSellingPrice().compareTo(BigDecimal.ZERO) > 0) {
                            BigDecimal changePercent = item.getNewSellingPrice()
                                    .subtract(item.getOldSellingPrice())
                                    .divide(item.getOldSellingPrice(), 4, RoundingMode.HALF_UP)
                                    .multiply(BigDecimal.valueOf(100));
                            point.put("changePercent", changePercent);
                        }

                        return point;
                    })
                    .collect(Collectors.toList());

            productPriceData.put("sellingPrices", sellingPricePoints);

            // Изчисляваме margin history (разликата между selling и purchase цени)
            List<Map<String, Object>> marginHistory = calculateMarginHistory(purchasePricePoints, sellingPricePoints);
            productPriceData.put("marginHistory", marginHistory);

            priceData.put(productId.toString(), productPriceData);
        }

        return priceData;
    }

    /**
     * Изгражда данни за количествените движения - adjustments, импорти, продажби
     */
    private Map<String, Object> buildQuantityMovementsData(List<Long> productIds, LocalDateTime startDate) {
        Map<String, Object> movementsData = new HashMap<>();

        for (Long productId : productIds) {
            List<Map<String, Object>> movements = new ArrayList<>();

            // Inventory adjustments
            List<InventoryAdjustmentEntity> adjustments =
                    adjustmentRepository.findByProductIdOrderByPerformedAtDesc(productId);

            adjustments.stream()
                    .filter(adj -> adj.getPerformedAt().isAfter(startDate))
                    .forEach(adj -> {
                        Map<String, Object> movement = new HashMap<>();
                        movement.put("date", adj.getPerformedAt().toLocalDate().toString());
                        movement.put("type", "adjustment");
                        movement.put("subType", adj.getAdjustmentType().name());
                        movement.put("change", adj.getQuantityChange());
                        movement.put("reason", adj.getReason() != null ? adj.getReason().name() : null);
                        movement.put("note", adj.getNote());
                        movement.put("user", adj.getPerformedBy());
                        movements.add(movement);
                    });

            // Import movements
            List<ImportEventItemEntity> importItems =
                    importEventItemRepository.findByProductIdWithImportEventOrderByDateDesc(productId);

            importItems.stream()
                    .filter(item -> item.getImportEvent().getUploadedAt().isAfter(startDate))
                    .forEach(item -> {
                        Map<String, Object> movement = new HashMap<>();
                        movement.put("date", item.getImportEvent().getUploadedAt().toLocalDate().toString());
                        movement.put("type", "import");
                        movement.put("subType", item.getActionType().name());

                        int change = item.getNewQuantity() - (item.getOldQuantity() != null ? item.getOldQuantity() : 0);
                        movement.put("change", change);
                        movement.put("supplier", item.getImportEvent().getSupplierName());
                        movement.put("fileName", item.getImportEvent().getFileName());
                        movements.add(movement);
                    });

            // Sales movements (от поръчки)
            try {
                List<Order> orders = orderRepository.findBySubmittedAtBetween(startDate, LocalDateTime.now());
                orders.forEach(order -> {
                    order.getItems().stream()
                            .filter(item -> item.getProduct().getId().equals(productId))
                            .forEach(orderItem -> {
                                Map<String, Object> movement = new HashMap<>();
                                movement.put("date", order.getSubmittedAt().toLocalDate().toString());
                                movement.put("type", "sales");
                                movement.put("change", -orderItem.getQty().intValue()); // Отрицателно за намаляване на наличността
                                movement.put("price", orderItem.getUnitPrice());
                                movement.put("status", order.getStatus().name());
                                movements.add(movement);
                            });
                });
            } catch (Exception e) {
                log.warn("Could not load sales movements for quantity data: {}", e.getMessage());
            }

            // Сортираме всички движения по дата
            movements.sort((a, b) -> ((String) a.get("date")).compareTo((String) b.get("date")));

            movementsData.put(productId.toString(), movements);
        }

        return movementsData;
    }

    /**
     * Изгражда импорт анализи - статистики за импортите в които участва продукта
     */
    private Map<String, Object> buildImportAnalysisData(List<Long> productIds, LocalDateTime startDate) {
        Map<String, Object> importData = new HashMap<>();

        for (Long productId : productIds) {
            List<ImportEventItemEntity> importItems =
                    importEventItemRepository.findByProductIdWithImportEventOrderByDateDesc(productId);

            List<Map<String, Object>> imports = importItems.stream()
                    .filter(item -> item.getImportEvent().getUploadedAt().isAfter(startDate))
                    .map(item -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("date", item.getImportEvent().getUploadedAt().toLocalDate().toString());
                        map.put("fileName", item.getImportEvent().getFileName());
                        map.put("supplier", item.getImportEvent().getSupplierName() != null ?
                                item.getImportEvent().getSupplierName() : "Unknown");
                        map.put("actionType", item.getActionType().name());
                        map.put("quantityChange", item.getNewQuantity() - (item.getOldQuantity() != null ? item.getOldQuantity() : 0));
                        map.put("purchasePrice", item.getNewPurchasePrice());
                        map.put("sellingPrice", item.getNewSellingPrice());
                        return map;
                    })
                    .collect(Collectors.toList());

            importData.put(productId.toString(), imports);
        }

        return importData;
    }

    /**
     * Изгражда продажни данни от Order система (ако имаме достъп)
     */
    private Map<String, Object> buildSalesData(List<Long> productIds, LocalDateTime startDate) {
        Map<String, Object> salesData = new HashMap<>();

        try {
            // Зареждаме всички поръчки в период
            List<Order> orders = orderRepository.findBySubmittedAtBetween(startDate, LocalDateTime.now());

            // За всеки продукт събираме неговите продажби
            for (Long productId : productIds) {
                List<Map<String, Object>> productSales = new ArrayList<>();

                orders.forEach(order -> {
                    order.getItems().stream()
                            .filter(item -> item.getProduct().getId().equals(productId))
                            .forEach(orderItem -> {
                                Map<String, Object> sale = new HashMap<>();
                                sale.put("date", order.getSubmittedAt().toLocalDate().toString());
                                sale.put("quantity", orderItem.getQty().intValue());
                                sale.put("price", orderItem.getUnitPrice());
                                sale.put("status", order.getStatus().name());
                                sale.put("clientId", order.getClient().getId());
                                productSales.add(sale);
                            });
                });

                salesData.put(productId.toString(), productSales);
            }

        } catch (Exception e) {
            log.warn("Could not load sales data: {}", e.getMessage());
            // Ако няма достъп до sales data, просто го пропускаме
        }

        return salesData;
    }

    /**
     * Изгражда категорийни анализи
     */
    private Map<String, Object> buildCategoryAnalysisData(List<ProductEntity> products, LocalDateTime startDate) {
        Map<String, List<ProductEntity>> productsByCategory = products.stream()
                .filter(p -> p.getCategory() != null)
                .collect(Collectors.groupingBy(ProductEntity::getCategory));

        Map<String, Object> categoryData = new HashMap<>();

        productsByCategory.forEach((category, categoryProducts) -> {
            Map<String, Object> categoryStats = new HashMap<>();

            // Основни статистики
            categoryStats.put("productCount", categoryProducts.size());
            categoryStats.put("averagePrice", categoryProducts.stream()
                    .filter(p -> p.getPrice() != null)
                    .mapToDouble(p -> p.getPrice().doubleValue())
                    .average().orElse(0.0));

            categoryStats.put("totalValue", categoryProducts.stream()
                    .filter(p -> p.getPrice() != null && p.getQuantityAvailable() != null)
                    .mapToDouble(p -> p.getPrice().doubleValue() * p.getQuantityAvailable())
                    .sum());

            categoryData.put(category, categoryStats);
        });

        return categoryData;
    }

    /**
     * Изгражда доставчик анализи
     */
    private Map<String, Object> buildSupplierAnalysisData(List<Long> productIds, LocalDateTime startDate) {
        Map<String, Object> supplierData = new HashMap<>();

        // Събираме всички price history записи за продуктите в периода
        List<PurchasePriceHistoryEntity> allPriceHistory = new ArrayList<>();
        for (Long productId : productIds) {
            allPriceHistory.addAll(priceHistoryRepository.findByProductIdAndDateAfter(productId, startDate.toLocalDate()));
        }

        // Групираме по доставчик
        Map<String, List<PurchasePriceHistoryEntity>> historyBySupplier = allPriceHistory.stream()
                .filter(ph -> ph.getSupplierName() != null)
                .collect(Collectors.groupingBy(PurchasePriceHistoryEntity::getSupplierName));

        historyBySupplier.forEach((supplier, supplierHistory) -> {
            Map<String, Object> supplierStats = new HashMap<>();

            supplierStats.put("totalPurchases", supplierHistory.size());
            supplierStats.put("averagePrice", supplierHistory.stream()
                    .mapToDouble(ph -> ph.getPurchasePrice().doubleValue())
                    .average().orElse(0.0));

            supplierStats.put("priceStability", calculatePriceStability(supplierHistory));

            supplierData.put(supplier, supplierStats);
        });

        return supplierData;
    }

    /**
     * Изгражда метаданни за продуктите
     */
    private List<Map<String, Object>> buildProductMetadata(List<ProductEntity> products) {
        return products.stream()
                .map(p -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", p.getId());
                    map.put("sku", p.getSku() != null ? p.getSku() : "");
                    map.put("name", p.getName() != null ? p.getName() : "");
                    map.put("category", p.getCategory() != null ? p.getCategory() : "");
                    map.put("currentPrice", p.getPrice() != null ? p.getPrice() : BigDecimal.ZERO);
                    map.put("quantityAvailable", p.getQuantityAvailable() != null ? p.getQuantityAvailable() : 0);
                    return map;
                })
                .collect(Collectors.toList());
    }

    // ==========================================
    // UTILITY МЕТОДИ за изчисления
    // ==========================================

    private List<Map<String, Object>> calculateMarginHistory(List<Map<String, Object>> purchasePoints,
                                                             List<Map<String, Object>> sellingPoints) {
        List<Map<String, Object>> marginHistory = new ArrayList<>();

        // Събираме всички уникални дати от purchase и selling точки
        Set<LocalDate> allDates = new HashSet<>();
        purchasePoints.forEach(p -> allDates.add(LocalDate.parse((String) p.get("date"))));
        sellingPoints.forEach(s -> allDates.add(LocalDate.parse((String) s.get("date"))));

        // Сортираме датите
        List<LocalDate> sortedDates = allDates.stream().sorted().collect(Collectors.toList());

        // Запазваме последните известни purchase и selling цени
        BigDecimal lastPurchase = BigDecimal.ZERO;
        BigDecimal lastSelling = BigDecimal.ZERO;

        for (LocalDate date : sortedDates) {
            // Актуализираме purchase цена ако има нова за тази дата
            Optional<Map<String, Object>> purchaseOnDate = purchasePoints.stream()
                    .filter(p -> LocalDate.parse((String) p.get("date")).equals(date))
                    .findFirst();
            if (purchaseOnDate.isPresent()) {
                lastPurchase = (BigDecimal) purchaseOnDate.get().get("price");
            }

            // Актуализираме selling цена ако има нова за тази дата
            Optional<Map<String, Object>> sellingOnDate = sellingPoints.stream()
                    .filter(s -> LocalDate.parse((String) s.get("date")).equals(date))
                    .findFirst();
            if (sellingOnDate.isPresent()) {
                lastSelling = (BigDecimal) sellingOnDate.get().get("newPrice");
            }

            // Изчисляваме margin само ако имаме и двете цени
            if (lastPurchase.compareTo(BigDecimal.ZERO) > 0 && lastSelling.compareTo(BigDecimal.ZERO) > 0) {
                Map<String, Object> marginPoint = new HashMap<>();
                marginPoint.put("date", date.toString());
                BigDecimal margin = lastSelling.subtract(lastPurchase);
                marginPoint.put("margin", margin);

                // Изчисляваме процентен марж
                if (lastPurchase.compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal marginPercent = margin
                            .divide(lastPurchase, 4, RoundingMode.HALF_UP)
                            .multiply(BigDecimal.valueOf(100));
                    marginPoint.put("marginPercent", marginPercent);
                }

                marginHistory.add(marginPoint);
            }
        }

        return marginHistory;
    }

    private double calculatePriceStability(List<PurchasePriceHistoryEntity> priceHistory) {
        if (priceHistory.size() < 2) return 1.0; //  стабилност ако има само една цена

        List<Double> prices = priceHistory.stream()
                .map(ph -> ph.getPurchasePrice().doubleValue())
                .collect(Collectors.toList());

        double mean = prices.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        double variance = prices.stream()
                .mapToDouble(price -> Math.pow(price - mean, 2))
                .average().orElse(0.0);

        double stdDev = Math.sqrt(variance);

        // Връщаме stability score (по-ниско стандартно отклонение = по-висока стабилност)
        return mean > 0 ? Math.max(0, 1 - (stdDev / mean)) : 0;
    }

    private Map<String, Object> createEmptyResponse() {
        return Map.of(
                "products", Collections.emptyList(),
                "message", "Няма намерени продукти за анализ"
        );
    }
}