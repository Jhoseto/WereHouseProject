package com.yourco.warehouse.service.Impl;

import com.yourco.warehouse.dto.CartDTO;
import com.yourco.warehouse.dto.CartItemDTO;
import com.yourco.warehouse.entity.CartItem;
import com.yourco.warehouse.entity.ProductEntity;
import com.yourco.warehouse.entity.UserEntity;
import com.yourco.warehouse.repository.CartItemRepository;
import com.yourco.warehouse.repository.ProductRepository;
import com.yourco.warehouse.repository.UserRepository;
import com.yourco.warehouse.service.CartService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class CartServiceImpl implements CartService {

    private static final Logger log = LoggerFactory.getLogger(CartServiceImpl.class);

    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Autowired
    public CartServiceImpl(CartItemRepository cartItemRepository,
                           ProductRepository productRepository,
                           UserRepository userRepository) {
        this.cartItemRepository = cartItemRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
    }

    @Override
    public String addToCart(Long userId, Long productId, Integer quantity) {
        if (quantity == null || quantity <= 0) {
            throw new IllegalArgumentException("Количеството трябва да бъде положително число");
        }

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Потребителят не съществува"));

        ProductEntity product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Продуктът не съществува"));

        if (!product.isActive()) {
            throw new IllegalArgumentException("Продуктът не е активен");
        }

        if (!product.hasAvailableQuantity(quantity)) {
            throw new IllegalArgumentException(
                    String.format("Продуктът '%s' няма достатъчно наличност. Налично: %d, поискано: %d",
                            product.getName(),
                            product.getQuantityAvailable(),
                            quantity)
            );
        }

        Optional<CartItem> existingItem = cartItemRepository.findByUserIdAndProductId(userId, productId);

        if (existingItem.isPresent()) {
            CartItem item = existingItem.get();
            int newQuantity = item.getQuantity() + quantity;

            if (!product.hasAvailableQuantity(newQuantity)) {
                throw new IllegalArgumentException(
                        "Няма достатъчно наличност за общо количество: " + newQuantity
                );
            }

            item.setQuantity(newQuantity);
            cartItemRepository.save(item);
            return "Обновено количество: " + newQuantity;
        } else {
            CartItem newItem = new CartItem(user, product, quantity);
            cartItemRepository.save(newItem);
            return "Добавен нов артикул: " + product.getName();
        }
    }

    @Override
    public boolean updateQuantity(Long userId, Long productId, Integer newQuantity) {
        if (newQuantity == null || newQuantity <= 0) {
            throw new IllegalArgumentException("Количеството трябва да бъде положително число");
        }

        CartItem cartItem = cartItemRepository.findByUserIdAndProductId(userId, productId)
                .orElseThrow(() -> new IllegalArgumentException("Артикулът не е намерен в кошницата"));

        ProductEntity product = cartItem.getProduct();

        if (!product.hasAvailableQuantity(newQuantity)) {
            throw new IllegalArgumentException("Няма достатъчно наличност. Налично: " + product.getQuantityAvailable());
        }

        cartItem.setQuantity(newQuantity);
        cartItemRepository.save(cartItem);

        log.info("Обновено количество на {} на {}", product.getSku(), newQuantity);
        return true;
    }

    @Override
    public boolean removeFromCart(Long userId, Long productId) {
        CartItem cartItem = cartItemRepository.findByUserIdAndProductId(userId, productId)
                .orElseThrow(() -> new IllegalArgumentException("Артикулът не е намерен в кошницата"));

        cartItemRepository.delete(cartItem);
        log.info("Премахнат артикул {} от кошницата на потребител {}",
                cartItem.getProduct().getSku(), userId);
        return true;
    }

    @Override
    public int clearCart(Long userId) {
        List<CartItem> items = cartItemRepository.findByUserIdWithProducts(userId);
        int count = items.size();

        cartItemRepository.deleteAllByUserId(userId);
        log.info("Изчистена кошница на потребител {} - премахнати {} артикула", userId, count);
        return count;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CartItemDTO> getCartItems(Long userId) {
        List<CartItem> items = cartItemRepository.findByUserIdWithProducts(userId);
        return items.stream()
                .map(CartItemDTO::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CartDTO getCart(Long userId) {
        List<CartItem> items = cartItemRepository.findByUserIdWithProducts(userId);
        return CartDTO.from(items);
    }

    @Override
    @Transactional(readOnly = true)
    public Integer getCartItemCount(Long userId) {
        return cartItemRepository.countItemsByUserId(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasItems(Long userId) {
        return cartItemRepository.hasItemsByUserId(userId);
    }

    @Override
    public boolean reserveCartItems(Long userId) {
        List<CartItem> items = cartItemRepository.findByUserIdWithProducts(userId);

        if (items.isEmpty()) {
            throw new IllegalStateException("Кошницата е празна");
        }

        // Първо валидираме всички количества
        for (CartItem item : items) {
            ProductEntity product = item.getProduct();
            if (!product.hasAvailableQuantity(item.getQuantity())) {
                throw new IllegalStateException("Няма достатъчно наличност за продукт: " + product.getName());
            }
        }

        // Ако всички са OK, резервираме
        for (CartItem item : items) {
            ProductEntity product = item.getProduct();
            product.reserveQuantity(item.getQuantity());
            productRepository.save(product);
        }

        log.info("Резервирани количества за {} артикула от кошницата на потребител {}",
                items.size(), userId);
        return true;
    }

    @Override
    public boolean releaseCartReservations(Long userId) {
        List<CartItem> items = cartItemRepository.findByUserIdWithProducts(userId);

        for (CartItem item : items) {
            ProductEntity product = item.getProduct();
            try {
                product.releaseReservation(item.getQuantity());
                productRepository.save(product);
            } catch (Exception e) {
                log.warn("Грешка при освобождаване на резервация за продукт {}: {}",
                        product.getSku(), e.getMessage());
            }
        }

        log.info("Освободени резервации за {} артикула от кошницата на потребител {}",
                items.size(), userId);
        return true;
    }

    @Override
    public boolean finalizeCartSale(Long userId) {
        List<CartItem> items = cartItemRepository.findByUserIdWithProducts(userId);

        for (CartItem item : items) {
            ProductEntity product = item.getProduct();
            try {
                product.sellQuantity(item.getQuantity());
                productRepository.save(product);
            } catch (Exception e) {
                log.error("Грешка при финализиране на продажбата за продукт {}: {}",
                        product.getSku(), e.getMessage());
                throw new IllegalStateException("Грешка при финализиране на продажбата");
            }
        }

        // Изчистваме кошницата след успешна продажба
        clearCart(userId);

        log.info("Финализирана продажба за {} артикула от кошницата на потребител {}",
                items.size(), userId);
        return true;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean validateCartStock(Long userId) {
        List<CartItem> items = cartItemRepository.findByUserIdWithProducts(userId);

        for (CartItem item : items) {
            ProductEntity product = item.getProduct();
            if (!product.isActive() || !product.hasAvailableQuantity(item.getQuantity())) {
                return false;
            }
        }

        return true;
    }
}