package com.a508.backend.user.dto;

import com.a508.backend.user.domain.OAuthProvider;
import com.a508.backend.user.domain.UserRole;

public record UserProfileResponse(
	Long userId,
	String nickname,
	OAuthProvider provider,
	UserRole role
) {

	public static UserProfileResponse from(
		UserProfileResult result
	) {
		return new UserProfileResponse(
			result.userId(),
			result.nickname(),
			result.provider(),
			result.role()
		);
	}
}
