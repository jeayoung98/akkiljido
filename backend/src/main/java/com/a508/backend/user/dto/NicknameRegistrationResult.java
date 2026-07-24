package com.a508.backend.member.dto;

import com.a508.backend.auth.token.AuthTokens;
import com.a508.backend.member.domain.MemberRole;

public record NicknameRegistrationResult(
        String nickname,
        MemberRole role,
        AuthTokens tokens
) {
}