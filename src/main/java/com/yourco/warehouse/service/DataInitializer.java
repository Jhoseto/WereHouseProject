package com.yourco.warehouse.service;

import com.yourco.warehouse.entity.Client;
import com.yourco.warehouse.entity.Product;
import com.yourco.warehouse.entity.User;
import com.yourco.warehouse.entity.enums.Role;
import com.yourco.warehouse.repository.ClientRepository;
import com.yourco.warehouse.repository.ProductRepository;
import com.yourco.warehouse.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final ClientRepository clientRepository;
    private final ProductRepository productRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository,
                           ClientRepository clientRepository,
                           ProductRepository productRepository,
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.clientRepository = clientRepository;
        this.productRepository = productRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        logger.info("Започва инициализация на данни...");

        try {
            initializeClients();
            initializeUsers();
            initializeProducts();

            logger.info("Инициализацията на данни е завършена успешно!");

        } catch (Exception e) {
            logger.error("Грешка при инициализация на данни", e);
            throw e;
        }
    }

    private void initializeClients() {
        if (clientRepository.count() == 0) {
            logger.info("Създаване на демо клиенти...");

            Client demoClient = new Client();
            demoClient.setClientCode("C001");
            demoClient.setName("Демо Клиент ЕООД");
            demoClient.setEmail("demo@example.com");
            demoClient.setPhone("+359888123456");
            demoClient.setActive(true);
            clientRepository.save(demoClient);

            Client testClient = new Client();
            testClient.setClientCode("C002");
            testClient.setName("Тест Фирма ООД");
            testClient.setEmail("test@example.com");
            testClient.setPhone("+359888654321");
            testClient.setActive(true);
            clientRepository.save(testClient);

            logger.info("Създадени {} клиента", clientRepository.count());
        } else {
            logger.info("Клиенти вече съществуват: {}", clientRepository.count());
        }
    }

    private void initializeUsers() {
        if (userRepository.count() == 0) {
            logger.info("Създаване на демо потребители...");

            // Admin user
            User admin = new User();
            admin.setUsername("admin");
            admin.setPasswordHash(passwordEncoder.encode("admin123"));
            admin.setRole(Role.ADMIN);
            admin.setActive(true);
            userRepository.save(admin);

            // Client users
            List<Client> clients = clientRepository.findAll();
            if (!clients.isEmpty()) {
                Client firstClient = clients.get(0);

                User clientUser1 = new User();
                clientUser1.setUsername("client1");
                clientUser1.setPasswordHash(passwordEncoder.encode("client123"));
                clientUser1.setRole(Role.CLIENT);
                clientUser1.setActive(true);
                clientUser1.setClient(firstClient);
                userRepository.save(clientUser1);

                if (clients.size() > 1) {
                    Client secondClient = clients.get(1);

                    User clientUser2 = new User();
                    clientUser2.setUsername("client2");
                    clientUser2.setPasswordHash(passwordEncoder.encode("client456"));
                    clientUser2.setRole(Role.CLIENT);
                    clientUser2.setActive(true);
                    clientUser2.setClient(secondClient);
                    userRepository.save(clientUser2);
                }
            }

            logger.info("Създадени {} потребителя", userRepository.count());
        } else {
            logger.info("Потребители вече съществуват: {}", userRepository.count());
        }
    }

    private void initializeProducts() {
        if (productRepository.count() == 0) {
            logger.info("Създаване на демо продукти...");

            List<ProductData> productsData = Arrays.asList(
                    new ProductData("P001", "Лаптоп Dell Latitude", "бр", new BigDecimal("1599.99"), 20, "Офис", "Бизнес лаптоп с 8GB RAM и SSD"),
                    new ProductData("P002", "Мишка безжична Logitech", "бр", new BigDecimal("45.50"), 20, "Периферия", "Ергономична безжична мишка"),
                    new ProductData("P003", "Клавиатура механична", "бр", new BigDecimal("129.99"), 20, "Периферия", "Механична клавиатура с RGB подсветка"),
                    new ProductData("P004", "Монитор 24 инча", "бр", new BigDecimal("299.00"), 20, "Монитори", "Full HD монитор за офис работа"),
                    new ProductData("P005", "USB-C Hub", "бр", new BigDecimal("89.99"), 20, "Аксесоари", "Многофункционален USB-C адаптер"),
                    new ProductData("P006", "Хартия за принтер A4", "пакет", new BigDecimal("12.50"), 20, "Консумативи", "500 листа бяла офис хартия"),
                    new ProductData("P007", "Тонер касета HP", "бр", new BigDecimal("89.00"), 20, "Консумативи", "Оригинална тонер касета за HP принтери"),
                    new ProductData("P008", "Офис стол ергономичен", "бр", new BigDecimal("450.00"), 20, "Мебели", "Ергономичен офис стол с люлееща се функция"),
                    new ProductData("P009", "Бюро 120x60cm", "бр", new BigDecimal("199.99"), 20, "Мебели", "Офис бюро с два чекмеджета"),
                    new ProductData("P010", "Настолна лампа LED", "бр", new BigDecimal("35.00"), 20, "Осветление", "LED лампа с регулируема яркост"),
                    new ProductData("P011", "Кабел HDMI 2м", "бр", new BigDecimal("15.99"), 20, "Кабели", "Високоскоростен HDMI кабел"),
                    new ProductData("P012", "Външна батерия 10000mAh", "бр", new BigDecimal("49.99"), 20, "Аксесоари", "Компактна външни батерия с USB-C")
            );

            for (ProductData data : productsData) {
                Product p = new Product();
                p.setSku(data.sku);
                p.setName(data.name);
                p.setUnit(data.unit);
                p.setPrice(data.price);
                p.setVatRate(data.vatRate);
                p.setCategory(data.category);
                p.setDescription(data.description);
                p.setActive(true);
                productRepository.save(p);
            }

            logger.info("Създадени {} продукта", productRepository.count());
        } else {
            logger.info("Продукти вече съществуват: {}", productRepository.count());
        }
    }

    // Helper клас за product данни
    private static class ProductData {
        final String sku, name, unit, category, description;
        final BigDecimal price;
        final int vatRate;

        ProductData(String sku, String name, String unit, BigDecimal price, int vatRate, String category, String description) {
            this.sku = sku;
            this.name = name;
            this.unit = unit;
            this.price = price;
            this.vatRate = vatRate;
            this.category = category;
            this.description = description;
        }
    }
}