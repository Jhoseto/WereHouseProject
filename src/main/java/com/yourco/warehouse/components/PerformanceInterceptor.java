package com.yourco.warehouse.components;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Component
public class PerformanceInterceptor implements HandlerInterceptor {

    private static final Logger logger = LoggerFactory.getLogger(PerformanceInterceptor.class);
    private static final Logger performanceLogger = LoggerFactory.getLogger("PERFORMANCE");

    // Track active requests for monitoring
    private final ConcurrentMap<String, RequestInfo> activeRequests = new ConcurrentHashMap<>();

    // Performance thresholds (in milliseconds)
    private static final long SLOW_REQUEST_THRESHOLD = 1000;
    private static final long VERY_SLOW_REQUEST_THRESHOLD = 5000;

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {

        long startTime = System.currentTimeMillis();
        String requestId = UUID.randomUUID().toString().substring(0, 8);
        String uri = request.getRequestURI();
        String method = request.getMethod();
        String userAgent = request.getHeader("User-Agent");
        String ipAddress = getClientIpAddress(request);

        // Set up MDC for logging correlation
        MDC.put("requestId", requestId);
        MDC.put("method", method);
        MDC.put("uri", uri);

        // Store request info
        RequestInfo requestInfo = new RequestInfo(
                requestId, method, uri, startTime, ipAddress, userAgent
        );

        activeRequests.put(requestId, requestInfo);

        // Store in request attributes for later use
        request.setAttribute("performance.startTime", startTime);
        request.setAttribute("performance.requestId", requestId);

        logger.debug("Request started: {} {} [{}]", method, uri, requestId);

        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request,
                                HttpServletResponse response,
                                Object handler,
                                Exception ex) throws Exception {

        Long startTime = (Long) request.getAttribute("performance.startTime");
        String requestId = (String) request.getAttribute("performance.requestId");

        if (startTime == null || requestId == null) {
            return;
        }

        try {
            long endTime = System.currentTimeMillis();
            long duration = endTime - startTime;

            String method = request.getMethod();
            String uri = request.getRequestURI();
            int statusCode = response.getStatus();

            // Remove from active requests
            RequestInfo requestInfo = activeRequests.remove(requestId);

            // Log performance metrics
            logPerformanceMetrics(method, uri, duration, statusCode, requestId, ex);

            // Additional monitoring for slow requests
            if (duration > VERY_SLOW_REQUEST_THRESHOLD) {
                logger.warn("VERY SLOW REQUEST: {} {} took {}ms [{}] - Status: {}",
                        method, uri, duration, requestId, statusCode);
            } else if (duration > SLOW_REQUEST_THRESHOLD) {
                logger.info("Slow request: {} {} took {}ms [{}] - Status: {}",
                        method, uri, duration, requestId, statusCode);
            }

            // Log to performance logger for metrics collection
            performanceLogger.info("method={} uri={} duration={}ms status={} requestId={} error={}",
                    method, uri, duration, statusCode, requestId, ex != null);

        } finally {
            // Clean up MDC
            MDC.clear();
        }
    }

    /**
     * Log detailed performance metrics
     */
    private void logPerformanceMetrics(String method, String uri, long duration,
                                       int statusCode, String requestId, Exception ex) {

        String level = getLogLevel(duration, statusCode, ex);
        String message = String.format("Request completed: %s %s in %dms [%s] - Status: %s",
                method, uri, duration, requestId, statusCode);

        switch (level) {
            case "ERROR":
                logger.error(message + (ex != null ? " - Exception: " + ex.getClass().getSimpleName() : ""));
                break;
            case "WARN":
                logger.warn(message);
                break;
            case "INFO":
                logger.info(message);
                break;
            default:
                logger.debug(message);
        }
    }

    /**
     * Determine appropriate log level based on performance and status
     */
    private String getLogLevel(long duration, int statusCode, Exception ex) {
        if (ex != null || statusCode >= 500) {
            return "ERROR";
        }

        if (statusCode >= 400 || duration > VERY_SLOW_REQUEST_THRESHOLD) {
            return "WARN";
        }

        if (statusCode >= 300 || duration > SLOW_REQUEST_THRESHOLD) {
            return "INFO";
        }

        return "DEBUG";
    }

    /**
     * Get client IP address handling proxy headers
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }

        return request.getRemoteAddr();
    }

    /**
     * Get current active request count (for monitoring)
     */
    public int getActiveRequestCount() {
        return activeRequests.size();
    }

    /**
     * Get active requests info (for monitoring)
     */
    public java.util.Collection<RequestInfo> getActiveRequests() {
        return activeRequests.values();
    }

    /**
     * Request info holder for monitoring
     */
    public static class RequestInfo {
        private final String requestId;
        private final String method;
        private final String uri;
        private final long startTime;
        private final String ipAddress;
        private final String userAgent;

        public RequestInfo(String requestId, String method, String uri, long startTime,
                           String ipAddress, String userAgent) {
            this.requestId = requestId;
            this.method = method;
            this.uri = uri;
            this.startTime = startTime;
            this.ipAddress = ipAddress;
            this.userAgent = userAgent;
        }

        public String getRequestId() { return requestId; }
        public String getMethod() { return method; }
        public String getUri() { return uri; }
        public long getStartTime() { return startTime; }
        public String getIpAddress() { return ipAddress; }
        public String getUserAgent() { return userAgent; }

        public long getDuration() {
            return System.currentTimeMillis() - startTime;
        }

        @Override
        public String toString() {
            return String.format("RequestInfo{id='%s', method='%s', uri='%s', duration=%dms, ip='%s'}",
                    requestId, method, uri, getDuration(), ipAddress);
        }
    }
}