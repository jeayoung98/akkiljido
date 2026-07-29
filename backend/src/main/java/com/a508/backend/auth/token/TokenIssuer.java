package com.a508.backend.auth.token;

import com.a508.backend.user.domain.User;

public interface TokenIssuer {

    AuthTokens issue(User user);
}