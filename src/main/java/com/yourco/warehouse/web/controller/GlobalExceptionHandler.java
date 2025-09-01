package com.yourco.warehouse.web.controller;

import com.yourco.warehouse.exception.AccessDeniedException;
import com.yourco.warehouse.service.AuditService;
import com.yourco.warehouse.util.RequestUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.ui.Model;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @Autowired
    private AuditService auditService;

    /**
     * Handle access denied exceptions
     */
    @ExceptionHandler(AccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public String handleAccessDeniedException(AccessDeniedException e,
                                              Model model,
                                              HttpServletRequest request,
                                              Authentication auth) {

        String username = auth != null ? auth.getName() : "anonymous";
        String ipAddress = RequestUtils.getClientIpAddress(request);

        logger.warn("Access denied for user '{}' from IP '{}': {}", username, ipAddress, e.getMessage());

        model.addAttribute("error", e.getMessage());
        model.addAttribute("statusCode", 403);

        return "error/access-denied";
    }

    /**
     * Handle illegal argument exceptions (bad input)
     */
    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public String handleIllegalArgumentException(IllegalArgumentException e,
                                                 Model model,
                                                 HttpServletRequest request,
                                                 Authentication auth) {

        String username = auth != null ? auth.getName() : "anonymous";
        logger.warn("Invalid argument from user '{}': {}", username, e.getMessage());

        model.addAttribute("error", "Невалидни данни: " + e.getMessage());
        model.addAttribute("statusCode", 400);

        return "error/general";
    }

    /**
     * Handle illegal state exceptions (invalid operations)
     */
    @ExceptionHandler(IllegalStateException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public String handleIllegalStateException(IllegalStateException e,
                                              Model model,
                                              HttpServletRequest request,
                                              Authentication auth) {

        String username = auth != null ? auth.getName() : "anonymous";
        logger.warn("Invalid state operation from user '{}': {}", username, e.getMessage());

        model.addAttribute("error", "Невалидна операция: " + e.getMessage());
        model.addAttribute("statusCode", 409);

        return "error/general";
    }

    /**
     * Handle validation exceptions
     */
    @ExceptionHandler({MethodArgumentNotValidException.class, BindException.class})
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public String handleValidationExceptions(Exception e,
                                             Model model,
                                             HttpServletRequest request,
                                             RedirectAttributes redirectAttributes) {

        Map<String, String> errors = new HashMap<>();

        if (e instanceof MethodArgumentNotValidException) {
            MethodArgumentNotValidException ex = (MethodArgumentNotValidException) e;
            ex.getBindingResult().getAllErrors().forEach((error) -> {
                String fieldName = ((FieldError) error).getField();
                String errorMessage = error.getDefaultMessage();
                errors.put(fieldName, errorMessage);
            });
        } else if (e instanceof BindException) {
            BindException ex = (BindException) e;
            ex.getBindingResult().getAllErrors().forEach((error) -> {
                String fieldName = ((FieldError) error).getField();
                String errorMessage = error.getDefaultMessage();
                errors.put(fieldName, errorMessage);
            });
        }

        String errorSummary = errors.values().stream()
                .limit(3)
                .collect(Collectors.joining("; "));

        logger.warn("Validation errors: {}", errorSummary);

        // For AJAX requests or API calls
        if (isAjaxRequest(request)) {
            model.addAttribute("errors", errors);
            model.addAttribute("message", "Грешки при валидация на данните");
            return "fragments/validation-errors";
        }

        // For regular form submissions, redirect back with error
        redirectAttributes.addFlashAttribute("error",
                "Моля поправете грешките във формуляра: " + errorSummary);

        String referer = request.getHeader("Referer");
        if (referer != null && !referer.isEmpty()) {
            return "redirect:" + referer;
        }

        return "redirect:/";
    }

    /**
     * Handle constraint violation exceptions
     */
    @ExceptionHandler(ConstraintViolationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public String handleConstraintViolationException(ConstraintViolationException e,
                                                     Model model,
                                                     RedirectAttributes redirectAttributes) {

        String errorMessage = e.getConstraintViolations().stream()
                .map(violation -> violation.getPropertyPath() + ": " + violation.getMessage())
                .limit(3)
                .collect(Collectors.joining("; "));

        logger.warn("Constraint violation: {}", errorMessage);

        model.addAttribute("error", "Невалидни данни: " + errorMessage);
        model.addAttribute("statusCode", 400);

        return "error/general";
    }

    /**
     * Handle data integrity violations (database constraints)
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public String handleDataIntegrityViolationException(DataIntegrityViolationException e,
                                                        Model model,
                                                        HttpServletRequest request,
                                                        Authentication auth) {

        String username = auth != null ? auth.getName() : "anonymous";
        logger.error("Data integrity violation from user '{}': {}", username, e.getMessage());

        String userMessage = "Възникна конфликт при запазване на данните. " +
                "Възможно е информацията да съществува или да нарушава ограниченията в системата.";

        // Check for common constraint violations
        String rootCause = e.getRootCause() != null ? e.getRootCause().getMessage() : e.getMessage();
        if (rootCause != null) {
            if (rootCause.contains("unique") || rootCause.contains("duplicate")) {
                userMessage = "Записът вече съществува в системата";
            } else if (rootCause.contains("foreign key") || rootCause.contains("constraint")) {
                userMessage = "Не може да се изтрие записа, защото се използва от други данни";
            }
        }

        model.addAttribute("error", userMessage);
        model.addAttribute("statusCode", 409);

        return "error/general";
    }

    /**
     * Handle all other runtime exceptions
     */
    @ExceptionHandler(RuntimeException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public String handleRuntimeException(RuntimeException e,
                                         Model model,
                                         HttpServletRequest request,
                                         Authentication auth) {

        String username = auth != null ? auth.getName() : "anonymous";
        String ipAddress = RequestUtils.getClientIpAddress(request);
        String requestUrl = request.getRequestURI();

        // Log full exception for debugging
        logger.error("Runtime exception for user '{}' from IP '{}' on URL '{}': {}",
                username, ipAddress, requestUrl, e.getMessage(), e);

        // Audit critical errors
        if (auth != null) {
            try {
                auditService.logUserLogin(username, ipAddress,
                        RequestUtils.getUserAgent(request), false);
            } catch (Exception auditException) {
                logger.error("Failed to log audit entry: {}", auditException.getMessage());
            }
        }

        model.addAttribute("error", "Възникна неочаквана грешка при обработката на заявката");
        model.addAttribute("statusCode", 500);

        return "error/general";
    }

    /**
     * Handle all other exceptions as a fallback
     */
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public String handleGenericException(Exception e,
                                         Model model,
                                         HttpServletRequest request,
                                         Authentication auth) {

        String username = auth != null ? auth.getName() : "anonymous";
        String ipAddress = RequestUtils.getClientIpAddress(request);
        String requestUrl = request.getRequestURI();

        // Log full exception for debugging
        logger.error("Unexpected exception for user '{}' from IP '{}' on URL '{}': {}",
                username, ipAddress, requestUrl, e.getMessage(), e);

        model.addAttribute("error", "Възникна системна грешка. Моля опитайте отново или се свържете с поддръжката");
        model.addAttribute("statusCode", 500);

        return "error/general";
    }

    /**
     * Check if request is AJAX request
     */
    private boolean isAjaxRequest(HttpServletRequest request) {
        String xRequestedWith = request.getHeader("X-Requested-With");
        return "XMLHttpRequest".equals(xRequestedWith);
    }
}