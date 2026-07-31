package com.a508.backend.user.dto;

import com.a508.backend.user.domain.OAuthProvider;
import com.a508.backend.user.domain.User;
import com.a508.backend.user.domain.UserRole;

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
