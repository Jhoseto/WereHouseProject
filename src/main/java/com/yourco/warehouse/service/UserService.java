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
}
