package com.a508.backend.auth.dto;

import com.a508.backend.auth.token.AuthTokens;

public record TokenReissueResult(
        AuthTokens tokens
) {
}