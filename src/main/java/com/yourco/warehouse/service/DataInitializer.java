//package com.yourco.warehouse.service;
//
//import com.yourco.warehouse.entity.Client;
//import com.yourco.warehouse.entity.Product;
//import com.yourco.warehouse.entity.User;
//import com.yourco.warehouse.entity.enums.Role;
//import com.yourco.warehouse.repository.ClientRepository;
//import com.yourco.warehouse.repository.ProductRepository;
//import com.yourco.warehouse.repository.UserRepository;
//import org.slf4j.Logger;
//import org.slf4j.LoggerFactory;
//import org.springframework.boot.CommandLineRunner;
//import org.springframework.security.crypto.password.PasswordEncoder;
//import org.springframework.stereotype.Component;
//
//import java.math.BigDecimal;
//import java.util.Arrays;
//import java.util.List;
//
//@Component
//public class DataInitializer implements CommandLineRunner {
//
//    private static final Logger logger = LoggerFactory.getLogger(DataInitializer.class);
//
//    private final UserRepository userRepository;
//    private final ClientRepository clientRepository;
//    private final ProductRepository productRepository;
//    private final PasswordEncoder passwordEncoder;
//
//    public DataInitializer(UserRepository userRepository,
//                           ClientRepository clientRepository,
//                           ProductRepository productRepository,
//                           PasswordEncoder passwordEncoder) {
//        this.userRepository = userRepository;
//        this.clientRepository = clientRepository;
//        this.productRepository = productRepository;
//        this.passwordEncoder = passwordEncoder;
//    }
//
//    @Override
//    public void run(String... args) throws Exception {
//        logger.info("Започва инициализация на данни...");
//
//        try {
//            initializeClients();
//            initializeUsers();
//            initializeProducts();
//
//            logger.info("Инициализацията на данни е завършена успешно!");
//
//        } catch (Exception e) {
//            logger.error("Грешка при инициализация на данни", e);
//            throw e;
//        }
//    }
//
//    private void initializeClients() {
//        if (clientRepository.count() == 0) {
//            logger.info("Създаване на демо клиенти...");
//
//            Client demoClient = new Client();
//            demoClient.setClientCode("C001");
//            demoClient.setName("Демо Клиент ЕООД");
//            demoClient.setEmail("demo@example.com");
//            demoClient.setPhone("+359888123456");
//            demoClient.setActive(true);
//            clientRepository.save(demoClient);
//
//            Client testClient = new Client();
//            testClient.setClientCode("C002");
//            testClient.setName("Тест Фирма ООД");
//            testClient.setEmail("test@example.com");
//            testClient.setPhone("+359888654321");
//            testClient.setActive(true);
//            clientRepository.save(testClient);
//
//            logger.info("Създадени {} клиента", clientRepository.count());
//        } else {
//            logger.info("Клиенти вече съществуват: {}", clientRepository.count());
//        }
//    }
//
//    private void initializeUsers() {
//        if (userRepository.count() == 0) {
//            logger.info("Създаване на демо потребители...");
//
//            // Admin user
//            User admin = new User();
//            admin.setUsername("admin");
//            admin.setPasswordHash(passwordEncoder.encode("admin123"));
//            admin.setRole(Role.ADMIN);
//            admin.setActive(true);
//            userRepository.save(admin);
//
//            // Client users
//            List<Client> clients = clientRepository.findAll();
//            if (!clients.isEmpty()) {
//                Client firstClient = clients.get(0);
//
//                User clientUser1 = new User();
//                clientUser1.setUsername("client1");
//                clientUser1.setPasswordHash(passwordEncoder.encode("client123"));
//                clientUser1.setRole(Role.CLIENT);
//                clientUser1.setActive(true);
//                clientUser1.setClient(firstClient);
//                userRepository.save(clientUser1);
//
//                if (clients.size() > 1) {
//                    Client secondClient = clients.get(1);
//
//                    User clientUser2 = new User();
//                    clientUser2.setUsername("client2");
//                    clientUser2.setPasswordHash(passwordEncoder.encode("client456"));
//                    clientUser2.setRole(Role.CLIENT);
//                    clientUser2.setActive(true);
//                    clientUser2.setClient(secondClient);
//                    userRepository.save(clientUser2);
//                }
//            }
//
//            logger.info("Създадени {} потребителя", userRepository.count());
//        } else {
//            logger.info("Потребители вече съществуват: {}", userRepository.count());
//        }
//    }
//
//    private void initializeProducts() {
//        if (productRepository.count() == 0) {
//            logger.info("Създаване на демо продукти...");
//
//            List<ProductData> productsData = Arrays.asList(
//                    new ProductData("F001", "Брашно пшенично 1кг", "бр", new BigDecimal("2.50"), 20, "Сухи храни", "Висококачествено пшенично брашно за печене"),
//                    new ProductData("F002", "Захар бяла 1кг", "бр", new BigDecimal("1.80"), 20, "Сухи храни", "Фина кристална захар за сладкарство и готвене"),
//                    new ProductData("F003", "Олио слънчогледово 1л", "бр", new BigDecimal("3.20"), 20, "Мазнини", "Пречистено слънчогледово олио за готвене"),
//                    new ProductData("F004", "Ориз дългозърнест 1кг", "бр", new BigDecimal("4.00"), 20, "Сухи храни", "Дългозърнест ориз за гарнитури и основни ястия"),
//                    new ProductData("F005", "Макарони 500г", "бр", new BigDecimal("2.20"), 20, "Сухи храни", "Спагети от твърда пшеница"),
//                    new ProductData("F006", "Консерва домати 400г", "бр", new BigDecimal("1.60"), 20, "Консерва", "Ситно нарязани домати в собствен сок"),
//                    new ProductData("F007", "Мляко 1л", "бр", new BigDecimal("2.10"), 20, "Млечни продукти", "Прясно пастьоризирано мляко 3.5% масленост"),
//                    new ProductData("F008", "Кисело мляко 500г", "бр", new BigDecimal("1.80"), 20, "Млечни продукти", "Традиционно кисело мляко с живи бактерии"),
//                    new ProductData("F009", "Яйца M 10бр", "бр", new BigDecimal("3.50"), 20, "Яйца", "Свежи яйца размер M"),
//                    new ProductData("F010", "Сирене краве 1кг", "бр", new BigDecimal("12.50"), 20, "Млечни продукти", "Класическо краве сирене за салати и готвене"),
//                    new ProductData("F011", "Кафе натурално 250г", "бр", new BigDecimal("5.80"), 20, "Напитки", "Натурално смляно кафе за кафе машина или турско"),
//                    new ProductData("F012", "Чай зелен 50г", "бр", new BigDecimal("3.20"), 20, "Напитки", "Зелен чай с наситен аромат и свеж вкус")
//            );
//
//
//            for (ProductData data : productsData) {
//                Product p = new Product();
//                p.setSku(data.sku);
//                p.setName(data.name);
//                p.setUnit(data.unit);
//                p.setPrice(data.price);
//                p.setVatRate(data.vatRate);
//                p.setCategory(data.category);
//                p.setDescription(data.description);
//                p.setActive(true);
//                productRepository.save(p);
//            }
//
//            logger.info("Създадени {} продукта", productRepository.count());
//        } else {
//            logger.info("Продукти вече съществуват: {}", productRepository.count());
//        }
//    }
//
//    // Helper клас за product данни
//    private static class ProductData {
//        final String sku, name, unit, category, description;
//        final BigDecimal price;
//        final int vatRate;
//
//        ProductData(String sku, String name, String unit, BigDecimal price, int vatRate, String category, String description) {
//            this.sku = sku;
//            this.name = name;
//            this.unit = unit;
//            this.price = price;
//            this.vatRate = vatRate;
//            this.category = category;
//            this.description = description;
//        }
//    }
//}