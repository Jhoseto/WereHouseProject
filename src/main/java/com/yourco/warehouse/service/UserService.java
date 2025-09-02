package com.yourco.warehouse.service;

import com.yourco.warehouse.dto.UserProfileViewModel;
import com.yourco.warehouse.entity.UserEntity;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Optional;

public interface UserService {

    Authentication authenticateUser(String email, String password);

    Optional<UserEntity> findUserByEmail(String email);

    Optional<UserEntity> findUserByUsername(String username);

    boolean checkPassword(UserEntity user, String rawPassword);

    List<UserProfileViewModel> getAllUsers();

    UserEntity getCurrentUser();


    void deleteUser(Long userId);


    UserProfileViewModel getUserByUsername(String userName);

    //CREATE NEW USER
    void createNewUser(UserEntity userEntity);

}
