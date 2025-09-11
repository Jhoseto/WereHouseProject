package com.yourco.warehouse.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WEBSOCKET CONFIGURATION FOR DASHBOARD REAL-TIME COMMUNICATION
 * =============================================================
 * Минимална конфигурация за dashboard WebSocket комуникация.
 * Проектирана за лесно разширение към notification система в бъдеще.
 *
 * Архитектурни решения:
 * - STOMP protocol за structured messaging
 * - Topic-based broadcasting за scalability
 * - Simple message broker за development (лесно upgrade към RabbitMQ/Redis)
 * - Fallback transport methods за browser compatibility
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    /**
     * Configure message broker for routing messages between clients
     *
     * Използваме "/topic" prefix за broadcast messages (server-to-clients)
     * и "/app" prefix за client-to-server messages.
     *
     * Simple broker е достатъчен за dashboard functionality, но може
     * лесно да се upgrade към external broker за scalability.
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        System.out.println("=== CONFIGURING MESSAGE BROKER ===");
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
        System.out.println("✓ Message broker configured successfully");
    }

    /**
     * Register STOMP endpoints with SockJS fallback support
     *
     * "/ws/dashboard" е основният endpoint за dashboard connections.
     * SockJS осигурява fallback транспорт methods за браузъри които
     * не поддържат WebSocket или имат network restrictions.
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        System.out.println("=== REGISTERING STOMP ENDPOINTS ===");
        registry.addEndpoint("/ws/dashboard")
                .setAllowedOriginPatterns("*")
                .withSockJS();
        System.out.println("✓ STOMP endpoint /ws/dashboard registered with SockJS");
    }
}