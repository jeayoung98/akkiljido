package com.a508.backend.auth.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.a508.backend.auth.dto.TokenReissueResult;
import com.a508.backend.auth.token.AuthTokens;
import com.a508.backend.auth.token.RefreshTokenService;
import com.a508.backend.auth.token.RefreshTokenValidator;
import com.a508.backend.auth.token.TokenIssuer;
import com.a508.backend.user.domain.User;

@Service
public class TokenReissueService {

	private final RefreshTokenValidator refreshTokenValidator;

	private final RefreshTokenService refreshTokenService;

	private final TokenIssuer tokenIssuer;

	public TokenReissueService(RefreshTokenValidator refreshTokenValidator, RefreshTokenService refreshTokenService,
		TokenIssuer tokenIssuer) {
		this.refreshTokenValidator = refreshTokenValidator;

		this.refreshTokenService = refreshTokenService;

		this.tokenIssuer = tokenIssuer;
	}

	@Transactional
	public TokenReissueResult reissue(String rawRefreshToken) {
		User user = refreshTokenValidator.validate(rawRefreshToken);

		AuthTokens newTokens = tokenIssuer.issue(user);

		refreshTokenService.saveOrReplace(user, newTokens.refreshToken(), newTokens.refreshTokenExpiresAt());

		return new TokenReissueResult(newTokens);
	}
}
