package com.a508.backend.domain.user.dto;

import com.a508.backend.auth.token.AuthTokens;
import com.a508.backend.domain.user.domain.UserRole;

public record NicknameRegistrationResult(String nickname, UserRole role, AuthTokens tokens) {
}