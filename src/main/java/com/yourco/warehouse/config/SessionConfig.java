package com.yourco.warehouse.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.session.jdbc.config.annotation.web.http.EnableJdbcHttpSession;

@Configuration
@EnableJdbcHttpSession(
        tableName = "SPRING_SESSION",
        maxInactiveIntervalInSeconds = 1800
)
public class SessionConfig {
}