package com.a508.backend.member.dto;

import com.a508.backend.auth.token.AuthTokens;
import com.a508.backend.member.domain.MemberRole;

public record NicknameRegistrationResponse(
        String nickname,
        MemberRole role,
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