package com.a508.backend.user.service;

import com.a508.backend.auth.token.AuthTokens;
import com.a508.backend.auth.token.RefreshTokenService;
import com.a508.backend.auth.token.TokenIssuer;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.user.domain.User;
import com.a508.backend.user.domain.UserRole;
import com.a508.backend.user.dto.NicknameRegistrationResult;
import com.a508.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class UserRegistrationServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private TokenIssuer tokenIssuer;

    @Mock
    private RefreshTokenService refreshTokenService;

    private UserRegistrationService
            userRegistrationService;

    @BeforeEach
    void setUp() {
        userRegistrationService =
                new UserRegistrationService(
                        userRepository,
                        tokenIssuer,
                        refreshTokenService
                );
    }

    @Test
    @DisplayName(
            "GUEST가 닉네임을 설정하면 USER로 변경하고 새 토큰을 발급한다"
    )
    void completeGuestRegistration() {
        // given
        Long userId = 1L;

        User guest =
                createSavedGuest(userId);

        AuthTokens issuedTokens =
                createAuthTokens();

        given(
                userRepository.findById(userId)
        ).willReturn(
                Optional.of(guest)
        );

        given(
                tokenIssuer.issue(guest)
        ).willReturn(issuedTokens);

        // when
        NicknameRegistrationResult result =
                userRegistrationService
                        .completeRegistration(
                                userId,
                                "  홍길동  "
                        );

        // then
        assertThat(guest.getNickname())
                .isEqualTo("홍길동");

        assertThat(guest.getRole())
                .isEqualTo(UserRole.USER);

        assertThat(result.nickname())
                .isEqualTo("홍길동");

        assertThat(result.role())
                .isEqualTo(UserRole.USER);

        assertThat(result.tokens())
                .isSameAs(issuedTokens);

        verify(tokenIssuer)
                .issue(guest);

        verify(refreshTokenService)
                .saveOrReplace(
                        guest,
                        issuedTokens.refreshToken(),
                        issuedTokens.refreshTokenExpiresAt()
                );
    }

    @Test
    @DisplayName(
            "존재하지 않는 회원은 닉네임을 설정할 수 없다"
    )
    void rejectMissingUser() {
        // given
        Long userId = 999L;

        given(
                userRepository.findById(userId)
        ).willReturn(
                Optional.empty()
        );

        // when & then
        assertThatThrownBy(
                () -> userRegistrationService
                        .completeRegistration(
                                userId,
                                "홍길동"
                        )
        )
                .isInstanceOf(
                        BusinessException.class
                )
                .satisfies(exception -> {
                    BusinessException businessException =
                            (BusinessException) exception;

                    assertThat(
                            businessException.getExceptionType()
                    ).isEqualTo(
                            ExceptionType.UNAUTHENTICATED
                    );
                });

        verify(tokenIssuer, never())
                .issue(any(User.class));

        verify(refreshTokenService, never())
                .saveOrReplace(
                        any(User.class),
                        any(String.class),
                        any(Instant.class)
                );
    }

    @Test
    @DisplayName(
            "이미 USER인 회원은 닉네임 등록을 다시 수행할 수 없다"
    )
    void rejectAlreadyRegisteredUser() {
        // given
        Long userId = 1L;

        User user =
                createSavedGuest(userId);

        user.completeRegistration(
                "기존닉네임"
        );

        given(
                userRepository.findById(userId)
        ).willReturn(
                Optional.of(user)
        );

        // when & then
        assertThatThrownBy(
                () -> userRegistrationService
                        .completeRegistration(
                                userId,
                                "새닉네임"
                        )
        )
                .isInstanceOf(
                        BusinessException.class
                )
                .satisfies(exception -> {
                    BusinessException businessException =
                            (BusinessException) exception;

                    assertThat(
                            businessException.getExceptionType()
                    ).isEqualTo(
                            ExceptionType.AUTHORIZATION_DENIED
                    );
                });

        assertThat(user.getNickname())
                .isEqualTo("기존닉네임");

        assertThat(user.getRole())
                .isEqualTo(UserRole.USER);

        verify(tokenIssuer, never())
                .issue(any(User.class));

        verify(refreshTokenService, never())
                .saveOrReplace(
                        any(User.class),
                        any(String.class),
                        any(Instant.class)
                );
    }

    private User createSavedGuest(
            Long userId
    ) {
        User user =
                User.createGoogleGuest(
                        "google-sub-123"
                );

        ReflectionTestUtils.setField(
                user,
                "id",
                userId
        );

        return user;
    }

    private AuthTokens createAuthTokens() {
        return new AuthTokens(
                "test-user-access-token",
                "test-user-refresh-token",
                1800L,
                Instant.parse(
                        "2026-08-07T00:00:00Z"
                )
        );
    }
}