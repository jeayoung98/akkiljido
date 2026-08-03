package com.a508.backend.domain.fcm.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.a508.backend.domain.fcm.dto.FcmTestResponse;
import com.a508.backend.domain.fcm.dto.FcmTokenRegisterRequest;
import com.a508.backend.domain.fcm.service.FcmService;
import com.a508.backend.global.response.ResponseBody;
import com.a508.backend.global.response.ResponseUtil;
import com.a508.backend.global.security.AuthenticatedUser;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/fcm")
@RequiredArgsConstructor
public class FcmController {

	private final FcmService fcmService;

	@PostMapping
	public ResponseEntity<ResponseBody<Void>> registerPushToken(
		@AuthenticationPrincipal AuthenticatedUser authenticatedUser,
		@Valid @RequestBody FcmTokenRegisterRequest request
	) {
		fcmService.registerPushToken(
			authenticatedUser.getUserId(),
			request
		);

		return ResponseEntity.ok(
			ResponseUtil.createSuccessResponse()
		);
	}

	@PostMapping("/test")
	public ResponseEntity<ResponseBody<FcmTestResponse>> sendTestNotification(
		@AuthenticationPrincipal AuthenticatedUser authenticatedUser
	) {
		FcmTestResponse data =
			fcmService.sendTestNotification(authenticatedUser.getUserId());

		return ResponseEntity.ok(
			ResponseUtil.createSuccessResponse(data)
		);
	}
}
