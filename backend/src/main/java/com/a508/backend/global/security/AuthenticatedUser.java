package com.a508.backend.global.security;

import java.security.Principal;

public record AuthenticatedUser(Long userId) implements Principal {

	@Override
	public String getName() {
		return userId.toString();
	}

	public Long getUserId() {
		return userId;
	}
}
