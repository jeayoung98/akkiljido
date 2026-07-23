package com.a508.backend.auth.service;

import com.a508.backend.auth.dto.GoogleLoginResult;
import com.a508.backend.auth.google.GoogleIdTokenValidator;
import com.a508.backend.auth.google.GoogleIdentity;
import com.a508.backend.auth.token.AuthTokens;
import com.a508.backend.auth.token.RefreshTokenService;
import com.a508.backend.auth.token.TokenIssuer;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.member.domain.Member;
import com.a508.backend.member.domain.MemberRole;
import com.a508.backend.member.domain.OAuthProvider;
import com.a508.backend.member.repository.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
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
class GoogleAuthServiceTest {

    @Mock
    private GoogleIdTokenValidator googleIdTokenValidator;

    @Mock
    private MemberRepository memberRepository;

    private GoogleAuthService googleAuthService;

    @Mock
    private TokenIssuer tokenIssuer;

    @Mock
    private RefreshTokenService refreshTokenService;

    @BeforeEach
    void setUp() {
        googleAuthService =
                new GoogleAuthService(
                        googleIdTokenValidator,
                        memberRepository,
                        tokenIssuer,
                        refreshTokenService
                );
    }

    @Test
    @DisplayName("Google 계정에 연결된 기존 회원을 반환한다")
    void returnExistingMember() {
        // given
        String rawIdToken = "test-google-id-token";
        String providerSub = "google-sub-123";

        GoogleIdentity googleIdentity =
                new GoogleIdentity(providerSub);

        Member existingMember =
                Member.createGoogleGuest(providerSub);

        given(
                googleIdTokenValidator.validate(rawIdToken)
        ).willReturn(googleIdentity);

        given(
                memberRepository.findByProviderAndProviderSub(
                        OAuthProvider.GOOGLE,
                        providerSub
                )
        ).willReturn(Optional.of(existingMember));

        AuthTokens issuedTokens =
                new AuthTokens(
                        "test-access-token",
                        "test-refresh-token",
                        1800L,
                        Instant.parse(
                                "2026-08-06T00:00:00Z"
                        )
                );

        given(
                tokenIssuer.issue(existingMember)
        ).willReturn(issuedTokens);

        // when
        GoogleLoginResult result =
                googleAuthService.authenticate(rawIdToken);

        // then
        assertThat(result.role())
                .isEqualTo(MemberRole.GUEST);

        assertThat(result.nicknameRequired())
                .isTrue();

        assertThat(result.tokens())
                .isSameAs(issuedTokens);

        verify(memberRepository, never())
                .save(any(Member.class));

        verify(tokenIssuer)
                .issue(existingMember);

        verify(refreshTokenService)
                .saveOrReplace(
                        existingMember,
                        issuedTokens.refreshToken(),
                        issuedTokens.refreshTokenExpiresAt()
                );
    }

    @Test
    @DisplayName("Google 계정에 연결된 회원이 없으면 GUEST 회원을 생성한다")
    void createGuestWhenMemberDoesNotExist() {
        // given
        String rawIdToken = "test-google-id-token";
        String providerSub = "google-sub-123";

        GoogleIdentity googleIdentity =
                new GoogleIdentity(providerSub);

        given(
                googleIdTokenValidator.validate(rawIdToken)
        ).willReturn(googleIdentity);

        given(
                memberRepository.findByProviderAndProviderSub(
                        OAuthProvider.GOOGLE,
                        providerSub
                )
        ).willReturn(Optional.empty());

        given(
                memberRepository.save(any(Member.class))
        ).willAnswer(
                invocation -> invocation.getArgument(0)
        );

        AuthTokens issuedTokens =
                new AuthTokens(
                        "test-access-token",
                        "test-refresh-token",
                        1800L,
                        Instant.parse(
                                "2026-08-06T00:00:00Z"
                        )
                );

        given(
                tokenIssuer.issue(any(Member.class))
        ).willReturn(issuedTokens);

        // when
        GoogleLoginResult result =
                googleAuthService.authenticate(rawIdToken);

        // then
        assertThat(result.role())
                .isEqualTo(MemberRole.GUEST);

        assertThat(result.nicknameRequired())
                .isTrue();

        assertThat(result.tokens())
                .isSameAs(issuedTokens);

        verify(memberRepository)
                .save(any(Member.class));

        verify(tokenIssuer)
                .issue(any(Member.class));

        verify(refreshTokenService)
                .saveOrReplace(
                        any(Member.class),
                        eq(issuedTokens.refreshToken()),
                        eq(issuedTokens.refreshTokenExpiresAt())
                );
    }

    @Test
    @DisplayName("Google ID 토큰 검증이 실패하면 인증 예외를 전달한다")
    void propagateExceptionWhenIdTokenIsInvalid() {
        // given
        String invalidIdToken = "invalid-google-id-token";

        BusinessException expectedException =
                new BusinessException(
                        ExceptionType.INVALID_GOOGLE_ID_TOKEN
                );

        given(
                googleIdTokenValidator.validate(invalidIdToken)
        ).willThrow(expectedException);

        // when & then
        assertThatThrownBy(
                () -> googleAuthService.authenticate(invalidIdToken)
        )
                .isSameAs(expectedException);

        verify(memberRepository, never())
                .findByProviderAndProviderSub(
                        any(OAuthProvider.class),
                        any(String.class)
                );

        verify(memberRepository, never())
                .save(any(Member.class));

        verify(tokenIssuer, never())
                .issue(any(Member.class));

        verify(refreshTokenService, never())
                .saveOrReplace(
                        any(Member.class),
                        any(String.class),
                        any(Instant.class)
                );
    }
}
