
# Warehouse Portal (Spring Boot + Thymeleaf)

Минимален работещ MVP за B2B заявки и прост каталог.

## Как да стартираш (DEV)
1) Java 17+
2) `gradle bootRun -Dspring-boot.run.profiles=dev`
3) http://localhost:8080

### Логини
- Админ: `admin / admin123`
- Клиент: `client1 / client123`

## Какво включва
- Login (Spring Security)
- Каталог с продукти (цена, търсене)
- Кошница в сесията
- Изпращане на заявка (Order) от клиента
- История на заявки на клиента
- Админ панел: списък заявки + потвърждение
- Шаблони за Pick-list и Proforma (HTML за принт)

**База данни:** H2 (dev профил). В prod сложи Postgres/MySQL и настрой `application-prod.properties`.


## Gradle
Стартирай с локален Gradle (`gradle bootRun`) или с wrapper, ако добавиш wrapper файловете.
