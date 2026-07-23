package com.a508.backend.auth.google;

import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import java.util.List;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class GoogleIdTokenValidatorImplTest {

    @Mock
    private JwtDecoder googleIdTokenDecoder;

    private GoogleIdTokenValidatorImpl validator;

    @BeforeEach
    void setUp() {
        validator =
                new GoogleIdTokenValidatorImpl(
                        googleIdTokenDecoder
                );
    }

    @Test
    @DisplayName("검증된 Google JWT를 사용자 프로필로 변환한다")
    void convertValidatedJwtToGoogleUserProfile() {
        // given
        String rawIdToken = "test-google-id-token";

        Instant issuedAt = Instant.now();
        Instant expiresAt = issuedAt.plusSeconds(3600);

        Jwt jwt = Jwt.withTokenValue(rawIdToken)
                .header("alg", "RS256")
                .issuer("https://accounts.google.com")
                .audience(
                        List.of("test-google-client-id")
                )
                .subject("google-sub-123")
                .issuedAt(issuedAt)
                .expiresAt(expiresAt)
                .build();

        given(
                googleIdTokenDecoder.decode(rawIdToken)
        ).willReturn(jwt);

        // when
        GoogleIdentity result =
                validator.validate(rawIdToken);

        // then
        assertThat(result.subject())
                .isEqualTo("google-sub-123");

        verify(googleIdTokenDecoder)
                .decode(rawIdToken);
    }

    @Test
    @DisplayName("ID Token이 비어 있으면 인증 예외가 발생한다")
    void rejectBlankIdToken() {
        assertThatThrownBy(
                () -> validator.validate(" ")
        )
                .isInstanceOf(BusinessException.class)
                .satisfies(exception -> {
                    BusinessException businessException =
                            (BusinessException) exception;

                    assertThat(
                            businessException.getExceptionType()
                    ).isEqualTo(
                            ExceptionType.INVALID_GOOGLE_ID_TOKEN
                    );
                });
    }

    @Test
    @DisplayName("JWT 검증에 실패하면 인증 예외로 변환한다")
    void convertJwtExceptionToBusinessException() {
        // given
        String invalidToken = "invalid-google-id-token";

        given(
                googleIdTokenDecoder.decode(invalidToken)
        ).willThrow(
                new JwtException("JWT verification failed")
        );

        // when & then
        assertThatThrownBy(
                () -> validator.validate(invalidToken)
        )
                .isInstanceOf(BusinessException.class)
                .satisfies(exception -> {
                    BusinessException businessException =
                            (BusinessException) exception;

                    assertThat(
                            businessException.getExceptionType()
                    ).isEqualTo(
                            ExceptionType.INVALID_GOOGLE_ID_TOKEN
                    );
                });
    }

    @Test
    @DisplayName("검증된 JWT에 sub가 없으면 인증 예외가 발생한다")
    void rejectJwtWithoutSubject() {
        // given
        String rawIdToken = "token-without-subject";

        Instant issuedAt = Instant.now();
        Instant expiresAt = issuedAt.plusSeconds(3600);

        Jwt jwt = Jwt.withTokenValue(rawIdToken)
                .header("alg", "RS256")
                .issuer("https://accounts.google.com")
                .issuedAt(issuedAt)
                .expiresAt(expiresAt)
                .build();

        given(
                googleIdTokenDecoder.decode(rawIdToken)
        ).willReturn(jwt);

        // when & then
        assertThatThrownBy(
                () -> validator.validate(rawIdToken)
        )
                .isInstanceOf(BusinessException.class);
    }
}