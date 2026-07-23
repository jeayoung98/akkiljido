package com.a508.backend.auth.dto;

import com.a508.backend.auth.token.AuthTokens;
import com.a508.backend.member.domain.MemberRole;

public record GoogleLoginResult(
        MemberRole role,
        boolean nicknameRequired,
        AuthTokens tokens
) {
}