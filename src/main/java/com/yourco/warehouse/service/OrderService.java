package com.yourco.warehouse.service;

import com.yourco.warehouse.entity.Order;
import com.yourco.warehouse.entity.UserEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface OrderService {

    /**
     * Създава поръчка от количката на потребителя
     * @param userId ID на потребителя
     * @param notes бележки към поръчката (може да е null)
     * @return създадената поръчка
     * @throws IllegalArgumentException ако количката е празна или няма достатъчно наличност
     * @throws IllegalStateException ако има проблем при създаването
     */
    Order createOrderFromCart(Long userId, String notes);

    /**
     * Получава поръчка по ID за конкретен клиент
     * @param orderId ID на поръчката
     * @param clientId ID на клиента (за сигурност)
     * @return поръчката ако съществува и принадлежи на клиента
     */
    Optional<Order> getOrderByIdForClient(Long orderId, Long clientId);

    /**
     * Получава всички поръчки на клиент, подредени по дата (най-новите първи)
     * @param clientId ID на клиента
     * @return списък с поръчки
     */
    List<Order> getOrdersForClient(Long clientId);

    /**
     * Получава поръчките на клиент с пагинация
     * @param clientId ID на клиента
     * @param pageable настройки за пагинация
     * @return страница с поръчки
     */
    Page<Order> getOrdersForClient(Long clientId, Pageable pageable);

    /**
     * Обновява количеството на артикул в поръчка (само за SUBMITTED поръчки)
     * @param orderId ID на поръчката
     * @param productId ID на продукта
     * @param newQuantity новото количество
     * @param clientId ID на клиента (за сигурност)
     * @return true ако е успешно обновено
     */
    boolean updateOrderItemQuantity(Long orderId, Long productId, Integer newQuantity, Long clientId);

    /**
     * Премахва артикул от поръчка (само за SUBMITTED поръчки)
     * @param orderId ID на поръчката
     * @param productId ID на продукта
     * @param clientId ID на клиента (за сигурност)
     * @return true ако е успешно премахнат
     */
    boolean removeOrderItem(Long orderId, Long productId, Long clientId);

    /**
     * Проверява дали поръчката може да се редактира (статус SUBMITTED)
     * @param order поръчката
     * @return true ако може да се редактира
     */
    boolean canEditOrder(Order order);

    /**
     * Пренаизчислява общите суми на поръчката след промяна в артикулите
     * @param order поръчката за преизчисление
     * @return обновената поръчка
     */
    Order recalculateOrderTotals(Order order);

    /**
     * Обновява всички артикули в поръчка с една операция (batch update)
     * @param orderId ID на поръчката
     * @param itemUpdates Map с productId -> quantity за новите количества
     * @param clientId ID на клиента (за сигурност)
     * @return Map с резултат и детайли за операцията
     */
    Map<String, Object> updateOrderBatch(Long orderId, Map<Long, Integer> itemUpdates, Long clientId);
}