package com.yourco.warehouse.service;

import com.yourco.warehouse.entity.UserEntity;
import com.yourco.warehouse.entity.enums.UserStatus;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Optional;

public interface UserService {

    Authentication authenticateUser(String username, String password);

    Optional<UserEntity> findUserByEmail(String email);

    Optional<UserEntity> findUserByUsername(String username);


    UserEntity getCurrentUser();


    //CREATE NEW CLIENT
    UserEntity createNewClient(String username, String email, String plainPassword,
                         String companyName, String phone, String location);

    long getTotalEmployersCount();

    long getTotalClientsCount();

    List<UserEntity> getAllClientUsers();

    Optional<UserEntity> findUserById(Long id);

    String updateUserStatus(UserEntity client, UserStatus userOldStatus);

    // ==========================================
    // EMPLOYER MANAGEMENT METHODS
    // ==========================================

    /**
     * Създава нов служител в системата
     * @param username Потребителско име (уникално)
     * @param email Email адрес (уникален, задължителен)
     * @param plainPassword Парола в plain text (ще се enkripti)
     * @param phone Телефонен номер (задължителен)
     * @param location Локация (незадължителна)
     * @return Създадения UserEntity с Role.EMPLOYER
     * @throws IllegalArgumentException при невалидни данни или ако username/email съществуват
     */
    UserEntity createNewEmployer(String username, String email, String plainPassword,
                                 String phone, String location);

    /**
     * Връща списък с всички служители в системата
     * @return List от UserEntity обекти с Role.EMPLOYER
     */
    List<UserEntity> getAllEmployerUsers();

    /**
     * Търси служител по ID
     * @param id ID на служителя
     * @return Optional с UserEntity ако е намерен и е служител, или празен Optional
     */
    Optional<UserEntity> findEmployerById(Long id);

    /**
     * Брои общия брой служители в системата
     * @return Брой служители с Role.EMPLOYER
     */
    long countAllEmployers();
}
