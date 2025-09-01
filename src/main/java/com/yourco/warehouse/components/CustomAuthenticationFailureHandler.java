package com.yourco.warehouse.components;

import com.yourco.warehouse.service.AuditService;
import com.yourco.warehouse.util.RequestUtils;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Component
public class CustomAuthenticationFailureHandler implements AuthenticationFailureHandler {

    private static final Logger logger = LoggerFactory.getLogger(CustomAuthenticationFailureHandler.class);
    private final AuditService auditService;

    @Autowired
    public CustomAuthenticationFailureHandler(AuditService auditService) {
        this.auditService = auditService;
    }

    @Override
    public void onAuthenticationFailure(HttpServletRequest request,
                                        HttpServletResponse response,
                                        AuthenticationException exception) throws IOException, ServletException {

        String username = request.getParameter("username");
        String ipAddress = RequestUtils.getClientIpAddress(request);
        String userAgent = request.getHeader("User-Agent");

        logger.warn("Неуспешен опит за вход: потребител={}, IP={}, причина={}",
                username, ipAddress, exception.getMessage());

        // Audit log
        auditService.logUserLogin(username != null ? username : "unknown", ipAddress, userAgent, false);

        // Определяване на съобщението за грешка
        String errorMessage;
        if (exception instanceof BadCredentialsException || exception instanceof UsernameNotFoundException) {
            errorMessage = "Невалидно потребителско име или парола";
        } else if (exception instanceof DisabledException) {
            errorMessage = "Потребителският акаунт е деактивиран";
        } else if (exception instanceof LockedException) {
            errorMessage = "Потребителският акаунт е заключен";
        } else {
            errorMessage = "Грешка при вход в системата";
        }

        // Пренасочване към login страницата с error параметър
        String encodedMessage = URLEncoder.encode(errorMessage, StandardCharsets.UTF_8);
        response.sendRedirect("/login?error=true&message=" + encodedMessage);
    }
}