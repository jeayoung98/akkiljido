package com.a508.backend.user.dto;

import com.a508.backend.auth.token.AuthTokens;
import com.a508.backend.user.domain.UserRole;

public record NicknameRegistrationResponse(
        String nickname,
        UserRole role,
        String accessToken,
        String refreshToken,
        long accessTokenExpiresIn
) {

    public static NicknameRegistrationResponse from(
            NicknameRegistrationResult result
    ) {
        AuthTokens tokens =
                result.tokens();

        return new NicknameRegistrationResponse(
                result.nickname(),
                result.role(),
                tokens.accessToken(),
                tokens.refreshToken(),
                tokens.accessTokenExpiresIn()
        );
    }
}