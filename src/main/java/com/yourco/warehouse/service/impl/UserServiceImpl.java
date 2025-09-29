package com.yourco.warehouse.service.impl;

import com.yourco.warehouse.entity.UserEntity;
import com.yourco.warehouse.entity.enums.Role;
import com.yourco.warehouse.entity.enums.UserStatus;
import com.yourco.warehouse.repository.UserRepository;
import com.yourco.warehouse.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserDetailsService userDetailsService;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public UserServiceImpl(UserRepository userRepository,
                           UserDetailsService userDetailsService,
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.userDetailsService = userDetailsService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public Authentication authenticateUser(String username, String password) {
        UserDetails userDetails = userDetailsService.loadUserByUsername(username);

        if (userDetails != null && passwordEncoder.matches(password, userDetails.getPassword())) {
            Authentication authentication = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
            SecurityContextHolder.getContext().setAuthentication(authentication);
            return authentication;
        }
        return null;
    }

    @Override
    public Optional<UserEntity> findUserByEmail(String email) {
        UserEntity user = userRepository.findByEmail(email);
        return Optional.ofNullable(user);
    }

    @Override
    public Optional<UserEntity> findUserByUsername(String username) {

        return userRepository.findByUsername(username);
    }



    @Transactional
    public UserEntity getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            String username = authentication.getName();
            Optional<UserEntity> userOptional = userRepository.findByUsername(username);
            if (userOptional.isPresent()) {
                return userOptional.get();
            } else {
                // Ако не е намерен по username, търсим по email
                Optional<UserEntity> userByEmailOptional = Optional.ofNullable(userRepository.findByEmail(username));
                return userByEmailOptional.orElse(null);
            }
        }
        return null;
    }


    @Override
    @Transactional
    public UserEntity createNewClient(String username, String email, String plainPassword,
                                      String companyName, String phone, String location) {

        // Само uniqueness checks
        if (findUserByUsername(username).isPresent()) {
            throw new IllegalArgumentException("Потребителското име вече съществува");
        }

        if (findUserByEmail(email).isPresent()) {
            throw new IllegalArgumentException("Email адресът вече се използва");
        }

        // Създаване и запис
        UserEntity newClient = new UserEntity();
        // Trim za  data normalization и избягване на space  в username i email
        newClient.setUsername(username.trim());
        newClient.setEmail(email.trim().toLowerCase());

        newClient.setCompanyName(companyName != null ? companyName.trim() : null);
        newClient.setPhone(phone);
        newClient.setLocation(location);
        newClient.setRole(Role.CLIENT);
        newClient.setUserStatus(UserStatus.ACTIVE);
        newClient.setPasswordHash(passwordEncoder.encode(plainPassword));

        // Timestamps - explicit и ясно точно тук
        LocalDateTime now = LocalDateTime.now();
        newClient.setCreatedAt(now);
        newClient.setUpdatedAt(now);

        return userRepository.save(newClient);
    }

    @Override
    @Transactional
    public long getTotalEmployersCount() {
        return userRepository.findAllByRole(Role.EMPLOYER).size();
    }

    @Override
    @Transactional
    public long getTotalClientsCount() {
        return userRepository.findAllByRole(Role.CLIENT).size();
    }

    @Override
    public List<UserEntity> getAllClientUsers() {
        return userRepository.getAllByRole(Role.CLIENT);
    }

    @Override
    public Optional<UserEntity> findUserById(Long id) {
        return userRepository.findById(id);
    }

    @Override
    public String updateUserStatus(UserEntity client, UserStatus userOldStatus) {
        if (client.getUserStatus().equals(UserStatus.ACTIVE)){
            client.setUserStatus(UserStatus.INACTIVE);
            userRepository.save(client);
            return "деактивиран";
        }
        client.setUserStatus(UserStatus.ACTIVE);
        userRepository.save(client);
        return "активиран";
    }

}