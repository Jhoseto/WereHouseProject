# 📦 Warehouse Portal

Модерно уеб-базирано решение за управление на B2B заявки и складови операции, изградено с Spring Boot и Thymeleaf.

[![Java](https://img.shields.io/badge/Java-17-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.2-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Gradle](https://img.shields.io/badge/Gradle-8.14-blue.svg)](https://gradle.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🚀 Бързо започване

### Предварителни изисквания

- **Java 17+** (препоръчва се OpenJDK или Oracle JDK)
- **Gradle 8.14+** (или използвайте включения wrapper)
- **Git** за клониране на репозиторито

### Инсталиране и стартиране

```bash
# 1. Клонирайте репозиторито
git clone https://github.com/your-username/warehouse-portal.git
cd warehouse-portal

# 2. Стартирайте в development режим
./gradlew bootRun --args='--spring.profiles.active=dev'

# Алтернативно, ако нямате Gradle локално инсталиран
gradle bootRun -Dspring-boot.run.profiles=dev
```

Системата ще бъде достъпна на: **http://localhost:8080**

### Демо креденциали

| Роля | Потребител | Парола | Описание |
|------|------------|---------|-----------|
| **Администратор** | `admin` | `admin123` | Пълен достъп до системата |
| **Клиент 1** | `client1` | `client123` | Демо клиент ЕООД |
| **Клиент 2** | `client2` | `client456` | Тест фирма ООД |

## 📋 Функционалности

### 👤 За клиенти
- ✅ Преглед и търсене в каталог с продукти
- ✅ Интелигентна кошница с real-time обновяване
- ✅ Създаване и изпращане на заявки с бележки
- ✅ Проследяване на статуса на заявките
- ✅ Подробна история на всички поръчки
- ✅ Responsive дизайн за всички устройства

### 👑 За администратори
- ✅ Управление на всички заявки в системата
- ✅ Потвърждаване, отмяна и маркиране като изпратени
- ✅ Real-time dashboard с ключови статистики
- ✅ Филтриране и сортиране на заявки
- ✅ Audit логове за всички важни операции
- ✅ Bulk operations за множество заявки

### 🔧 Системни функции
- ✅ Role-based security с Spring Security
- ✅ Session-based кошница с persistence
- ✅ CSRF защита за всички forms
- ✅ Автоматично изчисление на ДДС
- ✅ Error handling с custom error pages
- ✅ Pagination за големи списъци
- ✅ Auto-refresh за pending заявки

## 🏗️ Архитектура

### Технологичен стек

**Backend:**
- **Spring Boot 3.3.2** - Core framework
- **Spring Security 6** - Authentication & authorization
- **Spring Data JPA** - Data persistence
- **Hibernate** - ORM
- **Thymeleaf** - Server-side templating

**Frontend:**
- **Modern CSS3** - Styling with custom grid systems
- **Vanilla JavaScript** - Interactive features
- **Responsive Design** - Mobile-first approach

**Database:**
- **H2** - In-memory database за development
- **PostgreSQL** - Production database

**Build & DevOps:**
- **Gradle** - Build automation
- **Spring Boot DevTools** - Development utilities
- **Docker** support - Containerization ready

### Проектна структура

```
src/
├── main/
│   ├── java/com/yourco/warehouse/
│   │   ├── config/           # Configuration classes
│   │   ├── domain/
│   │   │   ├── entity/       # JPA entities
│   │   │   └── enums/        # Domain enums
│   │   ├── exception/        # Custom exceptions
│   │   ├── repository/       # Data access layer
│   │   ├── security/         # Security configuration
│   │   ├── service/          # Business logic
│   │   ├── util/             # Utility classes
│   │   └── web/controller/   # Web controllers
│   └── resources/
│       ├── static/
│       │   ├── css/          # Stylesheets
│       │   └── js/           # JavaScript files
│       ├── templates/        # Thymeleaf templates
│       │   ├── admin/        # Admin views
│       │   ├── auth/         # Authentication views
│       │   ├── client/       # Client views
│       │   ├── error/        # Error pages
│       │   ├── home/         # Public pages
│       │   └── layout/       # Layout templates
│       └── application*.properties
```

## 🔧 Конфигурация

### Environment Profiles

#### Development (`application-dev.properties`)
```properties
# H2 In-memory database
spring.datasource.url=jdbc:h2:mem:warehousedb
spring.h2.console.enabled=true

# Hot reload
spring.devtools.restart.enabled=true
spring.thymeleaf.cache=false

# Debug logging
logging.level.com.yourco.warehouse=debug
```

#### Production (`application-prod.properties`)
```properties
# PostgreSQL database
spring.datasource.url=jdbc:postgresql://localhost:5432/warehouse
spring.datasource.username=warehouse
spring.datasource.password=${DB_PASSWORD}

# Production settings
spring.thymeleaf.cache=true
spring.jpa.hibernate.ddl-auto=validate
server.servlet.session.cookie.secure=true
```

### Променливи на средата

| Променлива | Описание | Default |
|------------|----------|---------|
| `DB_PASSWORD` | Database password за production | - |
| `SPRING_PROFILES_ACTIVE` | Active profile (`dev`, `prod`) | `dev` |
| `SERVER_PORT` | Server port | `8080` |

## 🐳 Docker Deployment

### Dockerfile
```dockerfile
FROM openjdk:17-jdk-slim

WORKDIR /app
COPY build/libs/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Стартиране с Docker
```bash
# Build the application
./gradlew build

# Build Docker image
docker build -t warehouse-portal .

# Run container
docker run -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e DB_PASSWORD=your_password \
  warehouse-portal
```

### Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=prod
      - DB_PASSWORD=warehouse_pass
    depends_on:
      - postgres
  
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: warehouse
      POSTGRES_USER: warehouse
      POSTGRES_PASSWORD: warehouse_pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

## 🧪 Testing

### Стартиране на тестове
```bash
# Всички тестове
./gradlew test

# Тестове с coverage report
./gradlew test jacocoTestReport

# Integration тестове
./gradlew integrationTest
```

### Test структура
```
src/test/java/
├── unit/           # Unit тестове
├── integration/    # Integration тестове
└── e2e/           # End-to-end тестове
```

## 🔐 Сигурност

### Authentication & Authorization
- **Spring Security** с custom UserDetailsService
- **Role-based access control** (ADMIN, CLIENT)
- **Session management** с configurable timeout
- **Password encryption** с BCrypt

### Security Features
- **CSRF Protection** за всички POST заявки
- **Session fixation** защита
- **XSS Protection** с proper content escaping
- **Audit logging** за критични операции
- **Rate limiting** (планирано за бъдещи версии)

## 📊 Мониторинг

### Spring Boot Actuator
```bash
# Health check
curl http://localhost:8080/actuator/health

# Application info
curl http://localhost:8080/actuator/info

# Metrics
curl http://localhost:8080/actuator/metrics
```

### Logging
- **Structured logging** с JSON format в production
- **Audit trail** за всички важни операции
- **Error tracking** с подробна stack trace information

## 🚧 Roadmap

### v1.1.0 (Q2 2025)
- [ ] Разширен продуктов каталог с категории
- [ ] Email известия за промени в заявки
- [ ] PDF export за заявки и фактури
- [ ] Advanced search с филтри
- [ ] Bulk операции за администратори

### v1.2.0 (Q3 2025)
- [ ] REST API за external integrations
- [ ] Mobile app companion
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Integration със external payment systems

### v2.0.0 (Q4 2025)
- [ ] Microservices архитектура
- [ ] Real-time notifications с WebSocket
- [ ] Advanced inventory management
- [ ] AI-powered demand forecasting
- [ ] Multi-tenant support

## 🤝 Contributing

Приветстваме contributions! Моля следвайте стандартите:

### Development Setup
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Code Style
- Използвайте **Java Code Conventions**
- Всички classes трябва да имат **Javadoc**
- **Unit tests** за нов код
- **Integration tests** за API endpoints

## 📄 License

Този проект е лицензиран под MIT License - вижте [LICENSE](LICENSE) файла за подробности.

## 📞 Support

### Документация
- [User Guide](docs/USER_GUIDE.md)
- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

### Контакти
- **Issues**: [GitHub Issues](https://github.com/your-username/warehouse-portal/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/warehouse-portal/discussions)

---

**Изградено с ❤️ в България**

*Warehouse Portal е проектиран да улесни B2B операциите и да подобри ефективността на складовите процеси.*