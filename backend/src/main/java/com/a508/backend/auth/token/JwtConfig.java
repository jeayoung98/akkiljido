package com.a508.backend.auth.token;

import com.a508.backend.member.domain.MemberRole;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.util.StringUtils;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;
import java.util.Set;

@Configuration
public class JwtConfig {

    private static final Set<String> ALLOWED_ROLES =
            Set.of(
                    MemberRole.GUEST.name(),
                    MemberRole.USER.name()
            );

    @Bean
    public SecretKey serviceJwtSecretKey(
            JwtProperties properties
    ) {
        byte[] secretBytes;

        try {
            secretBytes =
                    Base64.getDecoder().decode(
                            properties.secret()
                    );
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException(
                    "JWT Secret은 올바른 Base64 형식이어야 합니다.",
                    exception
            );
        }

        if (secretBytes.length < 32) {
            throw new IllegalArgumentException(
                    "JWT Secret은 최소 32바이트 이상이어야 합니다."
            );
        }

        return new SecretKeySpec(
                secretBytes,
                "HmacSHA256"
        );
    }

    @Bean
    public JwtEncoder serviceJwtEncoder(
            SecretKey serviceJwtSecretKey
    ) {
        return NimbusJwtEncoder
                .withSecretKey(serviceJwtSecretKey)
                .algorithm(MacAlgorithm.HS256)
                .build();
    }

    @Bean
    public JwtDecoder serviceJwtDecoder(
            SecretKey serviceJwtSecretKey,
            JwtProperties properties
    ) {
        NimbusJwtDecoder decoder =
                NimbusJwtDecoder
                        .withSecretKey(
                                serviceJwtSecretKey
                        )
                        .macAlgorithm(
                                MacAlgorithm.HS256
                        )
                        .build();

        OAuth2TokenValidator<Jwt> defaultValidator =
                JwtValidators.createDefaultWithIssuer(
                        properties.issuer()
                );

        OAuth2TokenValidator<Jwt> subjectValidator =
                new JwtClaimValidator<String>(
                        "sub",
                        StringUtils::hasText
                );

        OAuth2TokenValidator<Jwt> roleValidator =
                new JwtClaimValidator<String>(
                        "role",
                        ALLOWED_ROLES::contains
                );

        OAuth2TokenValidator<Jwt> accessTokenValidator =
                new JwtClaimValidator<String>(
                        "token_type",
                        "access"::equals
                );

        decoder.setJwtValidator(
                new DelegatingOAuth2TokenValidator<>(
                        defaultValidator,
                        subjectValidator,
                        roleValidator,
                        accessTokenValidator
                )
        );

        return decoder;
    }
}