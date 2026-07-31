package com.a508.backend.domain.user.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.a508.backend.domain.user.dto.NicknameRegistrationRequest;
import com.a508.backend.domain.user.dto.NicknameRegistrationResponse;
import com.a508.backend.global.response.ResponseBody;
import com.a508.backend.global.response.ResponseUtil;
import com.a508.backend.global.security.AuthenticatedUser;
import com.a508.backend.domain.user.dto.NicknameRegistrationResult;
import com.a508.backend.domain.user.dto.UserProfileResponse;
import com.a508.backend.domain.user.dto.UserProfileResult;
import com.a508.backend.domain.user.service.UserProfileService;
import com.a508.backend.domain.user.service.UserRegistrationService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

	private final UserRegistrationService userRegistrationService;
	private final UserProfileService userProfileService;

	@GetMapping("/me")
	public ResponseEntity<ResponseBody<UserProfileResponse>> getMyProfile(
		@AuthenticationPrincipal AuthenticatedUser authenticatedUser
	) {
		UserProfileResult result = userProfileService.getMyProfile(
			authenticatedUser.getUserId()
		);

		UserProfileResponse data = UserProfileResponse.from(result);

		return ResponseEntity.ok(
			ResponseUtil.createSuccessResponse(data)
		);
	}

	@PatchMapping("/me/nickname")
	public ResponseEntity<ResponseBody<NicknameRegistrationResponse>> registerNickname(
		@AuthenticationPrincipal AuthenticatedUser authenticatedUser,
		@Valid @RequestBody NicknameRegistrationRequest request
	) {
		NicknameRegistrationResult result = userRegistrationService.completeRegistration(
			authenticatedUser.getUserId(),
			request.nickname()
		);

		NicknameRegistrationResponse data = NicknameRegistrationResponse.from(result);

		return ResponseEntity.ok(
			ResponseUtil.createSuccessResponse(data)
		);
	}
}