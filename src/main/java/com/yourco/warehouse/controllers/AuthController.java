package com.yourco.warehouse.controllers;

import com.yourco.warehouse.entity.UserEntity;
import com.yourco.warehouse.entity.enums.Role;
import com.yourco.warehouse.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.rememberme.TokenBasedRememberMeServices;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalTime;
import java.util.Optional;

@Controller
public class AuthController {

    private final UserService userService;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService customUserDetailsService;

    @Autowired
    public AuthController(UserService userService,
                          AuthenticationManager authenticationManager,
                          UserDetailsService customUserDetailsService) {
        this.userService = userService;
        this.authenticationManager = authenticationManager;
        this.customUserDetailsService = customUserDetailsService;
    }

    /**
     * Показва login страницата (GET заявка)
     */
    @GetMapping("/login")
    public String showLoginPage(Model model,
                                @RequestParam(value = "error", required = false) String error,
                                @RequestParam(value = "logout", required = false) String logout) {

        if (error != null) {
            model.addAttribute("errorMessage", "Невалидни данни за вход. Моля проверете потребителското име и паролата.");
            model.addAttribute("errorTitle", "Неуспешен вход");
        }

        if (logout != null) {
            model.addAttribute("successMessage", "Успешно излязохте от системата. До скоро!");
            model.addAttribute("successTitle", "Довиждане");
        }

        return "index";
    }

    /**
     * Обработва login формата (POST заявка) - ENHANCED с remember-me
     */
    @PostMapping("/login")
    public String processLogin(@RequestParam String username,
                               @RequestParam String password,
                               @RequestParam String role,
                               @RequestParam(required = false) String rememberMe,
                               HttpServletRequest request,
                               HttpServletResponse response,
                               RedirectAttributes redirectAttributes) {

        // Валидация на input данните
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

        try {
            // Проверка дали потребителят съществува и е активен
            Optional<UserEntity> userOptional = userService.findUserByUsername(username.trim());

            if (userOptional.isEmpty()) {
                redirectAttributes.addFlashAttribute("errorMessage",
                        "Потребител с име '" + username + "' не съществува в системата. Моля проверете правописа или се свържете с администратор за създаване на акаунт.");
                redirectAttributes.addFlashAttribute("errorTitle", "Потребителят не съществува");
                return "redirect:/";
            }

            UserEntity user = userOptional.get();

            if (!user.isActive()) {
                redirectAttributes.addFlashAttribute("errorMessage",
                        "Акаунтът ви е временно деактивиран. За повече информация се свържете с администратор на системата.");
                redirectAttributes.addFlashAttribute("errorTitle", "Деактивиран акаунт");
                return "redirect:/";
            }

            // Автентикация чрез Spring Security AuthenticationManager
            UsernamePasswordAuthenticationToken authRequest =
                    new UsernamePasswordAuthenticationToken(username.trim(), password);

            Authentication authentication = authenticationManager.authenticate(authRequest);

            // Задаваме authentication в SecurityContext
            SecurityContextHolder.getContext().setAuthentication(authentication);

            // Remember-me functionality
            if (rememberMe != null && "on".equals(rememberMe)) {
                try {
                    TokenBasedRememberMeServices rememberMeServices = new TokenBasedRememberMeServices(
                            "SunnyComersSecretKey2025",  // Същия ключ
                            customUserDetailsService
                    );
                    rememberMeServices.loginSuccess(request, response, authentication);
                } catch (Exception e) {
                    System.out.println("Грешка при задаване на remember-me: " + e.getMessage());
                    // Не прекъсваме login-а заради remember-me грешка
                }
            }

            // Персонализирано съобщение за успешно влизане
            String welcomeMessage = getPersonalizedWelcomeMessage(user);
            String welcomeTitle = getGreetingByTime() + ", " + user.getUsername();

            redirectAttributes.addFlashAttribute("successMessage", welcomeMessage);
            redirectAttributes.addFlashAttribute("successTitle", welcomeTitle);

            // Пренасочване според ролята на потребителя
            if (user.getRole().equals(Role.ADMIN) || user.getRole().equals(Role.EMPLOYER)) {
                return "redirect:/admin/dashboard";
            } else {
                return "redirect:/catalog";
            }

        } catch (BadCredentialsException e) {
            redirectAttributes.addFlashAttribute("errorMessage",
                    "Паролата за потребител '" + username + "' не е правилна. Моля опитайте отново или се свържете с администратор ако сте забравили паролата си.");
            redirectAttributes.addFlashAttribute("errorTitle", "Грешна парола");
            return "redirect:/";

        } catch (DisabledException e) {
            redirectAttributes.addFlashAttribute("errorMessage",
                    "Акаунтът ви е деактивиран от администратор. За повече информация се свържете с IT отдела.");
            redirectAttributes.addFlashAttribute("errorTitle", "Блокиран достъп");
            return "redirect:/";

        } catch (Exception e) {
            System.out.println("BACKEND ERROR в AuthController.processLogin(): " + e.getMessage());
            e.printStackTrace();

            redirectAttributes.addFlashAttribute("errorMessage",
                    "Възникна неочаквана техническа грешка. Моля опитайте отново след няколко секунди или се свържете с техническа поддръжка.");
            redirectAttributes.addFlashAttribute("errorTitle", "Системна грешка");
            return "redirect:/";
        }
    }

    @GetMapping("/access-denied")
    public String accessDenied(Model model) {
        model.addAttribute("errorMessage", "Нямате необходимите права за достъп до този ресурс. Ако смятате че това е грешка, свържете се с администратор.");
        model.addAttribute("errorTitle", "Забранен достъп");
        return "error/access-denied";
    }

    @PostMapping("/auth/validate-user")
    public String validateUser(@RequestParam String username,
                               RedirectAttributes redirectAttributes) {
        try {
            Optional<UserEntity> userOpt = userService.findUserByUsername(username);

            if (userOpt.isEmpty()) {
                redirectAttributes.addFlashAttribute("errorMessage",
                        "Потребителят с име '" + username + "' не е намерен в системата. Моля проверете правописа.");
                redirectAttributes.addFlashAttribute("errorTitle", "Потребителят не съществува");
                return "redirect:/login";
            }

            UserEntity user = userOpt.get();

            if (!user.isActive()) {
                redirectAttributes.addFlashAttribute("errorMessage",
                        "Акаунтът е деактивиран. За повече информация се свържете с администратор.");
                redirectAttributes.addFlashAttribute("errorTitle", "Деактивиран акаунт");
                System.out.println("Опит за влизане с деактивиран акаунт: " + username);
                return "redirect:/login";
            }

            redirectAttributes.addFlashAttribute("infoMessage",
                    "Потребителят '" + username + "' е валиден. Можете да въведете паролата си за да влезете.");
            redirectAttributes.addFlashAttribute("infoTitle", "Валиден потребител");

        } catch (Exception e) {
            System.out.println("Грешка при проверка на потребител: " + username + " - " + e.getMessage());
            redirectAttributes.addFlashAttribute("errorMessage",
                    "Възникна грешка при проверката на потребителя. Моля опитайте отново.");
            redirectAttributes.addFlashAttribute("errorTitle", "Грешка при проверка");
        }

        return "redirect:/";
    }

    // ==========================================
    // HELPER МЕТОДИ ЗА ПЕРСОНАЛИЗИРАНИ СЪОБЩЕНИЯ
    // ==========================================

    /**
     * Генерира персонализирано съобщение за добре дошли според ролята на потребителя
     */
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

    /**
     * Връща подходящо поздравление според часа от денонощието
     */
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