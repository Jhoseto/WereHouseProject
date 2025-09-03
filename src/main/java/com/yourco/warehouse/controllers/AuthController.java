package com.yourco.warehouse.controllers;

import com.yourco.warehouse.dto.UserLoginDto;
import com.yourco.warehouse.entity.UserEntity;
import com.yourco.warehouse.entity.enums.Role;
import com.yourco.warehouse.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.Optional;

@Controller
public class AuthController {

    private final UserService userService;

    @Autowired
    public AuthController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Показва login страницата (GET заявка)
     */
    @GetMapping("/login")
    public String showLoginPage(Model model,
                                @RequestParam(value = "error", required = false) String error,
                                @RequestParam(value = "logout", required = false) String logout) {

        if (error != null) {
            model.addAttribute("errorMessage", "Невалидно потребителско име или парола");
        }

        if (logout != null) {
            model.addAttribute("logoutMessage", "Успешно излязохте от системата");
        }

        return "index";
    }

    /**
     * Обработва login формата (POST заявка)
     */
    @PostMapping("/login")
    public String processLogin(@Valid @ModelAttribute("userModel") UserLoginDto userModel,
                               RedirectAttributes redirectAttributes,
                               HttpServletRequest request) {

        String username = userModel.getUsername();
        String password = userModel.getPassword();

        // Проверка дали полетата са попълнени
        if (username == null || username.trim().isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Моля въведете потребителско име");
            return "redirect:/";
        }

        if (password == null || password.trim().isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Моля въведете парола");
            return "redirect:/";
        }

        try {
            // Проверка дали потребителят съществува
            Optional<UserEntity> userOptional = userService.findUserByUsername(username.trim());

            if (userOptional.isEmpty()) {
                redirectAttributes.addFlashAttribute("errorMessage",
                        "Потребител с име '" + username + "' не съществува в системата");
                return "redirect:/";
            }

            UserEntity user = userOptional.get();

            // Проверка дали акаунтът е активен
            if (!user.isActive()) {
                redirectAttributes.addFlashAttribute("errorMessage",
                        "Акаунтът е деактивиран. Свържете се с администратор");
                return "redirect:/";
            }

            // Проверка на паролата
            if (!userService.checkPassword(user, password)) {
                redirectAttributes.addFlashAttribute("errorMessage",
                        "Грешна парола за потребител '" + username + "'");
                return "redirect:/";
            }

            // Автентикация на потребителя
            Authentication authentication = userService.authenticateUser(username, password);

            if (authentication != null) {
                // Задаване на автентикацията в SecurityContext
                SecurityContextHolder.getContext().setAuthentication(authentication);

                // Запазване в сесията
                request.getSession().setAttribute(
                        HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                        SecurityContextHolder.getContext()
                );

                // Съобщение за успешно влизане
                redirectAttributes.addFlashAttribute("successMessage",
                        "Добре дошли, " + username + "!");

                // Пренасочване според ролята
                if (user.getRole().equals(Role.ADMIN) || user.getRole().equals(Role.EMPLOYER)) {
                    return "redirect:/admin/dashboard";
                } else {
                    return "redirect:/catalog";
                }
            } else {
                // ПРИ НЕУСПЕШНА АВТЕНТИКАЦИЯ - връщаме към login с грешка
                redirectAttributes.addFlashAttribute("errorMessage",
                        "Грешка при автентикация. Моля опитайте отново или се свържете с администратор");
                return "redirect:/";
            }

        } catch (Exception e) {
            // Само backend грешки се принтират
            System.out.println("BACKEND ERROR в AuthController.processLogin(): " + e.getMessage());
            e.printStackTrace();

            redirectAttributes.addFlashAttribute("errorMessage",
                    "Възникна техническа грешка. Моля опитайте отново след малко");
            return "redirect:/";
        }
    }

    @GetMapping("/access-denied")
    public String accessDenied(Model model) {
        model.addAttribute("errorMessage", "Нямате права за достъп до този ресурс");
        return "error/access-denied";
    }

    @PostMapping("/auth/validate-user")
    public String validateUser(@RequestParam String username,
                               RedirectAttributes redirectAttributes) {
        try {
            Optional<UserEntity> userOpt = userService.findUserByUsername(username);

            if (userOpt.isEmpty()) {
                redirectAttributes.addFlashAttribute("errorMessage",
                        "Потребителят с име '" + username + "' не съществува в системата");
                return "redirect:/login";
            }

            UserEntity user = userOpt.get();

            if (!user.isActive()) {
                redirectAttributes.addFlashAttribute("errorMessage",
                        "Акаунтът е деактивиран. Свържете се с администратор");
                System.out.println("Опит за влизане с деактивиран акаунт: {}"+ username);
                return "redirect:/login";
            }

            redirectAttributes.addFlashAttribute("info",
                    "Потребителят е валиден. Можете да въведете паролата си");

        } catch (Exception e) {
            System.out.println("Грешка при проверка на потребител: {}"+ username+ e);
            redirectAttributes.addFlashAttribute("errorMessage",
                    "Възникна грешка при проверката. Опитайте отново");
        }

        return "redirect:/";
    }
}