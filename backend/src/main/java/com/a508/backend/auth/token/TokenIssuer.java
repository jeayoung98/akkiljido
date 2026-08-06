package com.a508.backend.auth.token;

import com.a508.backend.domain.user.domain.User;

public interface TokenIssuer {

	AuthTokens issue(User user);
}