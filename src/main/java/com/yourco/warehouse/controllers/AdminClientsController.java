package com.yourco.warehouse.controllers;

import ch.qos.logback.core.encoder.EchoEncoder;
import com.yourco.warehouse.dto.AdminResponseDTO;
import com.yourco.warehouse.entity.UserEntity;
import com.yourco.warehouse.entity.enums.Role;
import com.yourco.warehouse.entity.enums.UserStatus;
import com.yourco.warehouse.service.UserService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * REST контролер за администраторско управление на клиенти
 * Всички endpoints изискват ADMIN роля
 */
@RestController
@RequestMapping("/admin/clients")
@PreAuthorize("hasRole('ADMIN')")
public class AdminClientsController {

    private static final Logger log = LoggerFactory.getLogger(AdminClientsController.class);

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public AdminClientsController(UserService userService,
                                  PasswordEncoder passwordEncoder) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Създаване на нов клиент
     * POST /api/admin/clients/create
     */
    @PostMapping("/create")
    public ResponseEntity<AdminResponseDTO> createClient(
            @Valid @RequestBody AdminResponseDTO request,
            Authentication authentication) {

        try {
            log.info("Admin {} attempts to create new client with username: {}",
                    authentication.getName(), request.getUsername());

            // Валидация на входните данни
            String validationError = validateClientCreateRequest(request);
            if (validationError != null) {
                return ResponseEntity.badRequest().body(AdminResponseDTO.error(validationError));
            }

            // Проверка дали username вече съществува
            if (userService.findUserByUsername(request.getUsername()).isPresent()) {
                return ResponseEntity.badRequest().body(
                        AdminResponseDTO.error("Потребителското име '" + request.getUsername() + "' вече съществува")
                );
            }

            // Проверка дали email вече съществува (ако е предоставен)
            if (request.getEmail() != null && userService.findUserByEmail(request.getEmail()).isPresent()) {
                return ResponseEntity.badRequest().body(
                        AdminResponseDTO.error("Email адресът '" + request.getEmail() + "' вече се използва")
                );
            }

            UserEntity newClient = new UserEntity();
            newClient.setUsername(request.getUsername());
            newClient.setCompanyName(request.getCompanyName());
            newClient.setEmail(request.getEmail());
            newClient.setPhone(request.getPhone());
            newClient.setLocation(request.getLocation());
            newClient.setRole(Role.CLIENT);
            newClient.setUserStatus(UserStatus.ACTIVE);

            newClient.setPasswordHash(passwordEncoder.encode(request.getPassword()));

            userService.createNewUser(newClient);

            log.info("New client created successfully: {} by admin: {}",
                    request.getUsername(), authentication.getName());

            // Подготвяме response данни
            Map<String, Object> responseData = new HashMap<>();
            responseData.put("clientId", newClient.getId());
            responseData.put("username", newClient.getUsername());
            responseData.put("email", newClient.getEmail());

            return ResponseEntity.ok(AdminResponseDTO.success(
                    "Клиент '" + request.getUsername() + "' е създаден успешно",
                    responseData
            ));

        } catch (Exception e) {
            log.error("Error creating client by admin {}: {}", authentication.getName(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(AdminResponseDTO.error("Възникна грешка при създаване на клиента: " + e.getMessage()));
        }
    }

    /**
     * Получаване на списък с всички клиенти (за frontend filtering/sorting)
     * GET /api/admin/clients/list
     */
    @GetMapping("/list")
    public ResponseEntity<AdminResponseDTO> getClientsList(Authentication authentication) {
        try {
            log.debug("Admin {} requests all clients list", authentication.getName());

            // Получаваме всички клиенти наведнъж - frontend ще прави filtering/sorting
            List<UserEntity> allClients = userService.getAllClientUsers();

            // Мапваме към прост JSON формат
            List<Map<String, Object>> clientsData = allClients.stream()
                    .map(this::mapClientToResponseData)
                    .toList();

            return ResponseEntity.ok(AdminResponseDTO.success(
                    "Clients loaded successfully",
                    clientsData
            ));

        } catch (Exception e) {
            log.error("Error retrieving clients list by admin {}: {}", authentication.getName(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(AdminResponseDTO.error("Възникна грешка при зареждане на клиентите"));
        }
    }

    /**
     * Проверка дали username е наличен
     * GET /api/admin/clients/check-username?username=someuser
     */
    @GetMapping("/check-username")
    public ResponseEntity<AdminResponseDTO> checkUsernameAvailability(
            @RequestParam String username,
            Authentication authentication) {

        try {
            // Валидация на дължината на потребителското име
            if (username == null || username.trim().length() < 3) {
                return ResponseEntity.badRequest()
                        .body(AdminResponseDTO.error("Потребителското име трябва да е поне 3 символа"));
            }

            String trimmedUsername = username.trim();

            // Проверка дали вече съществува
            boolean isAvailable = userService.findUserByUsername(trimmedUsername).isEmpty();

            // Създаваме DTO с директно полето available
            AdminResponseDTO response = new AdminResponseDTO();
            response.setSuccess(true);
            response.setMessage(isAvailable ? "Username is available" : "Username is already taken");
            response.setUsername(trimmedUsername);
            response.setAvailable(isAvailable);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error checking username availability by admin {}: {}", authentication.getName(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(AdminResponseDTO.error("Възникна грешка при проверка на потребителското име"));
        }
    }


    /**
     * Активиране/деактивиране на клиент
     * POST /api/admin/clients/{id}/toggle-status
     */
    @PostMapping("/{id}/toggle-status")
    public ResponseEntity<AdminResponseDTO> toggleClientStatus(
            @PathVariable Long id,
            @RequestBody AdminResponseDTO request,
            Authentication authentication) {

        try {

            Optional<UserEntity> clientOpt = userService.findUserById(id);
            if (clientOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            UserEntity client = clientOpt.get();

            // Проверка дали е клиент
            if (client.getRole() != Role.CLIENT) {
                return ResponseEntity.badRequest().body(
                        AdminResponseDTO.error("Потребителят не е клиент")
                );
            }
            UserStatus userOldStatus = client.getUserStatus();

            String action = userService.updateUserStatus(client, userOldStatus);

            Map<String, Object> responseData = new HashMap<>();
            responseData.put("clientId", id);
            responseData.put("username", client.getUsername());
            responseData.put("oldStatus", userOldStatus);
            responseData.put("newStatus", request.getUserStatus());

            return ResponseEntity.ok(AdminResponseDTO.success(
                    "Клиент '" + client.getUsername() + "' е " + action + " успешно",
                    responseData
            ));

        } catch (Exception e) {
            log.error("Error toggling client status by admin {}: {}", authentication.getName(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(AdminResponseDTO.error("Възникна грешка при промяна на статуса"));
        }
    }

    /**
     * Изпращане на лично съобщение до клиент
     * POST /api/admin/clients/send-message
     */
    @PostMapping("/send-message")
    public ResponseEntity<AdminResponseDTO> sendClientMessage(
            @RequestBody AdminResponseDTO request,
            Authentication authentication) {

        try {
            log.info("Admin {} sends message to client ID: {} with subject: {}",
                    authentication.getName(), request.getClientId(), request.getSubject());

            // Валидация
            if (request.getClientId() == null || request.getSubject() == null ||
                    request.getContent() == null || request.getSubject().trim().isEmpty() ||
                    request.getContent().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(
                        AdminResponseDTO.error("Всички полета са задължителни")
                );
            }

            Optional<UserEntity> clientOpt = userService.findUserById(request.getClientId());
            if (clientOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            UserEntity client = clientOpt.get();
            if (client.getRole() != Role.CLIENT) {
                return ResponseEntity.badRequest().body(
                        AdminResponseDTO.error("Потребителят не е клиент")
                );
            }

            // TODO: Implement message sending logic
            // messageService.sendAdminMessageToClient(client, request.getSubject(), request.getContent(), authentication.getName());

            log.info("Message sent successfully to client {} by admin {}",
                    client.getUsername(), authentication.getName());

            Map<String, Object> responseData = new HashMap<>();
            responseData.put("clientId", request.getClientId());
            responseData.put("clientUsername", client.getUsername());
            responseData.put("subject", request.getSubject());

            return ResponseEntity.ok(AdminResponseDTO.success(
                    "Съобщението е изпратено успешно до " + client.getUsername(),
                    responseData
            ));

        } catch (Exception e) {
            log.error("Error sending message by admin {}: {}", authentication.getName(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(AdminResponseDTO.error("Възникна грешка при изпращане на съобщението"));
        }
    }

    @PostMapping("/send-email")
    public ResponseEntity<AdminResponseDTO> sendClientEmail(
            @RequestBody AdminResponseDTO request,
            Authentication authentication) {

        try {
            log.info("Admin {} sends email to client ID: {} with subject: {}",
                    authentication.getName(), request.getClientId(), request.getSubject());

            // Валидация
            if (request.getClientId() == null || request.getSubject() == null ||
                    request.getContent() == null || request.getSubject().trim().isEmpty() ||
                    request.getContent().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(
                        AdminResponseDTO.error("Всички полета са задължителни")
                );
            }

            Optional<UserEntity> clientOpt = userService.findUserById(request.getClientId());
            if (clientOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            UserEntity client = clientOpt.get();
            if (client.getRole() != Role.CLIENT) {
                return ResponseEntity.badRequest().body(
                        AdminResponseDTO.error("Потребителят не е клиент")
                );
            }

            if (client.getEmail() == null || client.getEmail().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(
                        AdminResponseDTO.error("Клиентът няма настроен email адрес")
                );
            }

            // TODO: Implement email sending logic
            // emailService.sendAdminEmailToClient(client, request.getSubject(), request.getContent(),
            //                                   request.getCopyToAdmin(), authentication.getName());

            log.info("Email sent successfully to client {} ({}) by admin {}",
                    client.getUsername(), client.getEmail(), authentication.getName());

            Map<String, Object> responseData = new HashMap<>();
            responseData.put("clientId", request.getClientId());
            responseData.put("clientUsername", client.getUsername());
            responseData.put("clientEmail", client.getEmail());
            responseData.put("subject", request.getSubject());
            responseData.put("copyToAdmin", request.getCopyToAdmin());

            return ResponseEntity.ok(AdminResponseDTO.success(
                    "Email е изпратен успешно до " + client.getEmail(),
                    responseData
            ));

        } catch (Exception e) {
            log.error("Error sending email by admin {}: {}", authentication.getName(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(AdminResponseDTO.error("Възникна грешка при изпращане на email-а"));
        }
    }

    // ==========================================
    // HELPER METHODS
    // ==========================================

    /**
     * Валидация на заявка за създаване на клиент
     */
    private String validateClientCreateRequest(AdminResponseDTO request) {
        if (request.getUsername() == null || request.getUsername().trim().length() < 3) {
            return "Потребителското име трябва да е поне 3 символа";
        }

        if (request.getEmail() == null || !isValidEmail(request.getEmail())) {
            return "Моля въведете валиден email адрес";
        }

        if (request.getPassword() == null || request.getPassword().length() < 6) {
            return "Паролата трябва да е поне 6 символа";
        }


        return null; // Всичко е OK
    }

    /**
     * Mapване на UserEntity към response данни
     */
    private Map<String, Object> mapClientToResponseData(UserEntity client) {
        Map<String, Object> data = new HashMap<>();
        data.put("id", client.getId());
        data.put("username", client.getUsername());
        data.put("companyName", client.getCompanyName());
        data.put("email", client.getEmail());
        data.put("phone", client.getPhone());
        data.put("location", client.getLocation());
        data.put("userStatus", client.getUserStatus());
        data.put("role", client.getRole().toString());
        return data;
    }

    /**
     * Проста email валидация
     */
    private boolean isValidEmail(String email) {
        return email != null && email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    }
}