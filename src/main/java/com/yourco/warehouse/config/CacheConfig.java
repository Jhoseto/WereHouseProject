package com.yourco.warehouse.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CachingConfigurerSupport;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCache;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.cache.interceptor.CacheResolver;
import org.springframework.cache.interceptor.KeyGenerator;
import org.springframework.cache.interceptor.SimpleCacheErrorHandler;
import org.springframework.cache.interceptor.SimpleCacheResolver;
import org.springframework.cache.interceptor.SimpleKeyGenerator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

import java.util.Arrays;
import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching
public class CacheConfig extends CachingConfigurerSupport {

    private static final Logger logger = LoggerFactory.getLogger(CacheConfig.class);

    // Cache names
    public static final String PRODUCTS_CACHE = "products";
    public static final String CLIENTS_CACHE = "clients";
    public static final String USERS_CACHE = "users";
    public static final String ORDERS_CACHE = "orders";
    public static final String STATISTICS_CACHE = "statistics";

    /**
     * Primary cache manager using ConcurrentHashMap for simplicity
     */
    @Bean
    @Primary
    @Profile("!redis")
    public CacheManager cacheManager() {
        logger.info("Initializing ConcurrentMapCacheManager");

        ConcurrentMapCacheManager cacheManager = new ConcurrentMapCacheManager() {
            @Override
            protected ConcurrentMapCache createConcurrentMapCache(String name) {
                return new ConcurrentMapCache(name,
                        getCacheStore(name),
                        isAllowNullValues());
            }
        };

        // Pre-create caches
        cacheManager.setCacheNames(Arrays.asList(
                PRODUCTS_CACHE,
                CLIENTS_CACHE,
                USERS_CACHE,
                ORDERS_CACHE,
                STATISTICS_CACHE
        ));

        cacheManager.setAllowNullValues(false);

        logger.info("ConcurrentMapCacheManager initialized with caches: {}",
                cacheManager.getCacheNames());

        return cacheManager;
    }

    /**
     * Custom key generator for more predictable cache keys
     */
    @Bean
    @Override
    public KeyGenerator keyGenerator() {
        return new CustomKeyGenerator();
    }

    /**
     * Cache resolver
     */
    @Bean
    @Override
    public CacheResolver cacheResolver() {
        return new SimpleCacheResolver(cacheManager());
    }

    /**
     * Cache error handler - prevents cache errors from breaking the application
     */
    @Bean
    @Override
    public CacheErrorHandler errorHandler() {
        return new CustomCacheErrorHandler();
    }

    /**
     * Get cache store with appropriate size limits based on cache type
     */
    private java.util.concurrent.ConcurrentMap<Object, Object> getCacheStore(String cacheName) {
        // Create bounded concurrent maps based on cache type
        switch (cacheName) {
            case PRODUCTS_CACHE:
                return new java.util.concurrent.ConcurrentHashMap<>(1000);
            case CLIENTS_CACHE:
                return new java.util.concurrent.ConcurrentHashMap<>(100);
            case USERS_CACHE:
                return new java.util.concurrent.ConcurrentHashMap<>(100);
            case ORDERS_CACHE:
                return new java.util.concurrent.ConcurrentHashMap<>(500);
            case STATISTICS_CACHE:
                return new java.util.concurrent.ConcurrentHashMap<>(50);
            default:
                return new java.util.concurrent.ConcurrentHashMap<>(200);
        }
    }

    /**
     * Custom key generator for more predictable keys
     */
    public static class CustomKeyGenerator implements KeyGenerator {
        @Override
        public Object generate(Object target, java.lang.reflect.Method method, Object... params) {
            StringBuilder key = new StringBuilder();
            key.append(target.getClass().getSimpleName()).append(":");
            key.append(method.getName());

            if (params.length > 0) {
                key.append(":");
                for (int i = 0; i < params.length; i++) {
                    if (i > 0) key.append(",");
                    if (params[i] != null) {
                        key.append(params[i].toString());
                    } else {
                        key.append("null");
                    }
                }
            }

            return key.toString();
        }
    }

    /**
     * Custom cache error handler that logs errors but doesn't break execution
     */
    public static class CustomCacheErrorHandler implements CacheErrorHandler {

        private static final Logger logger = LoggerFactory.getLogger(CustomCacheErrorHandler.class);

        @Override
        public void handleCacheGetError(RuntimeException exception,
                                        org.springframework.cache.Cache cache,
                                        Object key) {
            logger.warn("Cache GET error in cache '{}' for key '{}': {}",
                    cache.getName(), key, exception.getMessage());
        }

        @Override
        public void handleCachePutError(RuntimeException exception,
                                        org.springframework.cache.Cache cache,
                                        Object key, Object value) {
            logger.warn("Cache PUT error in cache '{}' for key '{}': {}",
                    cache.getName(), key, exception.getMessage());
        }

        @Override
        public void handleCacheEvictError(RuntimeException exception,
                                          org.springframework.cache.Cache cache,
                                          Object key) {
            logger.warn("Cache EVICT error in cache '{}' for key '{}': {}",
                    cache.getName(), key, exception.getMessage());
        }

        @Override
        public void handleCacheClearError(RuntimeException exception,
                                          org.springframework.cache.Cache cache) {
            logger.warn("Cache CLEAR error in cache '{}': {}",
                    cache.getName(), exception.getMessage());
        }
    }
}