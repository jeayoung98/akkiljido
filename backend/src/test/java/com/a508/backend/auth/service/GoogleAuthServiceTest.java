package com.a508.backend.auth.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;
import static org.mockito.Mockito.*;

import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.a508.backend.auth.dto.LoginResult;
import com.a508.backend.auth.google.GoogleIdTokenValidator;
import com.a508.backend.auth.google.GoogleIdentity;
import com.a508.backend.auth.token.AuthTokens;
import com.a508.backend.auth.token.RefreshTokenService;
import com.a508.backend.auth.token.TokenIssuer;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.user.domain.OAuthProvider;
import com.a508.backend.user.domain.User;
import com.a508.backend.user.domain.UserRole;
import com.a508.backend.user.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class GoogleAuthServiceTest {

	@Mock
	private GoogleIdTokenValidator googleIdTokenValidator;

	@Mock
	private UserRepository userRepository;

	private GoogleAuthService googleAuthService;

	@Mock
	private TokenIssuer tokenIssuer;

	@Mock
	private RefreshTokenService refreshTokenService;

	@BeforeEach
	void setUp() {
		googleAuthService = new GoogleAuthService(googleIdTokenValidator, userRepository, tokenIssuer,
			refreshTokenService);
	}

	@Test
	@DisplayName("Google 계정에 연결된 기존 회원을 반환한다")
	void returnExistingUser() {
		// given
		String rawIdToken = "test-google-id-token";
		String providerSub = "google-sub-123";

		GoogleIdentity googleIdentity = new GoogleIdentity(providerSub);

		User existingUser = User.createGoogleGuest(providerSub);

		given(googleIdTokenValidator.validate(rawIdToken)).willReturn(googleIdentity);

		given(userRepository.findByProviderAndProviderSub(OAuthProvider.GOOGLE, providerSub)).willReturn(
			Optional.of(existingUser));

		AuthTokens issuedTokens = new AuthTokens("test-access-token", "test-refresh-token", 1800L,
			Instant.parse("2026-08-06T00:00:00Z"));

		given(tokenIssuer.issue(existingUser)).willReturn(issuedTokens);

		// when
		LoginResult result = googleAuthService.authenticate(rawIdToken);

		// then
		assertThat(result.role()).isEqualTo(UserRole.GUEST);


		assertThat(result.tokens()).isSameAs(issuedTokens);

		verify(userRepository, never()).save(any(User.class));

		verify(tokenIssuer).issue(existingUser);

		verify(refreshTokenService).saveOrReplace(existingUser, issuedTokens.refreshToken(),
			issuedTokens.refreshTokenExpiresAt());
	}

	@Test
	@DisplayName("Google 계정에 연결된 회원이 없으면 GUEST 회원을 생성한다")
	void createGuestWhenUserDoesNotExist() {
		// given
		String rawIdToken = "test-google-id-token";
		String providerSub = "google-sub-123";

		GoogleIdentity googleIdentity = new GoogleIdentity(providerSub);

		given(googleIdTokenValidator.validate(rawIdToken)).willReturn(googleIdentity);

		given(userRepository.findByProviderAndProviderSub(OAuthProvider.GOOGLE, providerSub)).willReturn(
			Optional.empty());

		given(userRepository.save(any(User.class))).willAnswer(invocation -> invocation.getArgument(0));

		AuthTokens issuedTokens = new AuthTokens("test-access-token", "test-refresh-token", 1800L,
			Instant.parse("2026-08-06T00:00:00Z"));

		given(tokenIssuer.issue(any(User.class))).willReturn(issuedTokens);

		// when
		LoginResult result = googleAuthService.authenticate(rawIdToken);

		// then
		assertThat(result.role()).isEqualTo(UserRole.GUEST);


		assertThat(result.tokens()).isSameAs(issuedTokens);

		verify(userRepository).save(any(User.class));

		verify(tokenIssuer).issue(any(User.class));

		verify(refreshTokenService).saveOrReplace(any(User.class), eq(issuedTokens.refreshToken()),
			eq(issuedTokens.refreshTokenExpiresAt()));
	}

	@Test
	@DisplayName("Google ID 토큰 검증이 실패하면 인증 예외를 전달한다")
	void propagateExceptionWhenIdTokenIsInvalid() {
		// given
		String invalidIdToken = "invalid-google-id-token";

		BusinessException expectedException = new BusinessException(ExceptionType.INVALID_GOOGLE_ID_TOKEN);

		given(googleIdTokenValidator.validate(invalidIdToken)).willThrow(expectedException);

		// when & then
		assertThatThrownBy(() -> googleAuthService.authenticate(invalidIdToken)).isSameAs(expectedException);

		verify(userRepository, never()).findByProviderAndProviderSub(any(OAuthProvider.class), any(String.class));

		verify(userRepository, never()).save(any(User.class));

		verify(tokenIssuer, never()).issue(any(User.class));

		verify(refreshTokenService, never()).saveOrReplace(any(User.class), any(String.class), any(Instant.class));
	}
}
