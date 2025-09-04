//package com.yourco.warehouse.service;
//
//import com.yourco.warehouse.entity.UserEntity;
//import com.yourco.warehouse.entity.ProductEntity;
//import com.yourco.warehouse.entity.UserEntity;
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
//            UserEntity demoClient = new UserEntity();
//            demoClient.setUserCode(4251L);
//            demoClient.setUsername("Демо Клиент ЕООД");
//            demoClient.setEmail("demo@example.com");
//            demoClient.setPhone("+359888123456");
//            demoClient.setActive(true);
//            demoClient.setRole(Role.CLIENT);
//            clientRepository.save(demoClient);
//
//            UserEntity testClient = new UserEntity();
//            testClient.setUserCode(4251L);
//            testClient.setUsername("Тест Фирма ООД");
//            testClient.setEmail("test@example.com");
//            testClient.setPhone("+359888654321");
//            testClient.setActive(true);
//            testClient.setRole(Role.CLIENT);
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
//            UserEntity admin = new UserEntity();
//            admin.setUsername("admin");
//            admin.setPasswordHash(passwordEncoder.encode("admin123"));
//            admin.setRole(Role.ADMIN);
//            admin.setActive(true);
//            userRepository.save(admin);
//
//            // Client users
//            List<UserEntity> clients = clientRepository.findAll();
//            if (!clients.isEmpty()) {
//                UserEntity firstClient = clients.get(0);
//
//                UserEntity clientUser1 = new UserEntity();
//                clientUser1.setUsername("client1");
//                clientUser1.setPasswordHash(passwordEncoder.encode("client123"));
//                clientUser1.setRole(Role.CLIENT);
//                clientUser1.setActive(true);
//                clientUser1.setPhone("08861235845");
//                userRepository.save(clientUser1);
//
//                if (clients.size() > 1) {
//                    UserEntity secondClient = clients.get(1);
//
//                    UserEntity clientUser2 = new UserEntity();
//                    clientUser2.setUsername("client2");
//                    clientUser2.setPasswordHash(passwordEncoder.encode("client456"));
//                    clientUser2.setRole(Role.CLIENT);
//                    clientUser2.setActive(true);
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
//                    new ProductData("F006", "Консерва домати 400г", "бр", new BigDecimal("1.60"), 20, "Консерви", "Ситно нарязани домати в собствен сок"),
//                    new ProductData("F007", "Мляко 1л", "бр", new BigDecimal("2.10"), 20, "Млечни продукти", "Прясно пастьоризирано мляко 3.5% масленост"),
//                    new ProductData("F008", "Кисело мляко 500г", "бр", new BigDecimal("1.80"), 20, "Млечни продукти", "Традиционно кисело мляко с живи бактерии"),
//                    new ProductData("F009", "Яйца M 10бр", "бр", new BigDecimal("3.50"), 20, "Яйца", "Свежи яйца размер M"),
//                    new ProductData("F010", "Сирене краве 1кг", "бр", new BigDecimal("12.50"), 20, "Млечни продукти", "Класическо краве сирене за салати и готвене"),
//                    new ProductData("F011", "Кафе натурално 250г", "бр", new BigDecimal("5.80"), 20, "Напитки", "Натурално смляно кафе за кафе машина или турско"),
//                    new ProductData("F012", "Чай зелен 50г", "бр", new BigDecimal("3.20"), 20, "Напитки", "Зелен чай с наситен аромат и свеж вкус"),
//                    new ProductData("F013", "Леща кафява 1кг", "бр", new BigDecimal("3.90"), 20, "Сухи храни", "Класическа леща за супи и яхнии"),
//                    new ProductData("F014", "Боб бял 1кг", "бр", new BigDecimal("4.50"), 20, "Сухи храни", "Селектиран бял боб за готвене"),
//                    new ProductData("F015", "Грах сух 1кг", "бр", new BigDecimal("3.80"), 20, "Сухи храни", "Сух грах за супи и яхнии"),
//                    new ProductData("F016", "Булгур 500г", "бр", new BigDecimal("2.60"), 20, "Сухи храни", "Трошена пшеница за салати и гарнитури"),
//                    new ProductData("F017", "Овесени ядки 500г", "бр", new BigDecimal("2.40"), 20, "Сухи храни", "Фини овесени ядки за закуска"),
//                    new ProductData("F018", "Консерва риба тон 160г", "бр", new BigDecimal("3.50"), 20, "Консерви", "Риба тон в собствен сос"),
//                    new ProductData("F019", "Консерва сардини 120г", "бр", new BigDecimal("2.10"), 20, "Консерви", "Сардини в доматен сос"),
//                    new ProductData("F020", "Консерва грах 400г", "бр", new BigDecimal("1.90"), 20, "Консерви", "Зелен грах в собствен сос"),
//                    new ProductData("F021", "Консерва царевица 400г", "бр", new BigDecimal("2.20"), 20, "Консерви", "Сладка царевица готова за салати"),
//                    new ProductData("F022", "Кашкавал краве 1кг", "бр", new BigDecimal("16.90"), 20, "Млечни продукти", "Ароматен краве кашкавал"),
//                    new ProductData("F023", "Масло краве 250г", "бр", new BigDecimal("5.60"), 20, "Млечни продукти", "Натурално краве масло 82%"),
//                    new ProductData("F024", "Минерална вода 1.5л", "бр", new BigDecimal("0.90"), 20, "Напитки", "Натурална минерална вода газирана"),
//                    new ProductData("F025", "Минерална вода 500мл", "бр", new BigDecimal("0.60"), 20, "Напитки", "Минерална вода малка бутилка"),
//                    new ProductData("F026", "Сок портокал 1л", "бр", new BigDecimal("2.90"), 20, "Напитки", "Натурален сок от портокали"),
//                    new ProductData("F027", "Сок ябълка 1л", "бр", new BigDecimal("2.80"), 20, "Напитки", "Натурален сок от ябълки"),
//                    new ProductData("F028", "Газирана напитка кола 2л", "бр", new BigDecimal("3.20"), 20, "Напитки", "Газирана напитка със захар"),
//                    new ProductData("F029", "Газирана напитка лимон 1.5л", "бр", new BigDecimal("2.70"), 20, "Напитки", "Освежаваща газирана напитка с вкус на лимон"),
//                    new ProductData("F030", "Шунка варена 500г", "бр", new BigDecimal("7.50"), 20, "Месни продукти", "Фино нарязана свинска шунка"),
//                    new ProductData("F031", "Салам телешки 400г", "бр", new BigDecimal("6.80"), 20, "Месни продукти", "Класически телешки салам"),
//                    new ProductData("F032", "Кренвирши 400г", "бр", new BigDecimal("5.40"), 20, "Месни продукти", "Свински кренвирши"),
//                    new ProductData("F033", "Шоколад млечен 100г", "бр", new BigDecimal("2.50"), 20, "Сладки", "Класически млечен шоколад"),
//                    new ProductData("F034", "Бисквити обикновени 200г", "бр", new BigDecimal("1.90"), 20, "Сладки", "Хрупкави бисквити за чай и кафе"),
//                    new ProductData("F035", "Вафли 35г", "бр", new BigDecimal("0.70"), 20, "Сладки", "Шоколадови вафли с крем пълнеж"),
//                    new ProductData("F036", "Мюсли плодово 375г", "бр", new BigDecimal("4.60"), 20, "Сладки", "Мюсли с плодове за закуска"),
//                    new ProductData("F037", "Бонбони карамел 200г", "бр", new BigDecimal("3.20"), 20, "Сладки", "Карамелени бонбони в плик"),
//                    new ProductData("F038", "Солети 100г", "бр", new BigDecimal("0.90"), 20, "Сухи храни", "Класически солети за хрупкане"),
//                    new ProductData("F039", "Чипс картофен 150г", "бр", new BigDecimal("2.80"), 20, "Снаксове", "Хрупкав картофен чипс със сол"),
//                    new ProductData("F040", "Фъстъци печени 200г", "бр", new BigDecimal("3.50"), 20, "Снаксове", "Печени и осолени фъстъци"),
//                    new ProductData("F041", "Семки слънчогледови 150г", "бр", new BigDecimal("2.10"), 20, "Снаксове", "Печени слънчогледови семки"),
//                    new ProductData("F042", "Кокосови стърготини 100г", "бр", new BigDecimal("1.60"), 20, "Сухи храни", "Кокосови стърготини за десерти"),
//                    new ProductData("F043", "Стафиди 200г", "бр", new BigDecimal("2.40"), 20, "Сухи храни", "Стафиди за печива и десерти"),
//                    new ProductData("F044", "Сушени кайсии 200г", "бр", new BigDecimal("4.90"), 20, "Сухи храни", "Сушени кайсии без костилки"),
//                    new ProductData("F045", "Сушени смокини 200г", "бр", new BigDecimal("5.20"), 20, "Сухи храни", "Сушени смокини за директна консумация"),
//                    new ProductData("F046", "Черен пипер млян 50г", "бр", new BigDecimal("2.60"), 20, "Подправки", "Ароматен черен пипер млян"),
//                    new ProductData("F047", "Червен пипер сладък 100г", "бр", new BigDecimal("2.80"), 20, "Подправки", "Сладък червен пипер за готвене"),
//                    new ProductData("F048", "Кимион млян 50г", "бр", new BigDecimal("2.20"), 20, "Подправки", "Кимион за подправяне на ястия"),
//                    new ProductData("F049", "Канела мляна 50г", "бр", new BigDecimal("2.40"), 20, "Подправки", "Мляна канела за сладкиши и десерти"),
//                    new ProductData("F050", "Ванилия 10г", "бр", new BigDecimal("1.20"), 20, "Подправки", "Ванилия на прах за сладкарство"),
//                    new ProductData("F051", "Оцет ябълков 500мл", "бр", new BigDecimal("2.30"), 20, "Подправки", "Ябълков оцет за салати и маринати"),
//                    new ProductData("F052", "Оцет винен 500мл", "бр", new BigDecimal("1.90"), 20, "Подправки", "Червен винен оцет за подправяне"),
//                    new ProductData("F053", "Слънчогледово семе белено 200г", "бр", new BigDecimal("3.00"), 20, "Снаксове", "Белени печени семки за директна консумация"),
//                    new ProductData("F054", "Лешници печени 200г", "бр", new BigDecimal("6.20"), 20, "Снаксове", "Печени лешници без сол"),
//                    new ProductData("F055", "Орехи ядки 200г", "бр", new BigDecimal("5.90"), 20, "Снаксове", "Ядки от орехи за сладкиши и салати"),
//                    new ProductData("F056", "Бадеми сурови 200г", "бр", new BigDecimal("7.50"), 20, "Снаксове", "Сурови бадеми без обработка"),
//                    new ProductData("F057", "Кашу печено 200г", "бр", new BigDecimal("6.80"), 20, "Снаксове", "Печено кашу със сол"),
//                    new ProductData("F058", "Шам фъстък 200г", "бр", new BigDecimal("8.90"), 20, "Снаксове", "Печен шам фъстък в черупка"),
//                    new ProductData("F059", "Кока-кола кен 330мл", "бр", new BigDecimal("1.50"), 20, "Напитки", "Газирана напитка кола в кен"),
//                    new ProductData("F060", "Фанта портокал кен 330мл", "бр", new BigDecimal("1.50"), 20, "Напитки", "Газирана напитка с портокалов вкус"),
//                    new ProductData("F061", "Спрайт кен 330мл", "бр", new BigDecimal("1.50"), 20, "Напитки", "Газирана напитка с вкус на лимон и лайм"),
//                    new ProductData("F062", "Енергийна напитка 250мл", "бр", new BigDecimal("2.20"), 20, "Напитки", "Енергийна напитка с кофеин и таурин"),
//                    new ProductData("F063", "Бира светла 500мл", "бр", new BigDecimal("2.00"), 20, "Напитки", "Светла лагер бира"),
//                    new ProductData("F064", "Бира тъмна 500мл", "бр", new BigDecimal("2.40"), 20, "Напитки", "Тъмна бира с плътен вкус"),
//                    new ProductData("F065", "Вино червено 750мл", "бр", new BigDecimal("9.80"), 20, "Напитки", "Класическо червено вино сухо"),
//                    new ProductData("F066", "Вино бяло 750мл", "бр", new BigDecimal("8.90"), 20, "Напитки", "Бяло вино полусухо"),
//                    new ProductData("F067", "Вино розе 750мл", "бр", new BigDecimal("8.50"), 20, "Напитки", "Ароматно розе за аперитив"),
//                    new ProductData("F068", "Ракиа гроздова 700мл", "бр", new BigDecimal("14.50"), 20, "Напитки", "Традиционна българска гроздова ракия"),
//                    new ProductData("F069", "Уиски 700мл", "бр", new BigDecimal("29.90"), 20, "Напитки", "Класическо скоч уиски"),
//                    new ProductData("F070", "Водка 700мл", "бр", new BigDecimal("19.90"), 20, "Напитки", "Чиста водка дестилирана"),
//                    new ProductData("F071", "Ром 700мл", "бр", new BigDecimal("21.50"), 20, "Напитки", "Светъл ром с мек вкус"),
//                    new ProductData("F072", "Джин 700мл", "бр", new BigDecimal("23.90"), 20, "Напитки", "Джин с аромат на хвойна"),
//                    new ProductData("F073", "Шампанско 750мл", "бр", new BigDecimal("32.00"), 20, "Напитки", "Игристо шампанско за празници"),
//                    new ProductData("F074", "Кетчуп 500г", "бр", new BigDecimal("3.20"), 20, "Подправки", "Доматен кетчуп класически"),
//                    new ProductData("F075", "Майонеза 450г", "бр", new BigDecimal("3.80"), 20, "Подправки", "Класическа майонеза"),
//                    new ProductData("F076", "Горчица 250г", "бр", new BigDecimal("2.60"), 20, "Подправки", "Френска горчица с аромат"),
//                    new ProductData("F077", "Сос барбекю 400г", "бр", new BigDecimal("4.20"), 20, "Подправки", "Сос барбекю за месо и гарнитури"),
//                    new ProductData("F078", "Сос чили 300г", "бр", new BigDecimal("3.50"), 20, "Подправки", "Лют сос чили"),
//                    new ProductData("F079", "Зехтин екстра върджин 500мл", "бр", new BigDecimal("12.90"), 20, "Мазнини", "Висококачествен зехтин за салати"),
//                    new ProductData("F080", "Маргарин 250г", "бр", new BigDecimal("2.20"), 20, "Мазнини", "Класически маргарин за мазане"),
//                    new ProductData("F081", "Тахан сусамов 300г", "бр", new BigDecimal("5.60"), 20, "Мазнини", "Сусамов тахан натурален"),
//                    new ProductData("F082", "Слънчогледово масло 5л", "бр", new BigDecimal("18.90"), 20, "Мазнини", "Насипно олио за професионална употреба"),
//                    new ProductData("F083", "Какао на прах 100г", "бр", new BigDecimal("2.80"), 20, "Сладки", "Какао за печива и напитки"),
//                    new ProductData("F084", "Пудра захар 200г", "бр", new BigDecimal("1.70"), 20, "Сладки", "Фина пудра захар за сладкарство"),
//                    new ProductData("F085", "Желирани бонбони 150г", "бр", new BigDecimal("2.90"), 20, "Сладки", "Желирани плодови бонбони"),
//                    new ProductData("F086", "Шоколад черен 100г", "бр", new BigDecimal("2.80"), 20, "Сладки", "Черен шоколад с високо съдържание на какао"),
//                    new ProductData("F087", "Шоколад бял 100г", "бр", new BigDecimal("2.80"), 20, "Сладки", "Бял шоколад с млечен вкус"),
//                    new ProductData("F088", "Суха мая 10г", "бр", new BigDecimal("0.80"), 20, "Сухи храни", "Суха мая за печива"),
//                    new ProductData("F089", "Сода бикарбонат 100г", "бр", new BigDecimal("1.20"), 20, "Сухи храни", "Сода бикарбонат за печива"),
//                    new ProductData("F090", "Ванилова захар 10г", "бр", new BigDecimal("0.60"), 20, "Сухи храни", "Ванилова захар за сладкарство"),
//                    new ProductData("F091", "Желатин 10г", "бр", new BigDecimal("1.10"), 20, "Сухи храни", "Желатин за десерти"),
//                    new ProductData("F092", "Бакпулвер 10г", "бр", new BigDecimal("0.70"), 20, "Сухи храни", "Бакпулвер за печива"),
//                    new ProductData("F093", "Кисели краставички 720мл", "бр", new BigDecimal("3.50"), 20, "Консерви", "Туршия от кисели краставички"),
//                    new ProductData("F094", "Зеле кисело 1кг", "бр", new BigDecimal("2.80"), 20, "Консерви", "Кисело зеле готово за употреба"),
//                    new ProductData("F095", "Чушки печени 680г", "бр", new BigDecimal("4.20"), 20, "Консерви", "Обелени печени чушки в буркан"),
//                    new ProductData("F096", "Компот праскови 720мл", "бр", new BigDecimal("3.80"), 20, "Консерви", "Компот от праскови в сироп"),
//                    new ProductData("F097", "Компот череши 720мл", "бр", new BigDecimal("4.20"), 20, "Консерви", "Компот от череши с наситен вкус"),
//                    new ProductData("F098", "Мед пчелен 500г", "бр", new BigDecimal("8.90"), 20, "Сладки", "Натурален български мед"),
//                    new ProductData("F099", "Мед акациев 500г", "бр", new BigDecimal("9.50"), 20, "Сладки", "Акациев мед с мек аромат"),
//                    new ProductData("F100", "Сироп ягода 700мл", "бр", new BigDecimal("5.20"), 20, "Напитки", "Плодов сироп с вкус на ягода"),
//                    new ProductData("F101", "Сироп мента 700мл", "бр", new BigDecimal("5.20"), 20, "Напитки", "Плодов сироп с вкус на мента"),
//                    new ProductData("F102", "Сироп праскова 700мл", "бр", new BigDecimal("5.20"), 20, "Напитки", "Плодов сироп с вкус на праскова"),
//                    new ProductData("F103", "Сироп вишна 700мл", "бр", new BigDecimal("5.20"), 20, "Напитки", "Плодов сироп с вкус на вишна"),
//                    new ProductData("F104", "Сироп къпина 700мл", "бр", new BigDecimal("5.40"), 20, "Напитки", "Плодов сироп с вкус на къпина"),
//                    new ProductData("F105", "Сок ябълка 1л", "бр", new BigDecimal("2.80"), 20, "Напитки", "100% ябълков сок без захар"),
//                    new ProductData("F106", "Сок портокал 1л", "бр", new BigDecimal("3.20"), 20, "Напитки", "100% портокалов сок"),
//                    new ProductData("F107", "Сок праскова 1л", "бр", new BigDecimal("3.00"), 20, "Напитки", "Нектар от праскови"),
//                    new ProductData("F108", "Сок грозде 1л", "бр", new BigDecimal("3.40"), 20, "Напитки", "Сок от бяло и червено грозде"),
//                    new ProductData("F109", "Минерална вода газирана 1.5л", "бр", new BigDecimal("1.20"), 20, "Напитки", "Минерална вода с газ"),
//                    new ProductData("F110", "Минерална вода изворна 1.5л", "бр", new BigDecimal("1.00"), 20, "Напитки", "Негазирана минерална вода"),
//                    new ProductData("F111", "Айрян 500мл", "бр", new BigDecimal("1.50"), 20, "Напитки", "Традиционен айрян от кисело мляко"),
//                    new ProductData("F112", "Прясно мляко 3.2% 1л", "бр", new BigDecimal("2.40"), 20, "Млечни", "Краве мляко пастьоризирано"),
//                    new ProductData("F113", "Прясно мляко 1.5% 1л", "бр", new BigDecimal("2.20"), 20, "Млечни", "Краве мляко с намалено съдържание на мазнини"),
//                    new ProductData("F114", "Сметана течна 200мл", "бр", new BigDecimal("2.90"), 20, "Млечни", "Течна сметана за готвене"),
//                    new ProductData("F115", "Сметана сладкарска 500мл", "бр", new BigDecimal("4.20"), 20, "Млечни", "Сметана за разбиване и десерти"),
//                    new ProductData("F116", "Кисело мляко 2% 400г", "бр", new BigDecimal("1.20"), 20, "Млечни", "Класическо кисело мляко"),
//                    new ProductData("F117", "Кисело мляко 3.6% 400г", "бр", new BigDecimal("1.40"), 20, "Млечни", "Богато на вкус кисело мляко"),
//                    new ProductData("F118", "Кисело мляко овче 400г", "бр", new BigDecimal("1.90"), 20, "Млечни", "Овче кисело мляко с наситен аромат"),
//                    new ProductData("F119", "Кисело мляко козе 400г", "бр", new BigDecimal("2.10"), 20, "Млечни", "Козе кисело мляко, натурално"),
//                    new ProductData("F120", "Сирене краве 500г", "бр", new BigDecimal("6.50"), 20, "Млечни", "Традиционно бяло саламурено сирене"),
//                    new ProductData("F121", "Сирене овче 500г", "бр", new BigDecimal("7.90"), 20, "Млечни", "Овче сирене със силен вкус"),
//                    new ProductData("F122", "Сирене козе 500г", "бр", new BigDecimal("8.50"), 20, "Млечни", "Козе сирене с мек аромат"),
//                    new ProductData("F123", "Кашкавал краве 400г", "бр", new BigDecimal("7.20"), 20, "Млечни", "Класически краве кашкавал"),
//                    new ProductData("F124", "Кашкавал овчи 400г", "бр", new BigDecimal("8.90"), 20, "Млечни", "Овчи кашкавал с наситен аромат"),
//                    new ProductData("F125", "Кашкавал пушен 400г", "бр", new BigDecimal("9.20"), 20, "Млечни", "Пушен кашкавал със специфичен вкус"),
//                    new ProductData("F126", "Моцарела 250г", "бр", new BigDecimal("4.50"), 20, "Млечни", "Мека моцарела за салати и пица"),
//                    new ProductData("F127", "Пармезан 200г", "бр", new BigDecimal("7.80"), 20, "Млечни", "Италиански пармезан за паста"),
//                    new ProductData("F128", "Гауда 200г", "бр", new BigDecimal("6.20"), 20, "Млечни", "Холандско сирене гауда"),
//                    new ProductData("F129", "Сирене сини плесени 150г", "бр", new BigDecimal("6.90"), 20, "Млечни", "Сирене рокфор със синя плесен"),
//                    new ProductData("F130", "Сирене бри 150г", "бр", new BigDecimal("6.80"), 20, "Млечни", "Френско сирене бри"),
//                    new ProductData("F131", "Сирене камембер 150г", "бр", new BigDecimal("6.80"), 20, "Млечни", "Френско сирене камембер"),
//                    new ProductData("F132", "Йогурт натурален 500г", "бр", new BigDecimal("2.60"), 20, "Млечни", "Натурален йогурт без добавки"),
//                    new ProductData("F133", "Йогурт ягодов 500г", "бр", new BigDecimal("2.80"), 20, "Млечни", "Йогурт с вкус на ягода"),
//                    new ProductData("F134", "Йогурт прасковен 500г", "бр", new BigDecimal("2.80"), 20, "Млечни", "Йогурт с праскова"),
//                    new ProductData("F135", "Йогурт боровинков 500г", "бр", new BigDecimal("2.80"), 20, "Млечни", "Йогурт с боровинка"),
//                    new ProductData("F136", "Топено сирене 150г", "бр", new BigDecimal("3.20"), 20, "Млечни", "Кремообразно топено сирене"),
//                    new ProductData("F137", "Краве масло 250г", "бр", new BigDecimal("4.50"), 20, "Млечни", "Натурално краве масло"),
//                    new ProductData("F138", "Краве масло 125г", "бр", new BigDecimal("2.60"), 20, "Млечни", "Малка разфасовка краве масло"),
//                    new ProductData("F139", "Маргарин за печене 500г", "бр", new BigDecimal("3.40"), 20, "Мазнини", "Маргарин за сладкарство"),
//                    new ProductData("F140", "Слънчогледови семки сурови 200г", "бр", new BigDecimal("2.80"), 20, "Снаксове", "Сурови белени семки"),
//                    new ProductData("F141", "Тиквени семки сурови 200г", "бр", new BigDecimal("4.50"), 20, "Снаксове", "Сурови тиквени семки"),
//                    new ProductData("F142", "Чия семена 200г", "бр", new BigDecimal("6.20"), 20, "Суперхрани", "Семена чия за смутита и салати"),
//                    new ProductData("F143", "Киноа бяла 200г", "бр", new BigDecimal("5.80"), 20, "Суперхрани", "Киноа бяла без глутен"),
//                    new ProductData("F144", "Киноа червена 200г", "бр", new BigDecimal("6.20"), 20, "Суперхрани", "Червена киноа богата на протеин"),
//                    new ProductData("F145", "Киноа трицветна 200г", "бр", new BigDecimal("6.50"), 20, "Суперхрани", "Микс киноа – бяла, червена и черна"),
//                    new ProductData("F146", "Амарант 200г", "бр", new BigDecimal("5.20"), 20, "Суперхрани", "Амарант за салати и гарнитури"),
//                    new ProductData("F147", "Ленено семе 200г", "бр", new BigDecimal("3.40"), 20, "Суперхрани", "Смляно ленено семе"),
//                    new ProductData("F148", "Конопено семе белено 200г", "бр", new BigDecimal("7.20"), 20, "Суперхрани", "Белено конопено семе"),
//                    new ProductData("F149", "Годжи бери сушени 200г", "бр", new BigDecimal("8.50"), 20, "Суперхрани", "Сушени плодове годжи бери"),
//                    new ProductData("F150", "Акай на прах 100г", "бр", new BigDecimal("12.90"), 20, "Суперхрани", "Акай прах за смутита"),
//                    new ProductData("F151", "Бисквити обикновени 200г", "бр", new BigDecimal("1.80"), 20, "Снаксове", "Класически обикновени бисквити"),
//                    new ProductData("F152", "Бисквити какаови 200г", "бр", new BigDecimal("2.10"), 20, "Снаксове", "Бисквити с какао"),
//                    new ProductData("F153", "Бисквити с овесени ядки 200г", "бр", new BigDecimal("2.40"), 20, "Снаксове", "Хрупкави овесени бисквити"),
//                    new ProductData("F154", "Вафли шоколадови 5бр", "бр", new BigDecimal("1.60"), 20, "Снаксове", "Класически вафли с шоколад"),
//                    new ProductData("F155", "Вафли лешникови 5бр", "бр", new BigDecimal("1.80"), 20, "Снаксове", "Вафли с лешников крем"),
//                    new ProductData("F156", "Шоколад млечен 100г", "бр", new BigDecimal("2.40"), 20, "Снаксове", "Млечен шоколад с какао 30%"),
//                    new ProductData("F157", "Шоколад натурален 100г", "бр", new BigDecimal("2.60"), 20, "Снаксове", "Натурален шоколад 70% какао"),
//                    new ProductData("F158", "Шоколад бял 100г", "бр", new BigDecimal("2.50"), 20, "Снаксове", "Бял шоколад с ванилия"),
//                    new ProductData("F159", "Бонбони карамелени 250г", "бр", new BigDecimal("3.20"), 20, "Снаксове", "Карамелени бонбони със сметана"),
//                    new ProductData("F160", "Бонбони шоколадови 250г", "бр", new BigDecimal("3.80"), 20, "Снаксове", "Ассорти шоколадови бонбони"),
//                    new ProductData("F161", "Гофрети 200г", "бр", new BigDecimal("2.00"), 20, "Снаксове", "Хрупкави гофрети със захар"),
//                    new ProductData("F162", "Крекери солени 200г", "бр", new BigDecimal("2.20"), 20, "Снаксове", "Солени крекери"),
//                    new ProductData("F163", "Крекери с кашкавал 200г", "бр", new BigDecimal("2.40"), 20, "Снаксове", "Крекери с кашкавален вкус"),
//                    new ProductData("F164", "Чипс картофен 150г", "бр", new BigDecimal("2.90"), 20, "Снаксове", "Класически картофен чипс"),
//                    new ProductData("F165", "Чипс със сметана и лук 150г", "бр", new BigDecimal("3.10"), 20, "Снаксове", "Чипс със сметана и лук"),
//                    new ProductData("F166", "Чипс пикантен 150г", "бр", new BigDecimal("3.20"), 20, "Снаксове", "Леко лютив картофен чипс"),
//                    new ProductData("F167", "Солети класически 200г", "бр", new BigDecimal("1.80"), 20, "Снаксове", "Хрупкави солети"),
//                    new ProductData("F168", "Солети сусамови 200г", "бр", new BigDecimal("2.00"), 20, "Снаксове", "Солети с поръска сусам"),
//                    new ProductData("F169", "Фъстъци печени 200г", "бр", new BigDecimal("3.40"), 20, "Ядки", "Печени и осолени фъстъци"),
//                    new ProductData("F170", "Фъстъци сурови 200г", "бр", new BigDecimal("2.90"), 20, "Ядки", "Сурови фъстъци белени"),
//                    new ProductData("F171", "Бадеми печени 200г", "бр", new BigDecimal("6.50"), 20, "Ядки", "Печени бадеми"),
//                    new ProductData("F172", "Бадеми сурови 200г", "бр", new BigDecimal("6.20"), 20, "Ядки", "Сурови бадеми"),
//                    new ProductData("F173", "Лешници печени 200г", "бр", new BigDecimal("7.50"), 20, "Ядки", "Печени лешници"),
//                    new ProductData("F174", "Орехи белени 200г", "бр", new BigDecimal("6.80"), 20, "Ядки", "Сурови орехови ядки"),
//                    new ProductData("F175", "Кашу печени 200г", "бр", new BigDecimal("7.20"), 20, "Ядки", "Печено кашу"),
//                    new ProductData("F176", "Кашу сурово 200г", "бр", new BigDecimal("6.90"), 20, "Ядки", "Сурово кашу"),
//                    new ProductData("F177", "Слънчогледови семки печени 200г", "бр", new BigDecimal("2.40"), 20, "Ядки", "Печени белени семки"),
//                    new ProductData("F178", "Тиквени семки печени 200г", "бр", new BigDecimal("4.80"), 20, "Ядки", "Печени тиквени семки"),
//                    new ProductData("F179", "Стафиди златни 200г", "бр", new BigDecimal("2.80"), 20, "Сухи плодове", "Златни стафиди за сладкиши"),
//                    new ProductData("F180", "Стафиди тъмни 200г", "бр", new BigDecimal("2.60"), 20, "Сухи плодове", "Тъмни стафиди за печива"),
//                    new ProductData("F181", "Сушени кайсии 200г", "бр", new BigDecimal("4.90"), 20, "Сухи плодове", "Сушени кайсии без костилка"),
//                    new ProductData("F182", "Сушени смокини 200г", "бр", new BigDecimal("5.20"), 20, "Сухи плодове", "Сушени смокини натурални"),
//                    new ProductData("F183", "Сушени сливи 200г", "бр", new BigDecimal("4.50"), 20, "Сухи плодове", "Сушени сливи без костилка"),
//                    new ProductData("F184", "Сушени червени боровинки 200г", "бр", new BigDecimal("5.80"), 20, "Сухи плодове", "Подсладени червени боровинки"),
//                    new ProductData("F185", "Сушени ябълки 200г", "бр", new BigDecimal("3.40"), 20, "Сухи плодове", "Сушени ябълкови резени"),
//                    new ProductData("F186", "Сушени банани 200г", "бр", new BigDecimal("4.20"), 20, "Сухи плодове", "Сушени бананови чипсове"),
//                    new ProductData("F187", "Мед акациев 500г", "бр", new BigDecimal("9.20"), 20, "Подсладители", "Акациев мед натурален"),
//                    new ProductData("F188", "Мед липов 500г", "бр", new BigDecimal("8.90"), 20, "Подсладители", "Липов мед натурален"),
//                    new ProductData("F189", "Мед билков 500г", "бр", new BigDecimal("8.50"), 20, "Подсладители", "Натурален билков мед"),
//                    new ProductData("F190", "Мед манов 500г", "бр", new BigDecimal("9.50"), 20, "Подсладители", "Манов мед с богат вкус"),
//                    new ProductData("F191", "Сладко от ягоди 350г", "бр", new BigDecimal("4.20"), 20, "Конфитюри", "Домашно сладко от ягоди"),
//                    new ProductData("F192", "Сладко от вишни 350г", "бр", new BigDecimal("4.40"), 20, "Конфитюри", "Сладко от вишни с парчета плод"),
//                    new ProductData("F193", "Сладко от малини 350г", "бр", new BigDecimal("4.60"), 20, "Конфитюри", "Сладко от малини"),
//                    new ProductData("F194", "Сладко от кайсии 350г", "бр", new BigDecimal("4.30"), 20, "Конфитюри", "Сладко от кайсии"),
//                    new ProductData("F195", "Сладко от смокини 350г", "бр", new BigDecimal("4.70"), 20, "Конфитюри", "Сладко от смокини"),
//                    new ProductData("F196", "Сладко от боровинки 350г", "бр", new BigDecimal("5.00"), 20, "Конфитюри", "Сладко от боровинки"),
//                    new ProductData("F197", "Сладко от череши 350г", "бр", new BigDecimal("4.50"), 20, "Конфитюри", "Сладко от череши"),
//                    new ProductData("F198", "Сладко от горски плодове 350г", "бр", new BigDecimal("5.20"), 20, "Конфитюри", "Сладко от микс горски плодове"),
//                    new ProductData("F199", "Шоколадов крем 400г", "бр", new BigDecimal("5.40"), 20, "Снаксове", "Какаов крем за мазане"),
//                    new ProductData("F200", "Фъстъчено масло 400г", "бр", new BigDecimal("6.20"), 20, "Снаксове", "Класическо фъстъчено масло")
//            );
//
//
//            for (ProductData data : productsData) {
//                ProductEntity p = new ProductEntity();
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