package com.a508.backend.auth.service;

import com.a508.backend.auth.dto.TokenReissueResult;
import com.a508.backend.auth.token.AuthTokens;
import com.a508.backend.auth.token.RefreshTokenService;
import com.a508.backend.auth.token.RefreshTokenValidator;
import com.a508.backend.auth.token.TokenIssuer;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.member.domain.Member;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class TokenReissueServiceTest {

    @Mock
    private RefreshTokenValidator
            refreshTokenValidator;

    @Mock
    private RefreshTokenService
            refreshTokenService;

    @Mock
    private MemberRepository
            memberRepository;

    @Mock
    private TokenIssuer
            tokenIssuer;

    private TokenReissueService
            tokenReissueService;

    @BeforeEach
    void setUp() {
        tokenReissueService =
                new TokenReissueService(
                        refreshTokenValidator,
                        refreshTokenService,
                        memberRepository,
                        tokenIssuer
                );
    }

    @Test
    @DisplayName(
            "유효한 Refresh Token으로 새 Access Token과 Refresh Token을 발급한다"
    )
    void reissueTokens() {
        // given
        String oldRefreshToken =
                "old-refresh-token";

        Long memberId = 1L;

        Member member =
                createSavedMember(memberId);

        AuthTokens newTokens =
                createNewAuthTokens();

        given(
                refreshTokenValidator
                        .validateAndExtractMemberId(
                                oldRefreshToken
                        )
        ).willReturn(memberId);

        given(
                memberRepository.findById(memberId)
        ).willReturn(
                Optional.of(member)
        );

        given(
                tokenIssuer.issue(member)
        ).willReturn(newTokens);

        // when
        TokenReissueResult result =
                tokenReissueService.reissue(
                        oldRefreshToken
                );

        // then
        assertThat(result.tokens())
                .isSameAs(newTokens);

        verify(refreshTokenValidator)
                .validateAndExtractMemberId(
                        oldRefreshToken
                );

        verify(refreshTokenService)
                .verifyStoredToken(
                        eq(memberId),
                        eq(oldRefreshToken),
                        any(Instant.class)
                );

        verify(memberRepository)
                .findById(memberId);

        verify(tokenIssuer)
                .issue(member);

        verify(refreshTokenService)
                .saveOrReplace(
                        member,
                        newTokens.refreshToken(),
                        newTokens.refreshTokenExpiresAt()
                );
    }

    @Test
    @DisplayName(
            "Refresh Token의 회원이 존재하지 않으면 재발급을 거부한다"
    )
    void rejectMissingMember() {
        // given
        String rawRefreshToken =
                "test-refresh-token";

        Long memberId = 999L;

        given(
                refreshTokenValidator
                        .validateAndExtractMemberId(
                                rawRefreshToken
                        )
        ).willReturn(memberId);

        given(
                memberRepository.findById(memberId)
        ).willReturn(
                Optional.empty()
        );

        // when & then
        assertInvalidRefreshToken(
                () -> tokenReissueService.reissue(
                        rawRefreshToken
                )
        );

        verify(refreshTokenService)
                .verifyStoredToken(
                        eq(memberId),
                        eq(rawRefreshToken),
                        any(Instant.class)
                );

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
            "Refresh Token JWT 검증에 실패하면 이후 처리를 수행하지 않는다"
    )
    void rejectInvalidRefreshTokenBeforeDatabaseAccess() {
        // given
        String invalidRefreshToken =
                "invalid-refresh-token";

        BusinessException expectedException =
                new BusinessException(
                        ExceptionType.INVALID_REFRESH_TOKEN
                );

        given(
                refreshTokenValidator
                        .validateAndExtractMemberId(
                                invalidRefreshToken
                        )
        ).willThrow(expectedException);

        // when & then
        assertThatThrownBy(
                () -> tokenReissueService.reissue(
                        invalidRefreshToken
                )
        ).isSameAs(expectedException);

        verify(refreshTokenService, never())
                .verifyStoredToken(
                        any(Long.class),
                        any(String.class),
                        any(Instant.class)
                );

        verify(memberRepository, never())
                .findById(any(Long.class));

        verify(tokenIssuer, never())
                .issue(any(Member.class));

        verify(refreshTokenService, never())
                .saveOrReplace(
                        any(Member.class),
                        any(String.class),
                        any(Instant.class)
                );
    }

    private void assertInvalidRefreshToken(
            Runnable action
    ) {
        assertThatThrownBy(action::run)
                .isInstanceOf(
                        BusinessException.class
                )
                .satisfies(exception -> {
                    BusinessException businessException =
                            (BusinessException) exception;

                    assertThat(
                            businessException
                                    .getExceptionType()
                    ).isEqualTo(
                            ExceptionType
                                    .INVALID_REFRESH_TOKEN
                    );
                });
    }

    private Member createSavedMember(
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

    private AuthTokens createNewAuthTokens() {
        return new AuthTokens(
                "new-access-token",
                "new-refresh-token",
                1800L,
                Instant.parse(
                        "2026-08-07T00:00:00Z"
                )
        );
    }
}