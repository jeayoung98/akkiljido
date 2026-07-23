package com.a508.backend.auth.token;

public record AuthTokens(
        String accessToken,
        String refreshToken,
        long accessTokenExpiresIn
) {
}