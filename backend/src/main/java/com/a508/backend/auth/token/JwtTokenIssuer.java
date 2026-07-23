package com.a508.backend.auth.token;

import com.a508.backend.member.domain.Member;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.oauth2.jose.jws.JwsAlgorithm;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Component
public class JwtTokenIssuer implements TokenIssuer {

    private static final JwsAlgorithm SIGNATURE_ALGORITHM =
            MacAlgorithm.HS256;

    private final JwtEncoder jwtEncoder;
    private final JwtProperties properties;

    public JwtTokenIssuer(
            @Qualifier("serviceJwtEncoder")
            JwtEncoder jwtEncoder,
            JwtProperties properties
    ) {
        this.jwtEncoder = jwtEncoder;
        this.properties = properties;
    }

    @Override
    public AuthTokens issue(Member member) {
        if (member.getId() == null) {
            throw new IllegalStateException(
                    "JWT 발급 전에 회원이 저장되어야 합니다."
            );
        }

        Instant issuedAt = Instant.now()
                .truncatedTo(
                        ChronoUnit.SECONDS
                );

        Instant accessTokenExpiresAt =
                issuedAt.plus(
                        properties.accessTokenTtl()
                );

        Instant refreshTokenExpiresAt =
                issuedAt.plus(
                        properties.refreshTokenTtl()
                );


        String accessToken =
                createToken(
                        member,
                        issuedAt,
                        accessTokenExpiresAt,
                        "access"
                );

        String refreshToken =
                createToken(
                        member,
                        issuedAt,
                        refreshTokenExpiresAt,
                        "refresh"
                );

        return new AuthTokens(
                accessToken,
                refreshToken,
                properties.accessTokenTtl().toSeconds(),
                refreshTokenExpiresAt
        );
    }

    private String createToken(
            Member member,
            Instant issuedAt,
            Instant expiresAt,
            String tokenType
    ) {
        JwtClaimsSet claims =
                JwtClaimsSet.builder()
                        .issuer(properties.issuer())
                        .subject(member.getId().toString())
                        .issuedAt(issuedAt)
                        .expiresAt(expiresAt)
                        .id(UUID.randomUUID().toString())
                        .claim(
                                "role",
                                member.getRole().name()
                        )
                        .claim(
                                "token_type",
                                tokenType
                        )
                        .build();

        JwsHeader header =
                JwsHeader
                        .with(SIGNATURE_ALGORITHM)
                        .build();

        return jwtEncoder
                .encode(
                        JwtEncoderParameters.from(
                                header,
                                claims
                        )
                )
                .getTokenValue();
    }
}