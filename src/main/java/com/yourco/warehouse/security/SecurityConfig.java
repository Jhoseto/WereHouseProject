package com.yourco.warehouse.security;

import com.yourco.warehouse.service.KeyGenerator;
import jakarta.servlet.Filter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.logout.LogoutSuccessHandler;
import org.springframework.security.web.authentication.rememberme.TokenBasedRememberMeServices;

import java.util.Collection;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    private final UserDetailsService customUserDetailsService;
    private final LogoutSuccessHandler customLogoutSuccessHandler;

    @Autowired
    public SecurityConfig(UserDetailsService customUserDetailsService,
                          LogoutSuccessHandler customLogoutSuccessHandler) {
        this.customUserDetailsService = customUserDetailsService;
        this.customLogoutSuccessHandler = customLogoutSuccessHandler;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http,
                                           LogoutSuccessHandler logoutSuccessHandler) throws Exception {
        http
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/css/**", "/js/**", "/images/**", "/favicon.ico")
                        .permitAll()
                        .requestMatchers("/", "/login", "/error").permitAll()
                        .requestMatchers("/actuator/health").permitAll()
                        .requestMatchers("/admin/**").hasAnyRole("ADMIN", "EMPLOYER")
                        .requestMatchers("/catalog", "/api/**").authenticated()
                        .anyRequest().authenticated()
                )
                .exceptionHandling(ex -> ex
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            request.setAttribute("errorMessage", "❌ Нямате достъп до това съдържание! Само администратори.");
                            request.getRequestDispatcher("/error/general").forward(request, response);
                        })
                        .authenticationEntryPoint((request, response, authException) -> {
                            request.setAttribute("errorMessage", "🔒 Моля, влезте в профила си, за да продължите.");
                            request.getRequestDispatcher("/error/general").forward(request, response);
                        })
                )
                .rememberMe(rememberMe -> rememberMe
                        .key(rememberMeKey())
                        .rememberMeParameter("remember-me")
                        .userDetailsService(customUserDetailsService)
                        .useSecureCookie(true)
                )
                .sessionManagement(session -> session
                        .sessionFixation().migrateSession()
                        .sessionCreationPolicy(SessionCreationPolicy.ALWAYS)

                )
                .logout(logout -> logout
                        .logoutUrl("/logout")
                        .logoutSuccessHandler(customLogoutSuccessHandler)
                        .invalidateHttpSession(true)
                        .deleteCookies("JSESSIONID", "remember-me", "XSRF-TOKEN")
                        .permitAll()
                )
                .headers(headers -> headers
                        .httpStrictTransportSecurity(HeadersConfigurer.HstsConfig::disable)
                        .contentTypeOptions(Customizer.withDefaults())
                )
                .csrf(csrf -> csrf
                        .ignoringRequestMatchers("/images/**", "/css/**", "/js/**")
                );
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }


    @Bean
    public String rememberMeKey() {
        return KeyGenerator.generateKey();
    }

    @Bean
    public TokenBasedRememberMeServices tokenBasedRememberMeServices() {
        return new TokenBasedRememberMeServices(rememberMeKey(), customUserDetailsService);
    }

    @Bean
    public FilterRegistrationBean<Filter> cookieAttributeFilterRegistration() {
        FilterRegistrationBean<Filter> registration = new FilterRegistrationBean<>();
        registration.setFilter(cookieAttributeFilter());
        registration.addUrlPatterns("/*");
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return registration;
    }


    @Bean
    public Filter cookieAttributeFilter() {
        return (request, response, chain) -> {
            chain.doFilter(request, response);

            if (response instanceof HttpServletResponse resp) {
                Collection<String> headers = resp.getHeaders("Set-Cookie");
                if (!headers.isEmpty()) {
                    resp.setHeader("Set-Cookie", null); // премахваме старите

                    for (String header : headers) {
                        String updatedHeader = header;

                        boolean isSecureRequest = request.isSecure() || request.getServerName().contains("smolyanvote.com");

                        if (isSecureRequest && !header.toLowerCase().contains("secure")) {
                            updatedHeader += "; Secure";
                        }

                        if (!header.toLowerCase().contains("httponly") && !header.startsWith("XSRF-TOKEN")) {
                            updatedHeader += "; HttpOnly";
                        }

                        if (!header.toLowerCase().contains("samesite")) {
                            updatedHeader += "; SameSite=Lax";
                        }

                        resp.addHeader("Set-Cookie", updatedHeader);
                    }
                }
            }
        };
    }
}