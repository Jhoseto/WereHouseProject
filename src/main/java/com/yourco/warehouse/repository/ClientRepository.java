
package com.yourco.warehouse.repository;

import com.yourco.warehouse.entity.Client;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ClientRepository extends JpaRepository<Client, Long> {
    Optional<Client> findByClientCode(String code);
}
