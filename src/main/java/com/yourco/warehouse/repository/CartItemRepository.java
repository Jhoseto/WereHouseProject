package com.yourco.warehouse.repository;

import com.yourco.warehouse.entity.CartItem;
import com.yourco.warehouse.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    // Намира всички елементи в кошницата на потребител
    @Query("SELECT c FROM CartItem c " +
            "JOIN FETCH c.product p " +
            "WHERE c.user.id = :userId AND p.active = true " +
            "ORDER BY c.updatedAt DESC")
    List<CartItem> findByUserIdWithProducts(@Param("userId") Long userId);

    // Намира конкретен елемент в кошницата по потребител и продукт
    @Query("SELECT c FROM CartItem c " +
            "WHERE c.user.id = :userId AND c.product.id = :productId")
    Optional<CartItem> findByUserIdAndProductId(@Param("userId") Long userId,
                                                @Param("productId") Long productId);

    // Общ брой артикули в кошницата на потребител
    @Query("SELECT COALESCE(SUM(c.quantity), 0) FROM CartItem c " +
            "JOIN c.product p " +
            "WHERE c.user.id = :userId AND p.active = true")
    Integer countItemsByUserId(@Param("userId") Long userId);

    // Проверява дали потребител има артикули в кошницата
    @Query("SELECT COUNT(c) > 0 FROM CartItem c " +
            "JOIN c.product p " +
            "WHERE c.user.id = :userId AND p.active = true")
    boolean hasItemsByUserId(@Param("userId") Long userId);

    // Изтрива всички елементи от кошницата на потребител
    @Modifying
    @Query("DELETE FROM CartItem c WHERE c.user.id = :userId")
    void deleteAllByUserId(@Param("userId") Long userId);

    // Изтрива конкретен артикул от кошницата
    @Modifying
    @Query("DELETE FROM CartItem c " +
            "WHERE c.user.id = :userId AND c.product.id = :productId")
    void deleteByUserIdAndProductId(@Param("userId") Long userId,
                                    @Param("productId") Long productId);

    // Обновява количеството на артикул в кошницата
    @Modifying
    @Query("UPDATE CartItem c SET c.quantity = :quantity, c.updatedAt = CURRENT_TIMESTAMP " +
            "WHERE c.user.id = :userId AND c.product.id = :productId")
    int updateQuantityByUserIdAndProductId(@Param("userId") Long userId,
                                           @Param("productId") Long productId,
                                           @Param("quantity") Integer quantity);

    // Общо количество за конкретен продукт във всички кошници (за inventory check)
    @Query("SELECT COALESCE(SUM(c.quantity), 0) FROM CartItem c " +
            "WHERE c.product.id = :productId")
    Integer getTotalQuantityInAllCarts(@Param("productId") Long productId);


}