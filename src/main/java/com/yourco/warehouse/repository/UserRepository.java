
package com.yourco.warehouse.repository;

import com.yourco.warehouse.entity.UserEntity;
import com.yourco.warehouse.entity.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<UserEntity, Long> {
    Optional<UserEntity> findByUsername(String username);

    UserEntity findByEmail(String email);

    List<UserEntity> findAllByRole(Role role);
}
