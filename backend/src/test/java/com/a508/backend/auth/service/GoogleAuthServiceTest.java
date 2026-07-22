package com.a508.backend.auth.service;

import com.a508.backend.auth.google.GoogleIdTokenValidator;
import com.a508.backend.auth.google.GoogleUserProfile;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class GoogleAuthServiceTest {

    @Mock
    private GoogleIdTokenValidator googleIdTokenValidator;

    private GoogleAuthService googleAuthService;

    @BeforeEach
    void setUp() {
        googleAuthService =
                new GoogleAuthService(googleIdTokenValidator);
    }

    @Test
    @DisplayName("Google ID Token을 검증하고 사용자 프로필을 반환한다")
    void authenticateWithGoogleIdToken() {
        // given
        String rawIdToken = "test-google-id-token";

        GoogleUserProfile expectedProfile =
                new GoogleUserProfile(
                        "google-sub-123",
                        "test@gmail.com",
                        true,
                        "테스트 사용자",
                        "https://example.com/profile.png"
                );

        given(
                googleIdTokenValidator.validate(rawIdToken)
        ).willReturn(expectedProfile);

        // when
        GoogleUserProfile actualProfile =
                googleAuthService.authenticate(rawIdToken);

        // then
        assertThat(actualProfile)
                .isEqualTo(expectedProfile);

        verify(googleIdTokenValidator)
                .validate(rawIdToken);
    }

    @Test
    @DisplayName("Google ID Token 검증이 실패하면 예외를 전달한다")
    void throwExceptionWhenGoogleIdTokenIsInvalid() {
        // given
        String invalidIdToken = "invalid-google-id-token";

        given(
                googleIdTokenValidator.validate(invalidIdToken)
        ).willThrow(
                new IllegalArgumentException(
                        "유효하지 않은 Google ID Token입니다."
                )
        );

        // when & then
        assertThatThrownBy(
                () -> googleAuthService.authenticate(invalidIdToken)
        )
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage(
                        "유효하지 않은 Google ID Token입니다."
                );

        verify(googleIdTokenValidator)
                .validate(invalidIdToken);
    }
}