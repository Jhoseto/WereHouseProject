package com.yourco.warehouse.service;

import java.security.SecureRandom;
import java.util.Base64;

public class KeyGenerator {

    private static final int KEY_LENGTH = 32; // Length of the key in bytes

    /**
     * Generates a random key of specified length.
     *
     * @return String representing the generated key encoded in Base64.
     */
    public static String generateKey() {
        SecureRandom secureRandom = new SecureRandom();
        byte[] keyBytes = new byte[KEY_LENGTH];
        secureRandom.nextBytes(keyBytes);
        return Base64.getEncoder().encodeToString(keyBytes);
    }
}