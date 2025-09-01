package com.yourco.warehouse.util;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.util.StringUtils;

public class RequestUtils {

    private static final String[] IP_HEADER_CANDIDATES = {
            "X-Forwarded-For",
            "Proxy-Client-IP",
            "WL-Proxy-Client-IP",
            "HTTP_X_FORWARDED_FOR",
            "HTTP_X_FORWARDED",
            "HTTP_X_CLUSTER_CLIENT_IP",
            "HTTP_CLIENT_IP",
            "HTTP_FORWARDED_FOR",
            "HTTP_FORWARDED",
            "HTTP_VIA",
            "REMOTE_ADDR"
    };

    /**
     * Извлича реалния IP адрес на клиента, включително при използване на proxy/load balancer
     */
    public static String getClientIpAddress(HttpServletRequest request) {
        for (String header : IP_HEADER_CANDIDATES) {
            String ipList = request.getHeader(header);
            if (StringUtils.hasText(ipList) && !"unknown".equalsIgnoreCase(ipList)) {
                // Ако има няколко IP адреса разделени със запетая, взимаме първия
                String ip = ipList.split(",")[0].trim();
                if (isValidIpAddress(ip)) {
                    return ip;
                }
            }
        }
        return request.getRemoteAddr();
    }

    /**
     * Базова валидация за IP адрес
     */
    private static boolean isValidIpAddress(String ip) {
        if (!StringUtils.hasText(ip) || "unknown".equalsIgnoreCase(ip)) {
            return false;
        }

        // Проверка за IPv4
        if (ip.matches("^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$")) {
            String[] parts = ip.split("\\.");
            for (String part : parts) {
                int num = Integer.parseInt(part);
                if (num < 0 || num > 255) {
                    return false;
                }
            }
            return true;
        }

        // За IPv6 и други формати просто приемаме че са валидни
        return true;
    }

    /**
     * Получава User Agent и го ограничава до разумна дължина
     */
    public static String getUserAgent(HttpServletRequest request) {
        String userAgent = request.getHeader("User-Agent");
        if (userAgent != null && userAgent.length() > 1000) {
            return userAgent.substring(0, 1000) + "...";
        }
        return userAgent;
    }

    /**
     * Проверява дали заявката идва от локален адрес
     */
    public static boolean isLocalRequest(HttpServletRequest request) {
        String ip = getClientIpAddress(request);
        return "127.0.0.1".equals(ip) || "0:0:0:0:0:0:0:1".equals(ip) || "localhost".equals(ip);
    }
}