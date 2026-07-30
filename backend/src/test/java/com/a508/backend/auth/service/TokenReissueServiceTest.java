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
import org.springframework.test.util.ReflectionTestUtils;

import com.a508.backend.auth.dto.TokenReissueResult;
import com.a508.backend.auth.token.AuthTokens;
import com.a508.backend.auth.token.RefreshTokenService;
import com.a508.backend.auth.token.RefreshTokenValidator;
import com.a508.backend.auth.token.TokenIssuer;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.user.domain.User;
import com.a508.backend.user.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class TokenReissueServiceTest {

	@Mock
	private RefreshTokenValidator
		refreshTokenValidator;

	@Mock
	private RefreshTokenService
		refreshTokenService;

	@Mock
	private UserRepository
		userRepository;

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
				userRepository,
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

		Long userId = 1L;

		User user =
			createSavedUser(userId);

		AuthTokens newTokens =
			createNewAuthTokens();

		given(
			refreshTokenValidator
				.validateAndExtractUserId(
					oldRefreshToken
				)
		).willReturn(userId);

		given(
			userRepository.findById(userId)
		).willReturn(
			Optional.of(user)
		);

		given(
			tokenIssuer.issue(user)
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
			.validateAndExtractUserId(
				oldRefreshToken
			);

		verify(refreshTokenService)
			.verifyStoredToken(
				eq(userId),
				eq(oldRefreshToken),
				any(Instant.class)
			);

		verify(userRepository)
			.findById(userId);

		verify(tokenIssuer)
			.issue(user);

		verify(refreshTokenService)
			.saveOrReplace(
				user,
				newTokens.refreshToken(),
				newTokens.refreshTokenExpiresAt()
			);
	}

	@Test
	@DisplayName(
		"Refresh Token의 회원이 존재하지 않으면 재발급을 거부한다"
	)
	void rejectMissingUser() {
		// given
		String rawRefreshToken =
			"test-refresh-token";

		Long userId = 999L;

		given(
			refreshTokenValidator
				.validateAndExtractUserId(
					rawRefreshToken
				)
		).willReturn(userId);

		given(
			userRepository.findById(userId)
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
				eq(userId),
				eq(rawRefreshToken),
				any(Instant.class)
			);

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
				.validateAndExtractUserId(
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

		verify(userRepository, never())
			.findById(any(Long.class));

		verify(tokenIssuer, never())
			.issue(any(User.class));

		verify(refreshTokenService, never())
			.saveOrReplace(
				any(User.class),
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
					(BusinessException)exception;

				assertThat(
					businessException
						.getExceptionType()
				).isEqualTo(
					ExceptionType
						.INVALID_REFRESH_TOKEN
				);
			});
	}

	private User createSavedUser(
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