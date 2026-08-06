package com.a508.backend.auth.dto;

import com.a508.backend.auth.token.AuthTokens;
import com.a508.backend.domain.user.domain.UserRole;

public record GoogleLoginResponse(UserRole role, String accessToken, String refreshToken, long accessTokenExpiresIn) {

	public static GoogleLoginResponse from(LoginResult result) {
		AuthTokens tokens = result.tokens();

		return new GoogleLoginResponse(result.role(), tokens.accessToken(), tokens.refreshToken(),
			tokens.accessTokenExpiresIn());
	}
}
