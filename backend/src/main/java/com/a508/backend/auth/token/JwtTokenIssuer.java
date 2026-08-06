package com.a508.backend.auth.token;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.oauth2.jose.jws.JwsAlgorithm;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Component;

import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.domain.user.domain.User;

@Component
public class JwtTokenIssuer implements TokenIssuer {

	private static final JwsAlgorithm SIGNATURE_ALGORITHM = MacAlgorithm.HS256;

	private final JwtEncoder jwtEncoder;
	private final JwtProperties properties;

	public JwtTokenIssuer(@Qualifier("serviceJwtEncoder") JwtEncoder jwtEncoder, JwtProperties properties) {
		this.jwtEncoder = jwtEncoder;
		this.properties = properties;
	}

	@Override
	public AuthTokens issue(User user) {
		if (user.getId() == null) {
			throw new BusinessException(ExceptionType.UNEXPECTED_SERVER_ERROR);
		}

		Instant issuedAt = Instant.now().truncatedTo(ChronoUnit.SECONDS);

		Instant accessTokenExpiresAt = issuedAt.plus(properties.accessTokenTtl());

		Instant refreshTokenExpiresAt = issuedAt.plus(properties.refreshTokenTtl());

		String accessToken = createToken(user, issuedAt, accessTokenExpiresAt, "access");

		String refreshToken = createToken(user, issuedAt, refreshTokenExpiresAt, "refresh");

		return new AuthTokens(accessToken, refreshToken, properties.accessTokenTtl().toSeconds(),
			refreshTokenExpiresAt);
	}

	private String createToken(User user, Instant issuedAt, Instant expiresAt, String tokenType) {
		JwtClaimsSet claims = JwtClaimsSet.builder()
			.issuer(properties.issuer())
			.subject(user.getId().toString())
			.issuedAt(issuedAt)
			.expiresAt(expiresAt)
			.id(UUID.randomUUID().toString())
			.claim("role", user.getRole().name())
			.claim("token_type", tokenType)
			.build();

		JwsHeader header = JwsHeader.with(SIGNATURE_ALGORITHM).build();

		return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
	}
}
