package com.yourco.warehouse.service;

import com.yourco.warehouse.dto.CartDTO;
import com.yourco.warehouse.dto.CartItemDTO;

import java.util.List;

public interface CartService {

    /**
     * Добавя продукт в количката
     */
    String addToCart(Long userId, Long productId, Integer quantity);

    /**
     * Обновява количеството на артикул
     */
    boolean updateQuantity(Long userId, Long productId, Integer newQuantity);

    /**
     * Премахва артикул от количката
     */
    boolean removeFromCart(Long userId, Long productId);

    /**
     * Изчиства цялата количка
     */
    int clearCart(Long userId);

    /**
     * Получава пълна информация за количката (с изчислени суми)
     */
    CartDTO getCart(Long userId);

    /**
     * Получава само списъка с артикули (без суми)
     */
    List<CartItemDTO> getCartItems(Long userId);

    /**
     * Връща общия брой артикули
     */
    Integer getCartItemCount(Long userId);

    /**
     * Проверява дали има артикули
     */
    boolean hasItems(Long userId);

    /**
     * Резервира количествата при подаване на поръчка
     */
    boolean reserveCartItems(Long userId);

    /**
     * Освобождава резервираните количества
     */
    boolean releaseCartReservations(Long userId);

    /**
     * Финализира продажбата
     */
    boolean finalizeCartSale(Long userId);

    /**
     * Валидира наличността на артикулите
     */
    boolean validateCartStock(Long userId);
}