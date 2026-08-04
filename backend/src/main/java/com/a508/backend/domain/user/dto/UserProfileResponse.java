package com.a508.backend.domain.user.dto;

import com.a508.backend.domain.user.domain.UserRole;
import com.a508.backend.domain.user.domain.OAuthProvider;

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
