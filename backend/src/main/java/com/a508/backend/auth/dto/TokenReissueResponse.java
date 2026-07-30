package com.a508.backend.auth.dto;

import com.a508.backend.auth.token.AuthTokens;

public record TokenReissueResponse(
	String accessToken,
	String refreshToken,
	long accessTokenExpiresIn
) {

	public static TokenReissueResponse from(
		TokenReissueResult result
	) {
		AuthTokens tokens =
			result.tokens();

		return new TokenReissueResponse(
			tokens.accessToken(),
			tokens.refreshToken(),
			tokens.accessTokenExpiresIn()
		);
	}
}