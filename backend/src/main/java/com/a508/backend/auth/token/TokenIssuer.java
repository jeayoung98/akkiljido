package com.a508.backend.auth.token;

import com.a508.backend.member.domain.Member;

public interface TokenIssuer {

    AuthTokens issue(Member member);
}