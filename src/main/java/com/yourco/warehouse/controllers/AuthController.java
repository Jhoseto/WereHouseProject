package com.yourco.warehouse.controllers;

import com.yourco.warehouse.dto.UserLoginDto;
import com.yourco.warehouse.entity.UserEntity;
import com.yourco.warehouse.entity.enums.Role;
import com.yourco.warehouse.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.WebAttributes;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.time.Instant;
import java.util.Optional;

@Controller
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    private final UserService userService;

    @Autowired
    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/login")
    public String login(@Valid @ModelAttribute("userModel") UserLoginDto userModel,
                        RedirectAttributes redirectAttributes,
                        HttpServletResponse response,
                        HttpServletRequest request) {

        Optional<UserEntity> userOptional = userService.findUserByUsername(userModel.getUsername());

        if (userOptional.isEmpty()) {
            redirectAttributes.addFlashAttribute("error", "Невалидено Име ! : " + userModel.getUsername());
            return "redirect:/index";
        }

        UserEntity user = userOptional.get();

        if (!userService.checkPassword(user, userModel.getPassword())) {
            redirectAttributes.addFlashAttribute("error", "Грешна парола!");
            return "redirect:/index";
        }

        Authentication authentication = userService.authenticateUser(userModel.getUsername(), userModel.getPassword());

        if (authentication != null) {
            // 1. Set в SecurityContextHolder
            SecurityContextHolder.getContext().setAuthentication(authentication);

            request.getSession().setAttribute(
                    HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                    SecurityContextHolder.getContext()
            );


            if (user.getRole().equals(Role.ADMIN) || user.getRole().equals(Role.EMPLOYER)) {
                return "redirect:/admin/dashboard";
            } else {
                return "redirect:/catalog";
            }
        }
        return "index";
    }

    @GetMapping("/access-denied")
    public String accessDenied(Model model) {
        model.addAttribute("error", "Нямате права за достъп до този ресурс");
        return "error/access-denied";
    }

    @PostMapping("/auth/validate-user")
    public String validateUser(@RequestParam String username,
                               RedirectAttributes redirectAttributes) {
        try {
            Optional<UserEntity> userOpt = userService.findUserByUsername(username);

            if (userOpt.isEmpty()) {
                redirectAttributes.addFlashAttribute("error",
                        "Потребителят с име '" + username + "' не съществува в системата");
                return "redirect:/login";
            }

            UserEntity user = userOpt.get();

            if (!user.isActive()) {
                redirectAttributes.addFlashAttribute("error",
                        "Акаунтът е деактивиран. Свържете се с администратор");
                logger.warn("Опит за влизане с деактивиран акаунт: {}", username);
                return "redirect:/login";
            }

            redirectAttributes.addFlashAttribute("info",
                    "Потребителят е валиден. Можете да въведете паролата си");

        } catch (Exception e) {
            logger.error("Грешка при проверка на потребител: {}", username, e);
            redirectAttributes.addFlashAttribute("error",
                    "Възникна грешка при проверката. Опитайте отново");
        }

        return "redirect:/login?username=" + username;
    }

    /**
     * Пренасочване на автентифицирани потребители според ролята им
     */
    private String redirectAuthenticatedUser(Authentication auth) {
        String role = auth.getAuthorities().iterator().next().getAuthority();

        switch (role) {
            case "ROLE_ADMIN":
            case "ROLE_EMPLOYER":
                logger.info("Пренасочване на администратор: {}", auth.getName());
                return "redirect:/admin";
            case "ROLE_CLIENT":
                logger.info("Пренасочване на клиент: {}", auth.getName());
                return "redirect:/catalog";
            default:
                logger.warn("Неразпозната роля за потребител {}: {}", auth.getName(), role);
                return "redirect:/";
        }
    }

    /**
     * Обработка на грешки при неуспешно влизане
     */
    private void handleLoginError(String username, String message, Model model, HttpServletRequest request) {
        String errorMessage = "Невалидно потребителско име или парола";

        // Получаване на по-подробна информация за грешката от Spring Security
        Exception securityException = (Exception) request.getSession()
                .getAttribute(WebAttributes.AUTHENTICATION_EXCEPTION);

        if (securityException != null) {
            String exceptionMessage = securityException.getMessage();
            logger.debug("Security exception: {}", exceptionMessage);

            // Проверяваме дали потребителят съществува в базата
            if (username != null && !username.trim().isEmpty()) {
                Optional<UserEntity> userOpt = userService.findUserByUsername(username.trim());

                if (userOpt.isEmpty()) {
                    errorMessage = "Потребителят не съществува в системата";
                    logger.warn("Опит за влизане с несъществуващ потребител: {}", username);
                } else {
                    UserEntity user = userOpt.get();
                    if (!user.isActive()) {
                        errorMessage = "Акаунтът е деактивиран. Свържете се с администратор";
                        logger.warn("Опит за влизане с деактивиран акаунт: {}", username);
                    } else {
                        errorMessage = "Неправилна парола";
                        logger.warn("Неправилна парола за потребител: {}", username);
                    }
                }
            }
        }

        // Използваме съобщението от URL параметъра, ако е налично
        if (message != null && !message.trim().isEmpty()) {
            errorMessage = message;
        }

        model.addAttribute("errorMessage", errorMessage);
        model.addAttribute("username", username); // Запазваме username-а в полето
    }

    /**
     * Проверява дали приложението работи в development режим
     */
    private boolean isDevelopmentMode() {
        // Можете да използвате @Value("${spring.profiles.active}") за по-прецизна проверка
        return true; // За сега винаги показваме демо креденциалите
    }
}