package com.a508.backend.auth.token;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

@Configuration
public class JwtConfig {

    @Bean
    public JwtEncoder serviceJwtEncoder(
            JwtProperties properties
    ) {
        byte[] secretBytes =
                Base64.getDecoder().decode(
                        properties.secret()
                );

        if (secretBytes.length < 32) {
            throw new IllegalArgumentException(
                    "JWT Secret은 최소 32바이트 이상이어야 합니다."
            );
        }

        SecretKey secretKey =
                new SecretKeySpec(
                        secretBytes,
                        "HmacSHA256"
                );

        return NimbusJwtEncoder
                .withSecretKey(secretKey)
                .algorithm(MacAlgorithm.HS256)
                .build();
    }
}