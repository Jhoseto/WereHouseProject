package com.yourco.warehouse.config;

import com.yourco.warehouse.components.PerformanceInterceptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.boot.actuate.info.InfoContributor;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@Configuration
public class ActuatorConfig {


    private final Environment environment;

    private final DataSource dataSource;

    private final CacheManager cacheManager;

    private final PerformanceInterceptor performanceInterceptor;

    @Autowired
    public ActuatorConfig(Environment environment,
                          DataSource dataSource,
                          CacheManager cacheManager,
                          PerformanceInterceptor performanceInterceptor) {
        this.environment = environment;
        this.dataSource = dataSource;
        this.cacheManager = cacheManager;
        this.performanceInterceptor = performanceInterceptor;
    }


    /**
     * Custom health indicator for database
     */
    @Bean
    public HealthIndicator databaseHealthIndicator() {
        return () -> {
            try (Connection connection = dataSource.getConnection()) {
                if (connection.isValid(1)) {
                    return Health.up()
                            .withDetail("database", "Available")
                            .withDetail("validationQuery", "Connection is valid")
                            .build();
                } else {
                    return Health.down()
                            .withDetail("database", "Unavailable")
                            .withDetail("error", "Connection validation failed")
                            .build();
                }
            } catch (Exception e) {
                return Health.down()
                        .withDetail("database", "Error")
                        .withDetail("error", e.getMessage())
                        .build();
            }
        };
    }

    /**
     * Custom health indicator for cache
     */
    @Bean
    public HealthIndicator cacheHealthIndicator() {
        return () -> {
            try {
                var cacheNames = cacheManager.getCacheNames();
                Map<String, Object> details = new HashMap<>();

                for (String cacheName : cacheNames) {
                    var cache = cacheManager.getCache(cacheName);
                    if (cache != null) {
                        details.put(cacheName, "Available");
                    } else {
                        details.put(cacheName, "Unavailable");
                    }
                }

                return Health.up()
                        .withDetail("cache", "Available")
                        .withDetails(details)
                        .build();

            } catch (Exception e) {
                return Health.down()
                        .withDetail("cache", "Error")
                        .withDetail("error", e.getMessage())
                        .build();
            }
        };
    }

    /**
     * Custom health indicator for performance monitoring
     */
    @Bean
    public HealthIndicator performanceHealthIndicator() {
        return () -> {
            try {
                int activeRequests = performanceInterceptor.getActiveRequestCount();
                var requestInfos = performanceInterceptor.getActiveRequests();

                // Check for too many active requests
                Health.Builder health = Health.up();
                if (activeRequests > 100) {
                    health = Health.down().withDetail("reason", "Too many active requests");
                } else if (activeRequests > 50) {
                    health = Health.status("WARNING").withDetail("reason", "High number of active requests");
                }

                return health
                        .withDetail("activeRequests", activeRequests)
                        .withDetail("threshold", "WARNING: 50, DOWN: 100")
                        .build();

            } catch (Exception e) {
                return Health.down()
                        .withDetail("performance", "Error")
                        .withDetail("error", e.getMessage())
                        .build();
            }
        };
    }

    /**
     * Custom info contributor
     */
    @Bean
    public InfoContributor customInfoContributor() {
        return (builder) -> {
            Map<String, Object> appInfo = new HashMap<>();
            appInfo.put("name", "Warehouse Portal");
            appInfo.put("description", "B2B Order Management System");
            appInfo.put("version", "1.0.0");
            appInfo.put("startup-time", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));

            Map<String, Object> envInfo = new HashMap<>();
            envInfo.put("active-profiles", environment.getActiveProfiles());
            envInfo.put("java-version", System.getProperty("java.version"));
            envInfo.put("spring-boot-version", org.springframework.boot.SpringBootVersion.getVersion());

            Map<String, Object> systemInfo = new HashMap<>();
            Runtime runtime = Runtime.getRuntime();
            systemInfo.put("processors", runtime.availableProcessors());
            systemInfo.put("memory-max", runtime.maxMemory() / 1024 / 1024 + " MB");
            systemInfo.put("memory-total", runtime.totalMemory() / 1024 / 1024 + " MB");
            systemInfo.put("memory-free", runtime.freeMemory() / 1024 / 1024 + " MB");

            builder.withDetail("application", appInfo)
                    .withDetail("environment", envInfo)
                    .withDetail("system", systemInfo);
        };
    }

    /**
     * Build info contributor (if build-info.properties exists)
     */
    @Bean
    public InfoContributor buildInfoContributor() {
        return (builder) -> {
            try {
                // This will be populated if gradle builds with build-info
                Map<String, Object> buildInfo = new HashMap<>();
                buildInfo.put("time", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
                buildInfo.put("artifact", "warehouse-portal");
                buildInfo.put("group", "com.yourco");
                buildInfo.put("version", "1.0.0");

                builder.withDetail("build", buildInfo);
            } catch (Exception e) {
                // Build info not available, skip
            }
        };
    }
}