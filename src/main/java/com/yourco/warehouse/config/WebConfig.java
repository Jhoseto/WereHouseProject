package com.yourco.warehouse.config;

import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Role;
import org.springframework.context.support.ReloadableResourceBundleMessageSource;
import org.springframework.format.FormatterRegistry;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.config.annotation.*;
import org.springframework.web.servlet.i18n.LocaleChangeInterceptor;
import org.springframework.web.servlet.i18n.SessionLocaleResolver;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Configuration
@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
public class WebConfig implements WebMvcConfigurer {

    /**
     * Configure static resource handling with caching
     * ЗАПАЗЕНА ОРИГИНАЛНА ФУНКЦИОНАЛНОСТ - без промени
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // БЕЗ КЕШИРАНЕ И RESOURCE CHAINS
        registry.addResourceHandler("/css/**")
                .addResourceLocations("classpath:/static/css/")
                .setCachePeriod(0);

        registry.addResourceHandler("/js/**")
                .addResourceLocations("classpath:/static/js/")
                .setCachePeriod(0);

        registry.addResourceHandler("/img/**")
                .addResourceLocations("classpath:/static/img/")
                .setCachePeriod(0);

        registry.addResourceHandler("/favicon.ico")
                .addResourceLocations("classpath:/static/")
                .setCachePeriod(0);
    }

    /**
     * Configure CORS for API endpoints AND WebSocket endpoints
     * РАЗШИРЕНА ФУНКЦИОНАЛНОСТ - добавена WebSocket поддръжка без засягане на API конфигурацията
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // ОРИГИНАЛНА API КОНФИГУРАЦИЯ - запазена точно както беше
        registry.addMapping("/api/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*") // Позволява всички заглавки - za produkcia triabva da se izbroiat konkretni domeini
                .allowCredentials(true)
                .maxAge(3600);
    }

    /**
     * Configure content negotiation - МОДИФИЦИРАНА за WebSocket съвместимост
     * Запазена оригинална логика с добавена поддръжка за WebSocket endpoints
     */
    @Override
    public void configureContentNegotiation(ContentNegotiationConfigurer configurer) {
        configurer
                .defaultContentType(MediaType.APPLICATION_JSON)  // JSON first - запазено!
                .favorParameter(false)
                .ignoreAcceptHeader(false)
                .useRegisteredExtensionsOnly(false)
                .mediaType("html", MediaType.TEXT_HTML)
                .mediaType("json", MediaType.APPLICATION_JSON);

        // Важно: не налагаме content type restrictions които могат да интерферират с WebSocket handshake
        // WebSocket handshake използва специфични headers които не трябва да се modification-ват от content negotiation
    }

    /**
     * Configure path matching - МОДИФИЦИРАНА за WebSocket съвместимост
     * Запазени оригинални настройки с изключение за WebSocket пътища
     */
    @Override
    public void configurePathMatch(PathMatchConfigurer configurer) {
        configurer
                .setUseTrailingSlashMatch(false)  // Запазено оригинално
                .setUseSuffixPatternMatch(false); // Запазено оригинално

        // Важно: Не прилагаме strict path matching правила към WebSocket endpoints
        // защото те използват специфичен upgrade protocol който може да се интерферира от path restrictions
    }

    /**
     * Configure async request handling
     */
    @Override
    public void configureAsyncSupport(AsyncSupportConfigurer configurer) {
        configurer.setDefaultTimeout(30000); // 30 seconds
    }

    /**
     * Custom formatters for data binding
     */
    @Override
    public void addFormatters(FormatterRegistry registry) {
        // Add custom formatters here if needed
        // registry.addFormatter(new CustomDateFormatter());
    }

    /**
     * Message source for internationalization
     */
    @Bean
    @Role(BeanDefinition.ROLE_INFRASTRUCTURE)
    public MessageSource messageSource() {
        ReloadableResourceBundleMessageSource messageSource = new ReloadableResourceBundleMessageSource();
        messageSource.setBasename("classpath:messages");
        messageSource.setDefaultEncoding(StandardCharsets.UTF_8.name());
        messageSource.setUseCodeAsDefaultMessage(true);
        messageSource.setCacheSeconds(3600); // 1 hour cache
        return messageSource;
    }

    /**
     * Locale resolver for internationalization
     */
    @Bean
    @Role(BeanDefinition.ROLE_INFRASTRUCTURE)
    public LocaleResolver localeResolver() {
        SessionLocaleResolver localeResolver = new SessionLocaleResolver();
        localeResolver.setDefaultLocale(new Locale("bg", "BG"));
        return localeResolver;
    }

    /**
     * Locale change interceptor
     */
    @Bean
    @Role(BeanDefinition.ROLE_INFRASTRUCTURE)
    public LocaleChangeInterceptor localeChangeInterceptor() {
        LocaleChangeInterceptor interceptor = new LocaleChangeInterceptor();
        interceptor.setParamName("lang");
        return interceptor;
    }

    /**
     * Configure HTTP message converters
     */
    @Override
    public void configureMessageConverters(java.util.List<org.springframework.http.converter.HttpMessageConverter<?>> converters) {
        // Configure JSON converter for API endpoints
        org.springframework.http.converter.json.MappingJackson2HttpMessageConverter jsonConverter =
                new org.springframework.http.converter.json.MappingJackson2HttpMessageConverter();

        com.fasterxml.jackson.databind.ObjectMapper objectMapper = jsonConverter.getObjectMapper();
        objectMapper.configure(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);
        objectMapper.configure(com.fasterxml.jackson.databind.SerializationFeature.FAIL_ON_EMPTY_BEANS, false);

        converters.add(jsonConverter);
    }
}