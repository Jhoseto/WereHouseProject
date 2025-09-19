package com.yourco.warehouse.service.impl;

import com.yourco.warehouse.dto.UserProfileDTO;
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

    @Override
    public boolean checkPassword(UserEntity user, String rawPassword) {

        return passwordEncoder.matches(rawPassword, user.getPasswordHash());
    }

    @Override
    public List<UserProfileDTO> getAllUsers() {
        // TODO: Implement this method
        return List.of();
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
    public void deleteUser(Long userId) {
        // TODO: Implement this method
    }

    @Override
    public UserProfileDTO getUserByUsername(String userName) {
        // TODO: Implement this method
        return null;
    }

    @Override
    public void createNewUser(UserEntity userEntity) {
        // TODO: Implement this method
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