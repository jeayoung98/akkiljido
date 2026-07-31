package com.a508.backend.user.controller;

import com.a508.backend.global.response.ResponseBody;
import com.a508.backend.global.response.ResponseUtil;
import com.a508.backend.global.security.AuthenticatedUser;
import com.a508.backend.user.dto.NicknameRegistrationRequest;
import com.a508.backend.user.dto.NicknameRegistrationResponse;
import com.a508.backend.user.dto.NicknameRegistrationResult;
import com.a508.backend.user.service.UserRegistrationService;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

	private final UserRegistrationService userRegistrationService;

	public UserController(UserRegistrationService userRegistrationService) {
		this.userRegistrationService = userRegistrationService;
	}

	@PatchMapping("/me/nickname")
	public ResponseEntity<ResponseBody<NicknameRegistrationResponse>> registerNickname(
		@AuthenticationPrincipal AuthenticatedUser authenticatedUser,

		@Valid @RequestBody NicknameRegistrationRequest request) {
		NicknameRegistrationResult result = userRegistrationService.completeRegistration(authenticatedUser.getUserId(),
			request.nickname());

		NicknameRegistrationResponse data = NicknameRegistrationResponse.from(result);

		return ResponseEntity.ok(ResponseUtil.createSuccessResponse(data));
	}
}
