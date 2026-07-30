package com.a508.backend.user.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.a508.backend.global.response.ResponseBody;
import com.a508.backend.global.response.ResponseUtil;
import com.a508.backend.global.security.AuthenticatedUser;
import com.a508.backend.user.dto.NicknameRegistrationRequest;
import com.a508.backend.user.dto.NicknameRegistrationResponse;
import com.a508.backend.user.dto.NicknameRegistrationResult;
import com.a508.backend.user.dto.UserProfileResponse;
import com.a508.backend.user.dto.UserProfileResult;
import com.a508.backend.user.service.UserProfileService;
import com.a508.backend.user.service.UserRegistrationService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

	private final UserRegistrationService userRegistrationService;
	private final UserProfileService userProfileService;

	public UserController(
		UserRegistrationService userRegistrationService,
		UserProfileService userProfileService
	) {
		this.userRegistrationService =
			userRegistrationService;

		this.userProfileService =
			userProfileService;
	}

	@GetMapping("/me")
	public ResponseEntity<ResponseBody<UserProfileResponse>>
	getMyProfile(
		@AuthenticationPrincipal
		AuthenticatedUser authenticatedUser
	) {
		UserProfileResult result =
			userProfileService.getMyProfile(
				authenticatedUser.getUserId()
			);

		UserProfileResponse data =
			UserProfileResponse.from(result);

		return ResponseEntity.ok(
			ResponseUtil.createSuccessResponse(data)
		);
	}

	@PatchMapping("/me/nickname")
	public ResponseEntity<
		ResponseBody<NicknameRegistrationResponse>
		> registerNickname(
		@AuthenticationPrincipal
		AuthenticatedUser authenticatedUser,

		@Valid
		@RequestBody
		NicknameRegistrationRequest request
	) {
		NicknameRegistrationResult result =
			userRegistrationService.completeRegistration(
				authenticatedUser.getUserId(),
				request.nickname()
			);

		NicknameRegistrationResponse data =
			NicknameRegistrationResponse.from(result);

		return ResponseEntity.ok(
			ResponseUtil.createSuccessResponse(data)
		);
	}
}