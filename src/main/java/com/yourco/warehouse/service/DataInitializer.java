
package com.yourco.warehouse.service;

import com.yourco.warehouse.domain.entity.Client;
import com.yourco.warehouse.domain.entity.Product;
import com.yourco.warehouse.domain.entity.User;
import com.yourco.warehouse.domain.enums.Role;
import com.yourco.warehouse.repository.ClientRepository;
import com.yourco.warehouse.repository.ProductRepository;
import com.yourco.warehouse.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ClientRepository clientRepository;
    private final ProductRepository productRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository, ClientRepository clientRepository,
                           ProductRepository productRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.clientRepository = clientRepository;
        this.productRepository = productRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public void run(String... args) {
        if(userRepository.count() == 0){
            // demo client
            Client c = new Client();
            c.setClientCode("C001");
            c.setName("Demo Client");
            c.setEmail("client@example.com");
            c.setPhone("+359000000");
            clientRepository.save(c);

            // users
            User admin = new User();
            admin.setUsername("admin");
            admin.setPasswordHash(passwordEncoder.encode("admin123"));
            admin.setRole(Role.ADMIN);
            admin.setActive(true);
            userRepository.save(admin);

            User client = new User();
            client.setUsername("client1");
            client.setPasswordHash(passwordEncoder.encode("client123"));
            client.setRole(Role.CLIENT);
            client.setActive(true);
            client.setClient(c);
            userRepository.save(client);

            // products
            for (int i=1;i<=8;i++){
                Product p = new Product();
                p.setSku("P%03d".formatted(i));
                p.setName("Продукт " + i);
                p.setUnit("pcs");
                p.setPrice(new BigDecimal("10.0").add(new BigDecimal(i)));
                p.setVatRate(20);
                p.setActive(true);
                productRepository.save(p);
            }
        }
    }
}
