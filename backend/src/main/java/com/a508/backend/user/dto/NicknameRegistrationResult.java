package com.a508.backend.user.dto;

import com.a508.backend.auth.token.AuthTokens;
import com.a508.backend.user.domain.UserRole;

public record NicknameRegistrationResult(
        String nickname,
        UserRole role,
        AuthTokens tokens
) {
}