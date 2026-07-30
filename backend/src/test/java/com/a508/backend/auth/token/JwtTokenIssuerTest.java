package com.a508.backend.auth.token;

import static org.assertj.core.api.Assertions.*;

import java.time.Duration;
import java.util.Base64;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import com.a508.backend.user.domain.User;
import com.a508.backend.user.domain.UserRole;

class JwtTokenIssuerTest {

	private static final Duration ACCESS_TOKEN_TTL =
		Duration.ofMinutes(30);

	private static final Duration REFRESH_TOKEN_TTL =
		Duration.ofDays(14);

	private JwtTokenIssuer jwtTokenIssuer;
	private JwtDecoder jwtDecoder;

	@BeforeEach
	void setUp() {
		byte[] secretBytes = new byte[32];

		SecretKey secretKey =
			new SecretKeySpec(
				secretBytes,
				"HmacSHA256"
			);

		JwtEncoder jwtEncoder =
			NimbusJwtEncoder
				.withSecretKey(secretKey)
				.algorithm(MacAlgorithm.HS256)
				.build();

		jwtDecoder =
			NimbusJwtDecoder
				.withSecretKey(secretKey)
				.macAlgorithm(MacAlgorithm.HS256)
				.build();

		JwtProperties properties =
			new JwtProperties(
				"a508-backend",
				Base64.getEncoder()
					.encodeToString(secretBytes),
				ACCESS_TOKEN_TTL,
				REFRESH_TOKEN_TTL
			);

		jwtTokenIssuer =
			new JwtTokenIssuer(
				jwtEncoder,
				properties
			);
	}

	@Test
	@DisplayName("회원 정보로 Access Token과 Refresh Token을 발급한다")
	void issueAccessAndRefreshTokens() {
		// given
		User user =
			User.createGoogleGuest(
				"google-sub-123"
			);

		ReflectionTestUtils.setField(
			user,
			"id",
			1L
		);

		// when
		AuthTokens tokens =
			jwtTokenIssuer.issue(user);

		// then
		assertThat(tokens.accessToken())
			.isNotBlank();

		assertThat(tokens.refreshToken())
			.isNotBlank();

		assertThat(tokens.accessToken())
			.isNotEqualTo(tokens.refreshToken());

		assertThat(tokens.accessTokenExpiresIn())
			.isEqualTo(
				ACCESS_TOKEN_TTL.toSeconds()
			);
	}

	@Test
	@DisplayName("Access Token에 회원 ID와 권한을 포함한다")
	void includeUserClaimsInAccessToken() {
		// given
		User user =
			User.createGoogleGuest(
				"google-sub-123"
			);

		ReflectionTestUtils.setField(
			user,
			"id",
			1L
		);

		// when
		AuthTokens tokens =
			jwtTokenIssuer.issue(user);

		Jwt accessToken =
			jwtDecoder.decode(
				tokens.accessToken()
			);

		// then
		assertThat(accessToken.getSubject())
			.isEqualTo("1");

		assertThat(
			accessToken.getClaimAsString("iss")
		).isEqualTo("a508-backend");

		assertThat(
			accessToken.getClaimAsString("role")
		).isEqualTo(
			UserRole.GUEST.name()
		);

		assertThat(
			accessToken.getClaimAsString("token_type")
		).isEqualTo("access");

		assertThat(
			Duration.between(
				accessToken.getIssuedAt(),
				accessToken.getExpiresAt()
			)
		).isEqualTo(ACCESS_TOKEN_TTL);
	}

	@Test
	@DisplayName("Refresh Token을 Access Token과 구분하여 발급한다")
	void issueRefreshTokenWithRefreshClaims() {
		// given
		User user =
			User.createGoogleGuest(
				"google-sub-123"
			);

		ReflectionTestUtils.setField(
			user,
			"id",
			1L
		);

		// when
		AuthTokens tokens =
			jwtTokenIssuer.issue(user);

		Jwt accessToken =
			jwtDecoder.decode(
				tokens.accessToken()
			);

		Jwt refreshToken =
			jwtDecoder.decode(
				tokens.refreshToken()
			);

		// then
		assertThat(refreshToken.getSubject())
			.isEqualTo("1");

		assertThat(
			refreshToken.getClaimAsString("role")
		).isEqualTo(
			UserRole.GUEST.name()
		);

		assertThat(
			refreshToken.getClaimAsString("token_type")
		).isEqualTo("refresh");

		assertThat(
			Duration.between(
				refreshToken.getIssuedAt(),
				refreshToken.getExpiresAt()
			)
		).isEqualTo(REFRESH_TOKEN_TTL);

		assertThat(refreshToken.getId())
			.isNotEqualTo(accessToken.getId());

		assertThat(tokens.refreshTokenExpiresAt())
			.isEqualTo(
				refreshToken.getExpiresAt()
			);

	}

	@Test
	@DisplayName("DB에 저장되지 않은 회원에게는 토큰을 발급하지 않는다")
	void rejectUserWithoutId() {
		// given
		User unsavedUser =
			User.createGoogleGuest(
				"google-sub-123"
			);

		// when & then
		assertThatThrownBy(
			() -> jwtTokenIssuer.issue(unsavedUser)
		)
			.isInstanceOf(
				IllegalStateException.class
			)
			.hasMessage(
				"JWT 발급 전에 회원이 저장되어야 합니다."
			);
	}
}