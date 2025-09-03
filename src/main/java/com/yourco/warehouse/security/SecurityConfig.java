package com.yourco.warehouse.security;


import com.yourco.warehouse.repository.UserRepository;
import com.yourco.warehouse.service.CustomUserDetailsService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
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
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {



    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http,
                                           LogoutSuccessHandler logoutSuccessHandler) throws Exception {
        http
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/css/**", "/js/**", "/images/**", "/favicon.ico")
                        .permitAll()
                        .requestMatchers("/", "/login", "/error").permitAll() // Добавен /login
                        .requestMatchers("/actuator/health").permitAll()
                        .requestMatchers("/admin/**").hasAnyRole("ADMIN", "EMPLOYER")
                        .requestMatchers("/catalog", "/api/**").hasRole("CLIENT") // CLIENT endpoints
                        .anyRequest().authenticated()
                )
                // ПРЕМАХНАТО: .formLogin() конфигурацията за да работи custom AuthController
                .logout(logout -> logout
                        .logoutRequestMatcher(new AntPathRequestMatcher("/logout"))
                        .logoutSuccessHandler(logoutSuccessHandler)
                        .invalidateHttpSession(true)
                        .clearAuthentication(true)
                        .deleteCookies("JSESSIONID")
                        .permitAll()
                )
                .sessionManagement(session -> session
                        .sessionFixation().migrateSession()
                        .sessionCreationPolicy(SessionCreationPolicy.ALWAYS)
                )
                .headers(headers -> headers
                        .httpStrictTransportSecurity(HeadersConfigurer.HstsConfig::disable)
                        .contentTypeOptions(Customizer.withDefaults())
                )
                .csrf(csrf -> csrf
                        .ignoringRequestMatchers("/h2-console/**") // Development only
                );
        return http.build();
    }


    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public DaoAuthenticationProvider authProvider(CustomUserDetailsService uds, PasswordEncoder encoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(uds);
        provider.setPasswordEncoder(encoder);
        return provider;
    }

}