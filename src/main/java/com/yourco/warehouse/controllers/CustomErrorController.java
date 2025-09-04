package com.yourco.warehouse.controllers;

import com.yourco.warehouse.exception.AccessDeniedException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RequestMapping;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;

@Controller
public class CustomErrorController implements ErrorController {

    private static final Logger logger = LoggerFactory.getLogger(CustomErrorController.class);
    private static final String ERROR_PROCESSING_ATTR = "ERROR_HANDLER_PROCESSING";

    @RequestMapping("/error")
    public String handleError(HttpServletRequest request, Model model) {
        // ЗАЩИТА СРЕЩУ БЕЗКРАЙНА РЕКУРСИЯ
        if (request.getAttribute(ERROR_PROCESSING_ATTR) != null) {
            logger.error("Recursive error detected in error handler - returning simple error page");
            model.addAttribute("error", "Критична системна грешка");
            model.addAttribute("statusCode", 500);
            return "error/general";
        }

        request.setAttribute(ERROR_PROCESSING_ATTR, true);

        try {
            return handleErrorSafely(request, model);
        } catch (Exception e) {
            logger.error("Critical error in error handler", e);
            model.addAttribute("error", "Възникна критична грешка в системата");
            model.addAttribute("statusCode", 500);
            return "error/general";
        } finally {
            request.removeAttribute(ERROR_PROCESSING_ATTR);
        }
    }

    private String handleErrorSafely(HttpServletRequest request, Model model) {
        Object status = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        String errorMessage = "Възникна неочаквана грешка";
        String errorTemplate = "error/general";

        if (status != null) {
            try {
                int statusCode = Integer.parseInt(status.toString());

                switch (statusCode) {
                    case 400:
                        errorMessage = "Невалидна заявка";
                        errorTemplate = "error/400";
                        break;
                    case 401:
                        errorMessage = "Необходимо е да влезете в системата";
                        errorTemplate = "error/401";
                        break;
                    case 403:
                        errorMessage = "Нямате права за достъп до този ресурс";
                        errorTemplate = "error/access-denied";
                        break;
                    case 404:
                        errorMessage = "Страницата не е намерена";
                        errorTemplate = "error/404";
                        break;
                    case 500:
                        errorMessage = "Вътрешна грешка на сървъра";
                        errorTemplate = "error/500";
                        break;
                    default:
                        errorMessage = "Грешка " + statusCode;
                        break;
                }

                model.addAttribute("statusCode", statusCode);
            } catch (NumberFormatException e) {
                logger.warn("Invalid status code format: {}", status);
                model.addAttribute("statusCode", 500);
            }
        }

        model.addAttribute("error", errorMessage);

        // Получаване на оригиналния URL който е причинил грешката
        String originalUrl = (String) request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI);
        if (originalUrl != null) {
            model.addAttribute("originalUrl", originalUrl);
        }

        logger.warn("Error occurred: status={}, url={}, message={}",
                status, originalUrl, errorMessage);

        return errorTemplate;
    }

    @ExceptionHandler(AccessDeniedException.class)
    public String handleAccessDeniedException(AccessDeniedException e, Model model) {
        logger.warn("Access denied: {}", e.getMessage());
        model.addAttribute("error", e.getMessage());
        model.addAttribute("statusCode", 403);
        return "error/access-denied";
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public String handleIllegalArgumentException(IllegalArgumentException e, Model model) {
        logger.warn("Invalid argument: {}", e.getMessage());
        model.addAttribute("error", "Невалидни данни: " + e.getMessage());
        model.addAttribute("statusCode", 400);
        return "error/general";
    }

    @ExceptionHandler(IllegalStateException.class)
    public String handleIllegalStateException(IllegalStateException e, Model model) {
        logger.warn("Invalid state: {}", e.getMessage());
        model.addAttribute("error", "Невалидна операция: " + e.getMessage());
        model.addAttribute("statusCode", 400);
        return "error/general";
    }

    @ExceptionHandler(Exception.class)
    public String handleGenericException(Exception e, Model model) {
        logger.error("Unexpected error occurred", e);
        model.addAttribute("error", "Възникна неочаквана грешка. Моля, опитайте отново.");
        model.addAttribute("statusCode", 500);
        return "error/general";
    }
}