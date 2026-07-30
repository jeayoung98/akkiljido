package com.a508.backend.auth.token;

import java.time.Instant;

public record AuthTokens(String accessToken, String refreshToken, long accessTokenExpiresIn,
                         Instant refreshTokenExpiresAt) {
}