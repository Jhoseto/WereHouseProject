package com.yourco.warehouse.service;

import com.yourco.warehouse.dto.CartDTO;
import com.yourco.warehouse.dto.CartItemDTO;
import com.yourco.warehouse.entity.UserEntity;

import java.util.List;

public interface CartService {

    /**
     * Добавя продукт в кошницата на потребител
     * @param userId ID на потребителя
     * @param productId ID на продукта
     * @param quantity количество за добавяне
     * @return true ако е успешно добавен
     * @throws IllegalArgumentException ако няма достатъчно наличност
     */
    boolean addToCart(Long userId, Long productId, Integer quantity);

    /**
     * Обновява количеството на артикул в кошницата
     * @param userId ID на потребителя
     * @param productId ID на продукта
     * @param newQuantity новото количество
     * @return true ако е успешно обновен
     * @throws IllegalArgumentException ако няма достатъчно наличност
     */
    boolean updateQuantity(Long userId, Long productId, Integer newQuantity);

    /**
     * Премахва артикул от кошницата
     * @param userId ID на потребителя
     * @param productId ID на продукта
     * @return true ако е успешно премахнат
     */
    boolean removeFromCart(Long userId, Long productId);

    /**
     * Изчиства цялата кошница на потребител
     * @param userId ID на потребителя
     * @return брой изтрити артикули
     */
    int clearCart(Long userId);

    /**
     * Получава всички артикули в кошницата на потребител
     * @param userId ID на потребителя
     * @return списък с артикули в кошницата
     */
    List<CartItemDTO> getCartItems(Long userId);

    /**
     * Получава пълна информация за кошницата
     * @param userId ID на потребителя
     * @return DTO с пълна информация за кошницата
     */
    CartDTO getCart(Long userId);

    /**
     * Връща общия брой артикули в кошницата
     * @param userId ID на потребителя
     * @return общ брой артикули
     */
    Integer getCartItemCount(Long userId);

    /**
     * Проверява дали потребител има артикули в кошницата
     * @param userId ID на потребителя
     * @return true ако има артикули
     */
    boolean hasItems(Long userId);

    /**
     * Резервира количествата в кошницата при подаване на заявка
     * @param userId ID на потребителя
     * @return true ако всички количества са успешно резервирани
     * @throws IllegalStateException ако няма достатъчно наличност
     */
    boolean reserveCartItems(Long userId);

    /**
     * Освобождава резервираните количества (при отказ от заявка)
     * @param userId ID на потребителя
     * @return true ако резервациите са освободени
     */
    boolean releaseCartReservations(Long userId);

    /**
     * Финализира продажбата - извадя количествата от склада
     * @param userId ID на потребителя
     * @return true ако продажбата е финализирана
     */
    boolean finalizeCartSale(Long userId);

    /**
     * Валидира наличността на всички артикули в кошницата
     * @param userId ID на потребителя
     * @return true ако всички артикули имат достатъчна наличност
     */
    boolean validateCartStock(Long userId);
}