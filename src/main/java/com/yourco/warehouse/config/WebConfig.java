package com.yourco.warehouse.config;


import com.yourco.warehouse.components.PerformanceInterceptor;
import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ReloadableResourceBundleMessageSource;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.config.annotation.*;
import org.springframework.web.servlet.i18n.LocaleChangeInterceptor;
import org.springframework.web.servlet.i18n.SessionLocaleResolver;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Configuration
public class WebConfig implements WebMvcConfigurer {


    private final PerformanceInterceptor performanceInterceptor;

    public WebConfig(PerformanceInterceptor performanceInterceptor) {

        this.performanceInterceptor = performanceInterceptor;
    }

    /**
     * Configure static resource handling with caching
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Static resources with long cache period for production
        registry.addResourceHandler("/css/**")
                .addResourceLocations("classpath:/static/css/")
                .setCachePeriod(31536000) // 1 year
                .resourceChain(true)
                .addResolver(new org.springframework.web.servlet.resource.VersionResourceResolver()
                        .addContentVersionStrategy("/**"));

        registry.addResourceHandler("/js/**")
                .addResourceLocations("classpath:/static/js/")
                .setCachePeriod(31536000) // 1 year
                .resourceChain(true)
                .addResolver(new org.springframework.web.servlet.resource.VersionResourceResolver()
                        .addContentVersionStrategy("/**"));

        registry.addResourceHandler("/img/**")
                .addResourceLocations("classpath:/static/img/")
                .setCachePeriod(31536000) // 1 year
                .resourceChain(true);

        // Favicon with shorter cache
        registry.addResourceHandler("/favicon.ico")
                .addResourceLocations("classpath:/static/")
                .setCachePeriod(86400); // 1 day
    }

    /**
     * Configure interceptors
     */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Locale change interceptor
        registry.addInterceptor(localeChangeInterceptor());

        // Performance monitoring interceptor
        registry.addInterceptor(performanceInterceptor)
                .addPathPatterns("/**")
                .excludePathPatterns("/css/**", "/js/**", "/img/**", "/favicon.ico");
        
    }

    /**
     * Configure CORS for API endpoints
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }

    /**
     * Configure content negotiation
     */
    @Override
    public void configureContentNegotiation(ContentNegotiationConfigurer configurer) {
        configurer
                .defaultContentType(org.springframework.http.MediaType.TEXT_HTML)
                .favorParameter(false)
                .ignoreAcceptHeader(false)
                .useRegisteredExtensionsOnly(false)
                .mediaType("html", org.springframework.http.MediaType.TEXT_HTML)
                .mediaType("json", org.springframework.http.MediaType.APPLICATION_JSON);
    }

    /**
     * Configure path matching
     */
    @Override
    public void configurePathMatch(PathMatchConfigurer configurer) {
        configurer
                .setUseTrailingSlashMatch(false)
                .setUseSuffixPatternMatch(false);
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
    public LocaleResolver myLocaleResolver() {
        SessionLocaleResolver localeResolver = new SessionLocaleResolver();
        localeResolver.setDefaultLocale(new Locale("bg", "BG"));
        return localeResolver;
    }

    /**
     * Locale change interceptor
     */
    @Bean
    public LocaleChangeInterceptor localeChangeInterceptor() {
        LocaleChangeInterceptor interceptor = new LocaleChangeInterceptor();
        interceptor.setParamName("lang");
        return interceptor;
    }

    /**
     * Configure view controllers for simple mappings
     */
    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addViewController("/").setViewName("redirect:/home");
        registry.addRedirectViewController("/home", "/");
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