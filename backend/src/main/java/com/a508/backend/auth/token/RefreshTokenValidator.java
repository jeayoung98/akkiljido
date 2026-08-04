package com.a508.backend.auth.token;

import java.time.Instant;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.domain.user.domain.User;
import com.a508.backend.domain.user.repository.UserRepository;

@Component
public class RefreshTokenValidator {

	private final JwtDecoder refreshTokenDecoder;
	private final UserRepository userRepository;
	private final RefreshTokenService refreshTokenService;

	public RefreshTokenValidator(@Qualifier("serviceRefreshTokenDecoder") JwtDecoder refreshTokenDecoder,
		UserRepository userRepository, RefreshTokenService refreshTokenService) {
		this.refreshTokenDecoder = refreshTokenDecoder;
		this.userRepository = userRepository;
		this.refreshTokenService = refreshTokenService;
	}

	public User validate(String rawRefreshToken) {
		if (!StringUtils.hasText(rawRefreshToken)) {
			throw invalidRefreshToken();
		}

		try {
			Jwt jwt = refreshTokenDecoder.decode(rawRefreshToken);

			Long userId = Long.valueOf(jwt.getSubject());

			if (userId <= 0) {
				throw invalidRefreshToken();
			}

			User user = userRepository.findById(userId).orElseThrow(this::invalidRefreshToken);

			refreshTokenService.verifyStoredToken(userId, rawRefreshToken, Instant.now());

			return user;
		} catch (JwtException | NumberFormatException exception) {
			throw invalidRefreshToken();
		}
	}

	private BusinessException invalidRefreshToken() {
		return new BusinessException(ExceptionType.INVALID_REFRESH_TOKEN);
	}
}
