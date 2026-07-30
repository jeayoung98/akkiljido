package com.a508.backend.auth.google;

import java.util.List;
import java.util.Set;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

@Configuration
public class GoogleOidcConfig {

	private static final String GOOGLE_JWK_SET_URI =
		"https://www.googleapis.com/oauth2/v3/certs";

	private static final Set<String> GOOGLE_ISSUERS =
		Set.of(
			"https://accounts.google.com",
			"accounts.google.com"
		);

	@Bean
	public JwtDecoder googleIdTokenDecoder(
		GoogleAuthProperties properties
	) {
		NimbusJwtDecoder decoder =
			NimbusJwtDecoder
				.withJwkSetUri(GOOGLE_JWK_SET_URI)
				.build();

		OAuth2TokenValidator<Jwt> timestampValidator =
			new JwtTimestampValidator();

		OAuth2TokenValidator<Jwt> issuerValidator =
			new JwtClaimValidator<>(
				"iss",
				GOOGLE_ISSUERS::contains
			);

		OAuth2TokenValidator<Jwt> audienceValidator =
			createAudienceValidator(
				properties.allowedAudiences()
			);

		decoder.setJwtValidator(
			new DelegatingOAuth2TokenValidator<>(
				timestampValidator,
				issuerValidator,
				audienceValidator
			)
		);

		return decoder;
	}

	private OAuth2TokenValidator<Jwt> createAudienceValidator(
		List<String> allowedAudiences
	) {
		return jwt -> {
			boolean matched = jwt.getAudience()
				.stream()
				.anyMatch(allowedAudiences::contains);

			if (matched) {
				return OAuth2TokenValidatorResult.success();
			}

			OAuth2Error error = new OAuth2Error(
				"invalid_token",
				"Google ID Token audience is not allowed.",
				null
			);

			return OAuth2TokenValidatorResult.failure(error);
		};
	}
}