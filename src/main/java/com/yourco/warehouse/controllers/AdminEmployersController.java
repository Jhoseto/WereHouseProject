package com.yourco.warehouse.controllers;

import com.yourco.warehouse.dto.AdminResponseDTO;
import com.yourco.warehouse.dto.EmployerDTO;
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
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * REST КОНТРОЛЕР ЗА АДМИНИСТРАТОРСКО УПРАВЛЕНИЕ НА СЛУЖИТЕЛИ
 * ==========================================================
 * Всички endpoints изискват ADMIN роля.
 * Базиран на ClientsController логиката с адаптации за служители.
 */
@RestController
@RequestMapping("/admin/employersManagement")
@PreAuthorize("hasRole('ADMIN')")
public class AdminEmployersController {

    private static final Logger log = LoggerFactory.getLogger(AdminEmployersController.class);

    private final UserService userService;

    @Autowired
    public AdminEmployersController(UserService userService) {
        this.userService = userService;
    }

    // ==========================================
    // CREATE EMPLOYER
    // ==========================================

    /**
     * Създава нов служител
     * POST /admin/employers/create
     */
    @PostMapping("/create")
    public ResponseEntity<AdminResponseDTO> createEmployer(
            @Valid @RequestBody EmployerDTO request,
            BindingResult bindingResult,
            Authentication authentication) {

        try {
            // Bean Validation грешки
            if (bindingResult.hasErrors()) {
                String errorMessage = bindingResult.getFieldError().getDefaultMessage();
                return ResponseEntity.badRequest()
                        .body(AdminResponseDTO.error(errorMessage));
            }

            log.info("Admin {} attempts to create new employer with username: {}",
                    authentication.getName(), request.getUsername());

            UserEntity newEmployer = userService.createNewEmployer(
                    request.getUsername(),
                    request.getEmail(),
                    request.getPassword(),
                    request.getPhone(),
                    request.getLocation()
            );

            log.info("New employer created successfully: {} by admin: {}",
                    newEmployer.getUsername(), authentication.getName());

            Map<String, Object> responseData = new HashMap<>();
            responseData.put("employerId", newEmployer.getId());
            responseData.put("username", newEmployer.getUsername());
            responseData.put("email", newEmployer.getEmail());

            return ResponseEntity.ok(AdminResponseDTO.success(
                    "Служител '" + request.getUsername() + "' е създаден успешно",
                    responseData
            ));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(AdminResponseDTO.error(e.getMessage()));

        } catch (Exception e) {
            log.error("Error creating employer: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(AdminResponseDTO.error("Възникна грешка при създаване на служителя"));
        }
    }

    // ==========================================
    // GET ALL EMPLOYERS
    // ==========================================

    /**
     * Връща списък с всички служители
     * GET /admin/employers/list
     */
    @GetMapping("/list")
    public ResponseEntity<AdminResponseDTO> getEmployersList(Authentication authentication) {
        try {
            log.debug("Admin {} requests all employers list", authentication.getName());

            List<UserEntity> allEmployers = userService.getAllEmployerUsers();

            // Мапване към DTO формат
            List<Map<String, Object>> employersData = allEmployers.stream()
                    .map(employer -> {
                        Map<String, Object> empMap = new HashMap<>();
                        empMap.put("id", employer.getId());
                        empMap.put("username", employer.getUsername());
                        empMap.put("email", employer.getEmail());
                        empMap.put("phone", employer.getPhone());
                        empMap.put("location", employer.getLocation());
                        empMap.put("userStatus", employer.getUserStatus().name());
                        empMap.put("createdAt", employer.getCreatedAt());
                        empMap.put("updatedAt", employer.getUpdatedAt());
                        return empMap;
                    })
                    .collect(Collectors.toList());

            Map<String, Object> responseData = new HashMap<>();
            responseData.put("employers", employersData);
            responseData.put("total", employersData.size());

            return ResponseEntity.ok(AdminResponseDTO.success(
                    "Списък с всички служители",
                    responseData
            ));

        } catch (Exception e) {
            log.error("Error fetching employers list: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(AdminResponseDTO.error("Грешка при зареждане на служителите"));
        }
    }

    // ==========================================
    // TOGGLE EMPLOYER STATUS
    // ==========================================

    /**
     * Активира/деактивира служител (ACTIVE <-> INACTIVE)
     * POST /admin/employers/{id}/toggle-status
     */
    @PostMapping("/{id}/toggle-status")
    public ResponseEntity<AdminResponseDTO> toggleEmployerStatus(
            @PathVariable Long id,
            Authentication authentication) {

        try {
            Optional<UserEntity> employerOpt = userService.findEmployerById(id);

            if (employerOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            UserEntity employer = employerOpt.get();

            // Проверка дали е служител
            if (employer.getRole() != Role.EMPLOYER) {
                return ResponseEntity.badRequest().body(
                        AdminResponseDTO.error("Потребителят не е служител")
                );
            }

            UserStatus oldStatus = employer.getUserStatus();

            // Използваме съществуващия метод updateUserStatus
            String action = userService.updateUserStatus(employer, oldStatus);

            log.info("Admin {} toggled employer {} status from {} to {}",
                    authentication.getName(), employer.getUsername(),
                    oldStatus, employer.getUserStatus());

            Map<String, Object> responseData = new HashMap<>();
            responseData.put("employerId", id);
            responseData.put("username", employer.getUsername());
            responseData.put("oldStatus", oldStatus);
            responseData.put("newStatus", employer.getUserStatus());
            responseData.put("action", action);

            return ResponseEntity.ok(AdminResponseDTO.success(
                    "Служител '" + employer.getUsername() + "' е " + action,
                    responseData
            ));

        } catch (Exception e) {
            log.error("Error toggling employer status: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(AdminResponseDTO.error("Грешка при промяна на статуса"));
        }
    }

    // ==========================================
    // CHECK USERNAME AVAILABILITY
    // ==========================================

    /**
     * Проверява дали username е свободен
     * POST /admin/employers/check-username
     */
    @PostMapping("/check-username")
    public ResponseEntity<AdminResponseDTO> checkUsernameAvailability(
            @RequestBody Map<String, String> request,
            Authentication authentication) {

        try {
            String username = request.get("username");

            if (username == null || username.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(AdminResponseDTO.error("Потребителското име не може да е празно"));
            }

            String trimmedUsername = username.trim();
            boolean isAvailable = userService.findUserByUsername(trimmedUsername).isEmpty();

            AdminResponseDTO response = new AdminResponseDTO();
            response.setSuccess(true);
            response.setMessage(isAvailable ?
                    "Username is available" : "Username is already taken");
            response.setUsername(trimmedUsername);
            response.setAvailable(isAvailable);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error checking username availability: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(AdminResponseDTO.error("Грешка при проверка на потребителското име"));
        }
    }
}