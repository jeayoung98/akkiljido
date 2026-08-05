package com.a508.backend.domain.user.dto;

import com.a508.backend.domain.user.domain.User;
import com.a508.backend.domain.user.domain.UserRole;
import com.a508.backend.domain.user.domain.OAuthProvider;

public record UserProfileResult(
	Long userId,
	String nickname,
	OAuthProvider provider,
	UserRole role
) {

	public static UserProfileResult from(User user) {
		return new UserProfileResult(
			user.getId(),
			user.getNickname(),
			user.getProvider(),
			user.getRole()
		);
	}
}
