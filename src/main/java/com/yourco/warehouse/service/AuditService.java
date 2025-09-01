package com.yourco.warehouse.service;

import com.yourco.warehouse.entity.AuditLog;
import com.yourco.warehouse.entity.Order;
import com.yourco.warehouse.repository.AuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void logOrderSubmitted(Order order, String userAgent, String ipAddress) {
        AuditLog log = new AuditLog();
        log.setAction("ORDER_SUBMITTED");
        log.setEntityType("Order");
        log.setEntityId(order.getId());
        log.setDescription("Подадена заявка #" + order.getId() + " от клиент: " + order.getClient().getName());
        log.setUserName(order.getClient().getName());
        log.setIpAddress(ipAddress);
        log.setUserAgent(userAgent);
        log.setTimestamp(LocalDateTime.now());
        auditLogRepository.save(log);
    }

    public void logOrderConfirmed(Order order, String confirmedBy, String userAgent, String ipAddress) {
        AuditLog log = new AuditLog();
        log.setAction("ORDER_CONFIRMED");
        log.setEntityType("Order");
        log.setEntityId(order.getId());
        log.setDescription("Потвърдена заявка #" + order.getId() + " за клиент: " + order.getClient().getName());
        log.setUserName(confirmedBy);
        log.setIpAddress(ipAddress);
        log.setUserAgent(userAgent);
        log.setTimestamp(LocalDateTime.now());
        auditLogRepository.save(log);
    }

    public void logOrderCancelled(Order order, String reason, String cancelledBy, String userAgent, String ipAddress) {
        AuditLog log = new AuditLog();
        log.setAction("ORDER_CANCELLED");
        log.setEntityType("Order");
        log.setEntityId(order.getId());
        log.setDescription("Отменена заявка #" + order.getId() + " за клиент: " + order.getClient().getName() + ". Причина: " + reason);
        log.setUserName(cancelledBy);
        log.setIpAddress(ipAddress);
        log.setUserAgent(userAgent);
        log.setTimestamp(LocalDateTime.now());
        auditLogRepository.save(log);
    }

    public void logUserLogin(String username, String ipAddress, String userAgent, boolean success) {
        AuditLog log = new AuditLog();
        log.setAction(success ? "USER_LOGIN_SUCCESS" : "USER_LOGIN_FAILED");
        log.setEntityType("User");
        log.setDescription((success ? "Успешен" : "Неуспешен") + " вход за потребител: " + username);
        log.setUserName(username);
        log.setIpAddress(ipAddress);
        log.setUserAgent(userAgent);
        log.setTimestamp(LocalDateTime.now());
        auditLogRepository.save(log);
    }

    public void logUserLogout(String username, String ipAddress, String userAgent) {
        AuditLog log = new AuditLog();
        log.setAction("USER_LOGOUT");
        log.setEntityType("User");
        log.setDescription("Изход на потребител: " + username);
        log.setUserName(username);
        log.setIpAddress(ipAddress);
        log.setUserAgent(userAgent);
        log.setTimestamp(LocalDateTime.now());
        auditLogRepository.save(log);
    }

    public void logProductAccess(String sku, String username, String ipAddress, String userAgent) {
        AuditLog log = new AuditLog();
        log.setAction("PRODUCT_ACCESS");
        log.setEntityType("Product");
        log.setDescription("Достъп до продукт " + sku + " от потребител: " + username);
        log.setUserName(username);
        log.setIpAddress(ipAddress);
        log.setUserAgent(userAgent);
        log.setTimestamp(LocalDateTime.now());
        auditLogRepository.save(log);
    }

    public Page<AuditLog> getAuditLogs(Pageable pageable) {
        return auditLogRepository.findAllByOrderByTimestampDesc(pageable);
    }

    public Page<AuditLog> getAuditLogsByUser(String username, Pageable pageable) {
        return auditLogRepository.findByUserNameOrderByTimestampDesc(username, pageable);
    }

    public Page<AuditLog> getAuditLogsByAction(String action, Pageable pageable) {
        return auditLogRepository.findByActionOrderByTimestampDesc(action, pageable);
    }
}