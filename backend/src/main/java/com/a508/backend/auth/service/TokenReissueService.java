package com.a508.backend.auth.service;

import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.a508.backend.auth.dto.TokenReissueResult;
import com.a508.backend.auth.token.AuthTokens;
import com.a508.backend.auth.token.RefreshTokenService;
import com.a508.backend.auth.token.RefreshTokenValidator;
import com.a508.backend.auth.token.TokenIssuer;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.user.domain.User;
import com.a508.backend.user.repository.UserRepository;

@Service
public class TokenReissueService {

	private final RefreshTokenValidator
		refreshTokenValidator;

	private final RefreshTokenService
		refreshTokenService;

	private final UserRepository
		userRepository;

	private final TokenIssuer
		tokenIssuer;

	public TokenReissueService(
		RefreshTokenValidator refreshTokenValidator,
		RefreshTokenService refreshTokenService,
		UserRepository userRepository,
		TokenIssuer tokenIssuer
	) {
		this.refreshTokenValidator =
			refreshTokenValidator;

		this.refreshTokenService =
			refreshTokenService;

		this.userRepository =
			userRepository;

		this.tokenIssuer =
			tokenIssuer;
	}

	@Transactional
	public TokenReissueResult reissue(
		String rawRefreshToken
	) {
		Long userId =
			refreshTokenValidator
				.validateAndExtractUserId(
					rawRefreshToken
				);

		refreshTokenService.verifyStoredToken(
			userId,
			rawRefreshToken,
			Instant.now()
		);

		User user =
			userRepository
				.findById(userId)
				.orElseThrow(
					this::invalidRefreshToken
				);

		AuthTokens newTokens =
			tokenIssuer.issue(user);

		refreshTokenService.saveOrReplace(
			user,
			newTokens.refreshToken(),
			newTokens.refreshTokenExpiresAt()
		);

		return new TokenReissueResult(
			newTokens
		);
	}

	private BusinessException invalidRefreshToken() {
		return new BusinessException(
			ExceptionType.INVALID_REFRESH_TOKEN
		);
	}
}