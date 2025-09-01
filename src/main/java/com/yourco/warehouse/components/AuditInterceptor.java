package com.yourco.warehouse.components;

import com.yourco.warehouse.service.AuditService;
import com.yourco.warehouse.util.RequestUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Arrays;
import java.util.List;

@Component
public class AuditInterceptor implements HandlerInterceptor {

    private static final Logger logger = LoggerFactory.getLogger(AuditInterceptor.class);

    @Autowired
    private AuditService auditService;

    // Actions that should be audited
    private static final List<String> AUDIT_ACTIONS = Arrays.asList(
            "POST", "PUT", "PATCH", "DELETE"
    );

    // Paths that should always be audited regardless of method
    private static final List<String> AUDIT_PATHS = Arrays.asList(
            "/admin/orders",
            "/orders/submit",
            "/cart/submit",
            "/login",
            "/logout"
    );

    // Sensitive parameters that should not be logged
    private static final List<String> SENSITIVE_PARAMS = Arrays.asList(
            "password", "token", "_csrf", "oldPassword", "newPassword"
    );

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {

        // Only audit specific methods or paths
        if (!shouldAudit(request)) {
            return true;
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null && auth.isAuthenticated() ? auth.getName() : "anonymous";

        String method = request.getMethod();
        String uri = request.getRequestURI();
        String ipAddress = RequestUtils.getClientIpAddress(request);
        String userAgent = RequestUtils.getUserAgent(request);

        // Create audit description
        StringBuilder description = new StringBuilder();
        description.append(method).append(" request to ").append(uri);

        // Add query parameters (excluding sensitive ones)
        String queryString = request.getQueryString();
        if (queryString != null && !queryString.isEmpty()) {
            String filteredQuery = filterSensitiveParameters(queryString);
            if (!filteredQuery.isEmpty()) {
                description.append(" with parameters: ").append(filteredQuery);
            }
        }

        // For POST requests, add form parameters (excluding sensitive ones)
        if ("POST".equals(method) && request.getContentType() != null &&
                request.getContentType().contains("application/x-www-form-urlencoded")) {

            StringBuilder params = new StringBuilder();
            request.getParameterMap().forEach((key, values) -> {
                if (!SENSITIVE_PARAMS.contains(key.toLowerCase())) {
                    if (params.length() > 0) params.append(", ");
                    params.append(key).append("=").append(values.length > 0 ? values[0] : "");
                }
            });

            if (params.length() > 0) {
                description.append(" with form data: ").append(params.toString());
            }
        }

        // Store audit info in request for post-processing
        request.setAttribute("audit.username", username);
        request.setAttribute("audit.description", description.toString());
        request.setAttribute("audit.ipAddress", ipAddress);
        request.setAttribute("audit.userAgent", userAgent);
        request.setAttribute("audit.startTime", System.currentTimeMillis());

        logger.debug("Audit pre-handle: {} by user '{}' from IP '{}'",
                description.toString(), username, ipAddress);

        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request,
                                HttpServletResponse response,
                                Object handler,
                                Exception ex) throws Exception {

        // Only process audited requests
        if (!shouldAudit(request)) {
            return;
        }

        String username = (String) request.getAttribute("audit.username");
        String description = (String) request.getAttribute("audit.description");
        String ipAddress = (String) request.getAttribute("audit.ipAddress");
        String userAgent = (String) request.getAttribute("audit.userAgent");
        Long startTime = (Long) request.getAttribute("audit.startTime");

        if (description == null) {
            return; // No audit info stored
        }

        try {
            // Enhance description with response info
            StringBuilder enhancedDescription = new StringBuilder(description);
            enhancedDescription.append(" - Response: ").append(response.getStatus());

            if (startTime != null) {
                long duration = System.currentTimeMillis() - startTime;
                enhancedDescription.append(", Duration: ").append(duration).append("ms");
            }

            if (ex != null) {
                enhancedDescription.append(", Exception: ").append(ex.getClass().getSimpleName());
            }

            // Determine action type based on request
            String action = determineAction(request, response, ex);

            // Log the audit entry
            logAuditEntry(action, enhancedDescription.toString(), username, ipAddress, userAgent);

            logger.debug("Audit completed: {} - Status: {}", description, response.getStatus());

        } catch (Exception auditException) {
            logger.error("Failed to complete audit logging: {}", auditException.getMessage());
        }
    }

    /**
     * Check if request should be audited
     */
    private boolean shouldAudit(HttpServletRequest request) {
        String method = request.getMethod();
        String uri = request.getRequestURI();

        // Always audit specific paths
        if (AUDIT_PATHS.stream().anyMatch(path -> uri.contains(path))) {
            return true;
        }

        // Audit specific HTTP methods
        return AUDIT_ACTIONS.contains(method);
    }

    /**
     * Filter sensitive parameters from query string
     */
    private String filterSensitiveParameters(String queryString) {
        if (queryString == null) return "";

        StringBuilder filtered = new StringBuilder();
        String[] params = queryString.split("&");

        for (String param : params) {
            String[] keyValue = param.split("=", 2);
            String key = keyValue[0];

            if (!SENSITIVE_PARAMS.contains(key.toLowerCase())) {
                if (filtered.length() > 0) filtered.append("&");
                filtered.append(param);
            }
        }

        return filtered.toString();
    }

    /**
     * Determine action type for audit log
     */
    private String determineAction(HttpServletRequest request, HttpServletResponse response, Exception ex) {
        String uri = request.getRequestURI();
        String method = request.getMethod();

        if (ex != null) {
            return "ERROR_" + method;
        }

        if (uri.contains("/admin/orders") && method.equals("POST")) {
            if (uri.contains("/confirm")) {
                return "ORDER_CONFIRMED";
            } else if (uri.contains("/cancel")) {
                return "ORDER_CANCELLED";
            }
        }

        if (uri.contains("/orders/submit")) {
            return "ORDER_SUBMITTED";
        }

        if (uri.contains("/cart/submit")) {
            return "CART_SUBMITTED";
        }

        return method + "_REQUEST";
    }

    /**
     * Log audit entry using appropriate method
     */
    private void logAuditEntry(String action, String description, String username, String ipAddress, String userAgent) {
        try {
            // For now, just log to audit service generic method
            // In future, could route to specific audit methods based on action
            switch (action) {
                case "ORDER_SUBMITTED":
                case "ORDER_CONFIRMED":
                case "ORDER_CANCELLED":
                    // These are handled specifically in OrderService
                    break;
                default:
                    // Generic audit logging could be added here
                    logger.info("AUDIT: {} - {} by user '{}' from IP '{}'",
                            action, description, username, ipAddress);
            }
        } catch (Exception e) {
            logger.error("Failed to log audit entry: {}", e.getMessage());
        }
    }
}