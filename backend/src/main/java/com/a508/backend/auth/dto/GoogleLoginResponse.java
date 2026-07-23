package com.a508.backend.auth.dto;

import com.a508.backend.auth.token.AuthTokens;
import com.a508.backend.member.domain.MemberRole;

public record GoogleLoginResponse(
        MemberRole role,
        boolean nicknameRequired,
        String accessToken,
        String refreshToken,
        long accessTokenExpiresIn
) {

    public static GoogleLoginResponse from(
            GoogleLoginResult result
    ) {
        AuthTokens tokens =
                result.tokens();

        return new GoogleLoginResponse(
                result.role(),
                result.nicknameRequired(),
                tokens.accessToken(),
                tokens.refreshToken(),
                tokens.accessTokenExpiresIn()
        );
    }
}