package com.a508.backend.auth.token;

import com.a508.backend.member.domain.Member;
import com.a508.backend.member.domain.MemberRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.SecretKey;
import java.time.Duration;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtConfigTest {

    private JwtConfig jwtConfig;
    private JwtProperties jwtProperties;
    private JwtTokenIssuer jwtTokenIssuer;
    private JwtDecoder jwtDecoder;

    @BeforeEach
    void setUp() {
        jwtConfig =
                new JwtConfig();

        byte[] secretBytes =
                new byte[32];

        String encodedSecret =
                Base64.getEncoder()
                        .encodeToString(secretBytes);

        jwtProperties =
                new JwtProperties(
                        "a508-backend",
                        encodedSecret,
                        Duration.ofMinutes(30),
                        Duration.ofDays(14)
                );

        SecretKey secretKey =
                jwtConfig.serviceJwtSecretKey(
                        jwtProperties
                );

        JwtEncoder jwtEncoder =
                jwtConfig.serviceJwtEncoder(
                        secretKey
                );

        jwtDecoder =
                jwtConfig.serviceJwtDecoder(
                        secretKey,
                        jwtProperties
                );

        jwtTokenIssuer =
                new JwtTokenIssuer(
                        jwtEncoder,
                        jwtProperties
                );
    }

    @Test
    @DisplayName(
            "백엔드가 발급한 Access Token을 검증한다"
    )
    void decodeServiceAccessToken() {
        // given
        Member member =
                createSavedGuest();

        AuthTokens tokens =
                jwtTokenIssuer.issue(member);

        // when
        Jwt jwt =
                jwtDecoder.decode(
                        tokens.accessToken()
                );

        // then
        assertThat(jwt.getSubject())
                .isEqualTo("1");

        assertThat(
                jwt.getClaimAsString("iss")
        ).isEqualTo("a508-backend");

        assertThat(
                jwt.getClaimAsString("role")
        ).isEqualTo(
                MemberRole.GUEST.name()
        );

        assertThat(
                jwt.getClaimAsString("token_type")
        ).isEqualTo("access");
    }

    @Test
    @DisplayName(
            "Refresh Token을 Access Token 인증에 사용할 수 없다"
    )
    void rejectRefreshTokenAsAccessToken() {
        // given
        Member member =
                createSavedGuest();

        AuthTokens tokens =
                jwtTokenIssuer.issue(member);

        // when & then
        assertThatThrownBy(
                () -> jwtDecoder.decode(
                        tokens.refreshToken()
                )
        ).isInstanceOf(
                JwtException.class
        );
    }

    @Test
    @DisplayName(
            "Base64 형식이 아닌 JWT Secret을 거부한다"
    )
    void rejectInvalidBase64Secret() {
        // given
        JwtProperties invalidProperties =
                new JwtProperties(
                        "a508-backend",
                        "not-valid-base64!!!",
                        Duration.ofMinutes(30),
                        Duration.ofDays(14)
                );

        // when & then
        assertThatThrownBy(
                () -> jwtConfig.serviceJwtSecretKey(
                        invalidProperties
                )
        )
                .isInstanceOf(
                        IllegalArgumentException.class
                )
                .hasMessage(
                        "JWT Secret은 올바른 Base64 형식이어야 합니다."
                );
    }

    @Test
    @DisplayName(
            "32바이트보다 짧은 JWT Secret을 거부한다"
    )
    void rejectShortJwtSecret() {
        // given
        byte[] shortSecretBytes =
                new byte[16];

        JwtProperties invalidProperties =
                new JwtProperties(
                        "a508-backend",
                        Base64.getEncoder()
                                .encodeToString(
                                        shortSecretBytes
                                ),
                        Duration.ofMinutes(30),
                        Duration.ofDays(14)
                );

        // when & then
        assertThatThrownBy(
                () -> jwtConfig.serviceJwtSecretKey(
                        invalidProperties
                )
        )
                .isInstanceOf(
                        IllegalArgumentException.class
                )
                .hasMessage(
                        "JWT Secret은 최소 32바이트 이상이어야 합니다."
                );
    }

    private Member createSavedGuest() {
        Member member =
                Member.createGoogleGuest(
                        "google-sub-123"
                );

        ReflectionTestUtils.setField(
                member,
                "id",
                1L
        );

        return member;
    }
}