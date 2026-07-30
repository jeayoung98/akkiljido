package com.a508.backend.global.security;

import static org.assertj.core.api.Assertions.*;

import java.time.Instant;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

class UserRoleJwtAuthenticationConverterTest {

	private final UserRoleJwtAuthenticationConverter
		converter =
		new UserRoleJwtAuthenticationConverter();

	@Test
	@DisplayName(
		"GUEST 클레임을 ROLE_GUEST 권한으로 변환한다"
	)
	void convertGuestRole() {
		// given
		Jwt jwt =
			createJwt(
				"1",
				"GUEST"
			);

		// when
		AbstractAuthenticationToken authentication =
			converter.convert(jwt);

		// then
		assertThat(authentication)
			.isNotNull();

		assertThat(authentication.getName())
			.isEqualTo("1");

		assertThat(authentication.getAuthorities())
			.containsExactly(
				new SimpleGrantedAuthority(
					"ROLE_GUEST"
				)
			);

		assertThat(authentication.isAuthenticated())
			.isTrue();
	}

	@Test
	@DisplayName(
		"USER 클레임을 ROLE_USER 권한으로 변환한다"
	)
	void convertUserRole() {
		// given
		Jwt jwt =
			createJwt(
				"2",
				"USER"
			);

		// when
		AbstractAuthenticationToken authentication =
			converter.convert(jwt);

		// then
		assertThat(authentication)
			.isNotNull();

		assertThat(authentication.getName())
			.isEqualTo("2");

		assertThat(authentication.getAuthorities())
			.containsExactly(
				new SimpleGrantedAuthority(
					"ROLE_USER"
				)
			);
	}

	private Jwt createJwt(
		String subject,
		String role
	) {
		Instant issuedAt =
			Instant.parse(
				"2026-07-24T00:00:00Z"
			);

		return Jwt
			.withTokenValue(
				"test-access-token"
			)
			.header(
				"alg",
				"HS256"
			)
			.subject(subject)
			.issuedAt(issuedAt)
			.expiresAt(
				issuedAt.plusSeconds(1800)
			)
			.claim(
				"role",
				role
			)
			.claim(
				"token_type",
				"access"
			)
			.build();
	}
}