package com.a508.backend.auth.dto;

import com.a508.backend.auth.token.AuthTokens;
import com.a508.backend.user.domain.UserRole;

public record LoginResult(UserRole role, AuthTokens tokens) {
}
