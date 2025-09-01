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
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.savedrequest.SavedRequest;
import org.springframework.security.web.savedrequest.HttpSessionRequestCache;
import org.springframework.security.web.savedrequest.RequestCache;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class CustomAuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private static final Logger logger = LoggerFactory.getLogger(CustomAuthenticationSuccessHandler.class);
    private final RequestCache requestCache = new HttpSessionRequestCache();
    private final AuditService auditService;


    @Autowired
    public CustomAuthenticationSuccessHandler(AuditService auditService) {
        this.auditService = auditService;
    }



    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {

        String username = authentication.getName();
        String ipAddress = RequestUtils.getClientIpAddress(request);
        String userAgent = request.getHeader("User-Agent");

        logger.info("Успешен вход за потребител: {} от IP: {}", username, ipAddress);

        // Audit log
        auditService.logUserLogin(username, ipAddress, userAgent, true);

        // Redirect логика
        SavedRequest savedRequest = requestCache.getRequest(request, response);
        if (savedRequest != null) {
            String targetUrl = savedRequest.getRedirectUrl();
            logger.debug("Пренасочване към запазен URL: {}", targetUrl);
            response.sendRedirect(targetUrl);
        } else {
            // По подразбиране пренасочване според ролята
            if (authentication.getAuthorities().stream()
                    .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN"))) {
                response.sendRedirect("/admin");
            } else {
                response.sendRedirect("/catalog");
            }
        }
    }
}