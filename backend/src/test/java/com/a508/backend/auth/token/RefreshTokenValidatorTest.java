package com.a508.backend.auth.token;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.BDDMockito.*;
import static org.mockito.Mockito.*;

import java.time.Instant;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;

import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;

@ExtendWith(MockitoExtension.class)
class RefreshTokenValidatorTest {

	@Mock
	private JwtDecoder refreshTokenDecoder;

	private RefreshTokenValidator
		refreshTokenValidator;

	@BeforeEach
	void setUp() {
		refreshTokenValidator =
			new RefreshTokenValidator(
				refreshTokenDecoder
			);
	}

	@Test
	@DisplayName(
		"검증된 Refresh Token에서 회원 ID를 추출한다"
	)
	void extractUserIdFromRefreshToken() {
		// given
		String rawRefreshToken =
			"test-refresh-token";

		Jwt jwt =
			createRefreshJwt("1");

		given(
			refreshTokenDecoder.decode(
				rawRefreshToken
			)
		).willReturn(jwt);

		// when
		Long userId =
			refreshTokenValidator
				.validateAndExtractUserId(
					rawRefreshToken
				);

		// then
		assertThat(userId)
			.isEqualTo(1L);

		verify(refreshTokenDecoder)
			.decode(rawRefreshToken);
	}

	@Test
	@DisplayName(
		"Refresh Token이 비어 있으면 인증 예외를 발생시킨다"
	)
	void rejectBlankRefreshToken() {
		assertInvalidRefreshToken(
			() -> refreshTokenValidator
				.validateAndExtractUserId(" ")
		);

		verify(refreshTokenDecoder, never())
			.decode(
				org.mockito.ArgumentMatchers
					.anyString()
			);
	}

	@Test
	@DisplayName(
		"Refresh Token JWT 검증에 실패하면 인증 예외로 변환한다"
	)
	void convertJwtExceptionToBusinessException() {
		// given
		String invalidRefreshToken =
			"invalid-refresh-token";

		given(
			refreshTokenDecoder.decode(
				invalidRefreshToken
			)
		).willThrow(
			new JwtException(
				"Refresh Token verification failed"
			)
		);

		// when & then
		assertInvalidRefreshToken(
			() -> refreshTokenValidator
				.validateAndExtractUserId(
					invalidRefreshToken
				)
		);
	}

	@Test
	@DisplayName(
		"Refresh Token의 sub가 숫자가 아니면 거부한다"
	)
	void rejectNonNumericSubject() {
		// given
		String rawRefreshToken =
			"test-refresh-token";

		Jwt jwt =
			createRefreshJwt(
				"not-a-user-id"
			);

		given(
			refreshTokenDecoder.decode(
				rawRefreshToken
			)
		).willReturn(jwt);

		// when & then
		assertInvalidRefreshToken(
			() -> refreshTokenValidator
				.validateAndExtractUserId(
					rawRefreshToken
				)
		);
	}

	@Test
	@DisplayName(
		"Refresh Token의 회원 ID가 양수가 아니면 거부한다"
	)
	void rejectNonPositiveUserId() {
		// given
		String rawRefreshToken =
			"test-refresh-token";

		Jwt jwt =
			createRefreshJwt("0");

		given(
			refreshTokenDecoder.decode(
				rawRefreshToken
			)
		).willReturn(jwt);

		// when & then
		assertInvalidRefreshToken(
			() -> refreshTokenValidator
				.validateAndExtractUserId(
					rawRefreshToken
				)
		);
	}

	private Jwt createRefreshJwt(
		String subject
	) {
		Instant issuedAt =
			Instant.parse(
				"2026-07-24T00:00:00Z"
			);

		return Jwt
			.withTokenValue(
				"test-refresh-token"
			)
			.header(
				"alg",
				"HS256"
			)
			.issuer(
				"a508-backend"
			)
			.subject(subject)
			.issuedAt(issuedAt)
			.expiresAt(
				issuedAt.plusSeconds(
					1209600
				)
			)
			.claim(
				"role",
				"USER"
			)
			.claim(
				"token_type",
				"refresh"
			)
			.build();
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
					businessException.getExceptionType()
				).isEqualTo(
					ExceptionType.INVALID_REFRESH_TOKEN
				);
			});
	}
}