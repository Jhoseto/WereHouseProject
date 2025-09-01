package com.yourco.warehouse.components;

import com.yourco.warehouse.service.AuditService;
import com.yourco.warehouse.util.RequestUtils;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.LogoutSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class CustomLogoutSuccessHandler implements LogoutSuccessHandler {

    private static final Logger logger = LoggerFactory.getLogger(CustomLogoutSuccessHandler.class);

    private final AuditService auditService;

    @Autowired
    public CustomLogoutSuccessHandler(AuditService auditService) {
        this.auditService = auditService;
    }

    @Override
    public void onLogoutSuccess(HttpServletRequest request,
                                HttpServletResponse response,
                                Authentication authentication) throws IOException, ServletException {

        if (authentication != null) {
            String username = authentication.getName();
            String ipAddress = RequestUtils.getClientIpAddress(request);
            String userAgent = request.getHeader("User-Agent");

            logger.info("Успешен изход за потребител: {} от IP: {}", username, ipAddress);

            // Audit log
            auditService.logUserLogout(username, ipAddress, userAgent);
        }

        response.sendRedirect("/login?logout=true");
    }
}