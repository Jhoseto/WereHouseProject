package com.yourco.warehouse.service.impl;

import com.yourco.warehouse.dto.CartDTO;
import com.yourco.warehouse.dto.CartItemDTO;
import com.yourco.warehouse.entity.CartItem;
import com.yourco.warehouse.entity.ProductEntity;
import com.yourco.warehouse.entity.UserEntity;
import com.yourco.warehouse.repository.CartItemRepository;
import com.yourco.warehouse.repository.OrderItemRepository;
import com.yourco.warehouse.repository.ProductRepository;
import com.yourco.warehouse.repository.UserRepository;
import com.yourco.warehouse.service.CartService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class CartServiceImpl implements CartService {

    private static final Logger log = LoggerFactory.getLogger(CartServiceImpl.class);

    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final OrderItemRepository orderItemRepository;

    @Autowired
    public CartServiceImpl(CartItemRepository cartItemRepository,
                           ProductRepository productRepository,
                           UserRepository userRepository,
                           OrderItemRepository orderItemRepository) {
        this.cartItemRepository = cartItemRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.orderItemRepository = orderItemRepository;
    }

    @Override
    public String addToCart(Long userId, Long productId, Integer quantity) {
        validateInputs(userId, productId, quantity);

        UserEntity user = getUserById(userId);
        ProductEntity product = getActiveProductById(productId);

        // Проверка за наличност според новата логика
        Optional<CartItem> existingItem = cartItemRepository.findByUserIdAndProductId(userId, productId);
        int totalQuantityNeeded = quantity;

        if (existingItem.isPresent()) {
            totalQuantityNeeded += existingItem.get().getQuantity();
        }

        int maxOrderable = getMaxOrderableQuantity(userId, product);
        if (totalQuantityNeeded > maxOrderable) {
            int userReserved = maxOrderable - product.getQuantityAvailable();

            String message;
            if (userReserved > 0) {
                message = String.format("⚠️ Вече имате поръчка за %d бр. от този артикул. Налични в склада: %d бр. Не можете да поръчате повече.",
                        userReserved, product.getQuantityAvailable());
            } else {
                message = String.format("⚠️ Налични са само %d бр. в склада. Не можете да поръчате %d бр.",
                        product.getQuantityAvailable(), totalQuantityNeeded);
            }

            throw new IllegalArgumentException(message);
        }

        // Добавяне или обновяване
        if (existingItem.isPresent()) {
            CartItem item = existingItem.get();
            item.setQuantity(totalQuantityNeeded);
            cartItemRepository.save(item);
            return String.format("Обновено количество: %d", totalQuantityNeeded);
        } else {
            CartItem newItem = new CartItem(user, product, quantity);
            cartItemRepository.save(newItem);
            return String.format("Добавен: %s", product.getName());
        }
    }

    @Override
    public boolean updateQuantity(Long userId, Long productId, Integer newQuantity) {
        validateInputs(userId, productId, newQuantity);

        CartItem cartItem = cartItemRepository.findByUserIdAndProductId(userId, productId)
                .orElseThrow(() -> new IllegalArgumentException("Артикулът не е намерен в количката"));

        ProductEntity product = cartItem.getProduct();

        int maxOrderable = getMaxOrderableQuantity(userId, product);
        if (newQuantity > maxOrderable) {
            int userReserved = maxOrderable - product.getQuantityAvailable();

            String message;
            if (userReserved > 0) {
                message = String.format("⚠️ Вече имате поръчка за %d бр. Налични в склада: %d бр. Максимум можете да поръчате общо: %d бр.",
                        userReserved, product.getQuantityAvailable(), maxOrderable);
            } else {
                message = String.format("⚠️ Налични са само %d бр. в склада.",
                        product.getQuantityAvailable());
            }

            throw new IllegalArgumentException(message);
        }

        cartItem.setQuantity(newQuantity);
        cartItemRepository.save(cartItem);

        return true;
    }

    @Override
    public boolean removeFromCart(Long userId, Long productId) {
        if (userId == null || productId == null) {
            throw new IllegalArgumentException("ID-тата не могат да бъдат null");
        }

        CartItem cartItem = cartItemRepository.findByUserIdAndProductId(userId, productId)
                .orElseThrow(() -> new IllegalArgumentException("Артикулът не е намерен в количката"));

        String productSku = cartItem.getProduct().getSku();
        cartItemRepository.delete(cartItem);

        return true;
    }

    @Override
    public int clearCart(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("User ID не може да бъде null");
        }

        List<CartItem> items = cartItemRepository.findByUserIdWithProducts(userId);
        int count = items.size();

        if (count > 0) {
            cartItemRepository.deleteAllByUserId(userId);
        }

        return count;
    }

    @Override
    @Transactional(readOnly = true)
    public CartDTO getCart(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("User ID не може да бъде null");
        }

        List<CartItem> cartItems = cartItemRepository.findByUserIdWithProducts(userId);

        if (cartItems.isEmpty()) {
            return CartDTO.create(List.of(), 0, 0,
                    BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
        }

        return buildCartDTO(cartItems);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CartItemDTO> getCartItems(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("User ID не може да бъде null");
        }

        List<CartItem> cartItems = cartItemRepository.findByUserIdWithProducts(userId);
        return cartItems.stream()
                .map(this::buildCartItemDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Integer getCartItemCount(Long userId) {
        if (userId == null) return 0;
        return cartItemRepository.countItemsByUserId(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasItems(Long userId) {
        if (userId == null) return false;
        return cartItemRepository.hasItemsByUserId(userId);
    }



    @Override
    @Transactional
    public boolean reserveCartItems(Long userId) {
        List<CartItem> items = cartItemRepository.findByUserIdWithProducts(userId);

        if (items.isEmpty()) {
            throw new IllegalStateException("Количката е празна");
        }

        // ВАЖНО: Използваме pessimistic lock за да заключим продуктите
        for (CartItem item : items) {
            ProductEntity product = productRepository.findByIdWithLock(item.getProduct().getId())
                    .orElseThrow(() -> new IllegalStateException("Продукт не е намерен"));

            // НОВА ЛОГИКА: Проверка с отчитане на вече резервираните от user-а
            int maxOrderable = getMaxOrderableQuantity(userId, product);

            if (item.getQuantity() > maxOrderable) {
                int userReserved = maxOrderable - product.getQuantityAvailable();

                String message;
                if (userReserved > 0) {
                    message = String.format("⚠️ Артикул '%s': Вече имате поръчка за %d бр. Налични в склада: %d бр. Не можете да поръчате общо повече от %d бр.",
                            product.getName(), userReserved, product.getQuantityAvailable(), maxOrderable);
                } else {
                    message = String.format("⚠️ Артикул '%s': Налични са само %d бр. в склада.",
                            product.getName(), product.getQuantityAvailable());
                }

                throw new IllegalArgumentException(message);
            }

            product.reserveQuantity(item.getQuantity());
            productRepository.save(product);
        }

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
                log.warn("Грешка при освобождаване на резервация за {}: {}",
                        product.getSku(), e.getMessage());
            }
        }

        return true;
    }


    @Override
    @Transactional(readOnly = true)
    public boolean validateCartStock(Long userId) {
        List<CartItem> items = cartItemRepository.findByUserIdWithProducts(userId);

        return items.stream().allMatch(item -> {
            ProductEntity product = item.getProduct();
            int maxOrderable = getMaxOrderableQuantity(userId, product);
            return product.isActive() && item.getQuantity() <= maxOrderable;
        });
    }


    // ==================== PRIVATE HELPER METHODS ====================

    private CartDTO buildCartDTO(List<CartItem> cartItems) {
        List<CartItemDTO> itemDTOs = cartItems.stream()
                .map(this::buildCartItemDTO)
                .toList();

        // Единствено изчисление на всички суми
        CartTotals totals = calculateTotals(cartItems);

        return CartDTO.create(
                itemDTOs,
                cartItems.size(),
                totals.totalQuantity,
                totals.totalWithoutVat,
                totals.totalWithVat,
                totals.vatAmount
        );
    }

    private CartItemDTO buildCartItemDTO(CartItem cartItem) {
        BigDecimal itemPrice = cartItem.getProduct().getPrice();
        BigDecimal itemPriceWithVat = cartItem.getProduct().getPriceWithVat();
        BigDecimal quantity = BigDecimal.valueOf(cartItem.getQuantity());

        BigDecimal totalPrice = itemPrice.multiply(quantity).setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalPriceWithVat = itemPriceWithVat.multiply(quantity).setScale(2, RoundingMode.HALF_UP);

        return CartItemDTO.from(cartItem, totalPrice, totalPriceWithVat);
    }

    private CartTotals calculateTotals(List<CartItem> cartItems) {
        int totalQuantity = 0;
        BigDecimal totalWithoutVat = BigDecimal.ZERO;
        BigDecimal totalWithVat = BigDecimal.ZERO;

        for (CartItem item : cartItems) {
            totalQuantity += item.getQuantity();

            BigDecimal itemPrice = item.getProduct().getPrice();
            BigDecimal itemPriceWithVat = item.getProduct().getPriceWithVat();
            BigDecimal quantity = BigDecimal.valueOf(item.getQuantity());

            totalWithoutVat = totalWithoutVat.add(itemPrice.multiply(quantity));
            totalWithVat = totalWithVat.add(itemPriceWithVat.multiply(quantity));
        }

        // Закръгляне
        totalWithoutVat = totalWithoutVat.setScale(2, RoundingMode.HALF_UP);
        totalWithVat = totalWithVat.setScale(2, RoundingMode.HALF_UP);
        BigDecimal vatAmount = totalWithVat.subtract(totalWithoutVat);

        return new CartTotals(totalQuantity, totalWithoutVat, totalWithVat, vatAmount);
    }

    private void validateInputs(Long userId, Long productId, Integer quantity) {
        if (userId == null) {
            throw new IllegalArgumentException("User ID не може да бъде null");
        }
        if (productId == null) {
            throw new IllegalArgumentException("Product ID не може да бъде null");
        }
        if (quantity == null || quantity <= 0) {
            throw new IllegalArgumentException("Количеството трябва да бъде положително число");
        }
    }

    private UserEntity getUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Потребителят не съществува"));
    }

    private ProductEntity getActiveProductById(Long productId) {
        ProductEntity product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Продуктът не съществува"));

        if (!product.isActive()) {
            throw new IllegalArgumentException("Продуктът не е активен");
        }

        return product;
    }

    // Helper class за изчислените суми
    private static class CartTotals {
        final int totalQuantity;
        final BigDecimal totalWithoutVat;
        final BigDecimal totalWithVat;
        final BigDecimal vatAmount;

        CartTotals(int totalQuantity, BigDecimal totalWithoutVat,
                   BigDecimal totalWithVat, BigDecimal vatAmount) {
            this.totalQuantity = totalQuantity;
            this.totalWithoutVat = totalWithoutVat;
            this.totalWithVat = totalWithVat;
            this.vatAmount = vatAmount;
        }
    }


    /**
     * Изчислява максималното количество което user може да поръча
     * @return quantityAvailable + вече резервираното от този user
     */
    private int getMaxOrderableQuantity(Long userId, ProductEntity product) {
        int available = product.getQuantityAvailable();
        BigDecimal reserved = orderItemRepository.getReservedQuantityByUser(userId, product.getId());
        return available + reserved.intValue();
    }
}