package com.yourco.warehouse.controllers;

import com.yourco.warehouse.entity.UserEntity;
import com.yourco.warehouse.entity.enums.Role;
import com.yourco.warehouse.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.rememberme.TokenBasedRememberMeServices;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.time.LocalTime;
import java.util.Optional;

@Controller
public class AuthController {

    private final UserService userService;
    private final TokenBasedRememberMeServices rememberMeServices;

    @Autowired
    public AuthController(UserService userService,
                          TokenBasedRememberMeServices rememberMeServices) {
        this.userService = userService;
        this.rememberMeServices = rememberMeServices;
    }

    /**
     * НАПЪЛНО CUSTOM LOGIN ЛОГИКА
     */
    @PostMapping("/login")
    public String processLogin(@RequestParam String username,
                               @RequestParam String password,
                               @RequestParam String role,
                               @RequestParam(required = false) String rememberMe,
                               HttpServletRequest request,
                               HttpServletResponse response,
                               RedirectAttributes redirectAttributes) {

        // 1. ВАЛИДАЦИЯ НА INPUT
        if (username == null || username.trim().isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Моля въведете потребителското си име за да продължите.");
            redirectAttributes.addFlashAttribute("errorTitle", "Липсва потребителско име");
            return "redirect:/";
        }

        if (password == null || password.trim().isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Моля въведете паролата си за да влезете в системата.");
            redirectAttributes.addFlashAttribute("errorTitle", "Липсва парола");
            return "redirect:/";
        }

        // 2. НАМИРАНЕ НА ПОТРЕБИТЕЛЯ ЗА ПРОВЕРКИ
        Optional<UserEntity> userOptional = userService.findUserByUsername(username.trim());

        if (userOptional.isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage",
                    "Потребител с име '" + username + "' не съществува в системата. " +
                            "Моля проверете правописа или се свържете с администратор за създаване на акаунт.");
            redirectAttributes.addFlashAttribute("errorTitle", "Потребителят не съществува");
            return "redirect:/";
        }

        UserEntity user = userOptional.get();

        // 3. ПРОВЕРКА ДАЛИ Е АКТИВЕН
        if (!user.isActive()) {
            redirectAttributes.addFlashAttribute("errorMessage",
                    "Акаунтът ви е временно деактивиран. За повече информация се свържете с администратор на системата. " +
                            "Ако смятате че това е грешка, изпратете email на support@sunnycomers.bg с вашето потребителско име.");
            redirectAttributes.addFlashAttribute("errorTitle", "Деактивиран акаунт");

            // Логваме опита за влизане с деактивиран акаунт
            System.out.println("SECURITY WARNING: Опит за влизане с деактивиран акаунт: " + username);
            return "redirect:/";
        }

        // 4. ПРОВЕРКА НА РОЛЯТА (опционално)
        if (!role.equals("CLIENT") && !role.equals("EMPLOYER")) {
            redirectAttributes.addFlashAttribute("errorMessage", "Невалидна роля за влизане.");
            redirectAttributes.addFlashAttribute("errorTitle", "Грешка в системата");
            return "redirect:/";
        }

        // 5. АВТЕНТИКАЦИЯ
        try {
            Authentication authentication = userService.authenticateUser(username, password);

            if (authentication == null) {
                redirectAttributes.addFlashAttribute("errorMessage",
                        "Паролата за потребител '" + username + "' не е правилна. " +
                                "Моля опитайте отново или се свържете с администратор ако сте забравили паролата си. " +
                                "За reset на парола изпратете email на support@sunnycomers.bg");
                redirectAttributes.addFlashAttribute("errorTitle", "Грешна парола");

                // Логваме неуспешния опит
                System.out.println("SECURITY WARNING: Неуспешен опит за влизане с грешна парола: " + username);

                return "redirect:/";
            }else {
                SecurityContextHolder.getContext().setAuthentication(authentication);

                request.getSession().setAttribute(
                        HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                        SecurityContextHolder.getContext()
                );

                if (rememberMe != null && !rememberMe.isEmpty()) {
                    rememberMeServices.loginSuccess(request, response, authentication);
                }
                String welcomeMessage = getPersonalizedWelcomeMessage(user);
                String welcomeTitle = getGreetingByTime() + ", " + user.getUsername();

                redirectAttributes.addFlashAttribute("successMessage", welcomeMessage);
                redirectAttributes.addFlashAttribute("successTitle", welcomeTitle);
                System.out.println("SUCCESS: Потребител " + username + " е автентикиран успешно!");

                if (user.getRole().equals(Role.ADMIN) || user.getRole().equals(Role.EMPLOYER)) {
                    return "redirect:/employer/dashboard";
                } else {
                    return "redirect:/catalog";
                }

            }

        } catch (Exception e) {
            System.out.println("ГРЕШКА при автентикация: " + e.getMessage());

            // Специфични съобщения според exception-а
            if (e.getMessage().contains("деактивиран")) {
                redirectAttributes.addFlashAttribute("errorMessage",
                        "Акаунтът ви е деактивиран от администратор. За повече информация се свържете с IT отдела.");
                redirectAttributes.addFlashAttribute("errorTitle", "Блокиран достъп");
            } else {
                redirectAttributes.addFlashAttribute("errorMessage",
                        "Паролата за потребител '" + username + "' не е правилна. " +
                                "Моля опитайте отново или се свържете с администратор ако сте забравили паролата си. " +
                                "За reset на парола изпратете email на support@sunnycomers.bg");
                redirectAttributes.addFlashAttribute("errorTitle", "Грешна парола");
            }
            return "redirect:/";
        }
    }

    // HELPER МЕТОДИ ОСТАВАТ СЪЩИТЕ
    private String getPersonalizedWelcomeMessage(UserEntity user) {
        String baseMessage = "Успешно влязохте в системата. ";

        switch (user.getRole()) {
            case ADMIN:
                return baseMessage + "Имате пълен достъп до административния панел и всички функции на системата.";
            case EMPLOYER:
                return baseMessage + "Можете да управлявате поръчки, клиенти и продукти от служебния панел.";
            case CLIENT:
                return baseMessage + "Можете да разглеждате каталога с продукти и да правите поръчки.";
            default:
                return baseMessage + "Добре дошли в SmolyanVote системата!";
        }
    }

    private String getGreetingByTime() {
        LocalTime now = LocalTime.now();
        int hour = now.getHour();

        if (hour >= 5 && hour < 12) {
            return "Добро утро";
        } else if (hour >= 12 && hour < 17) {
            return "Добър ден";
        } else if (hour >= 17 && hour < 22) {
            return "Добър вечер";
        } else {
            return "Добра нощ";
        }
    }
}