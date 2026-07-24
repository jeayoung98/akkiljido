package com.a508.backend.member.service;

import com.a508.backend.auth.token.AuthTokens;
import com.a508.backend.auth.token.RefreshTokenService;
import com.a508.backend.auth.token.TokenIssuer;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.member.domain.Member;
import com.a508.backend.member.domain.MemberRole;
import com.a508.backend.member.dto.NicknameRegistrationResult;
import com.a508.backend.member.repository.MemberRepository;
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
class MemberRegistrationServiceTest {

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private TokenIssuer tokenIssuer;

    @Mock
    private RefreshTokenService refreshTokenService;

    private MemberRegistrationService
            memberRegistrationService;

    @BeforeEach
    void setUp() {
        memberRegistrationService =
                new MemberRegistrationService(
                        memberRepository,
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
        Long memberId = 1L;

        Member guest =
                createSavedGuest(memberId);

        AuthTokens issuedTokens =
                createAuthTokens();

        given(
                memberRepository.findById(memberId)
        ).willReturn(
                Optional.of(guest)
        );

        given(
                tokenIssuer.issue(guest)
        ).willReturn(issuedTokens);

        // when
        NicknameRegistrationResult result =
                memberRegistrationService
                        .completeRegistration(
                                memberId,
                                "  홍길동  "
                        );

        // then
        assertThat(guest.getNickname())
                .isEqualTo("홍길동");

        assertThat(guest.getRole())
                .isEqualTo(MemberRole.USER);

        assertThat(result.nickname())
                .isEqualTo("홍길동");

        assertThat(result.role())
                .isEqualTo(MemberRole.USER);

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
    void rejectMissingMember() {
        // given
        Long memberId = 999L;

        given(
                memberRepository.findById(memberId)
        ).willReturn(
                Optional.empty()
        );

        // when & then
        assertThatThrownBy(
                () -> memberRegistrationService
                        .completeRegistration(
                                memberId,
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
                .issue(any(Member.class));

        verify(refreshTokenService, never())
                .saveOrReplace(
                        any(Member.class),
                        any(String.class),
                        any(Instant.class)
                );
    }

    @Test
    @DisplayName(
            "이미 USER인 회원은 닉네임 등록을 다시 수행할 수 없다"
    )
    void rejectAlreadyRegisteredMember() {
        // given
        Long memberId = 1L;

        Member user =
                createSavedGuest(memberId);

        user.completeRegistration(
                "기존닉네임"
        );

        given(
                memberRepository.findById(memberId)
        ).willReturn(
                Optional.of(user)
        );

        // when & then
        assertThatThrownBy(
                () -> memberRegistrationService
                        .completeRegistration(
                                memberId,
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
                .isEqualTo(MemberRole.USER);

        verify(tokenIssuer, never())
                .issue(any(Member.class));

        verify(refreshTokenService, never())
                .saveOrReplace(
                        any(Member.class),
                        any(String.class),
                        any(Instant.class)
                );
    }

    private Member createSavedGuest(
            Long memberId
    ) {
        Member member =
                Member.createGoogleGuest(
                        "google-sub-123"
                );

        ReflectionTestUtils.setField(
                member,
                "id",
                memberId
        );

        return member;
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