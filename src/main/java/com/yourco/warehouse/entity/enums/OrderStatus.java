
package com.yourco.warehouse.entity.enums;

public enum OrderStatus {
    PENDING,    // нова поръчка (първите 12 часа)
    URGENT,     // поръчка над 12 часа без обработка
    CONFIRMED,  // обработена/одобрена поръчка
    SHIPPED,    // изпратена поръчка (доставка в процес)
    CANCELLED   // отказана поръчка
}
