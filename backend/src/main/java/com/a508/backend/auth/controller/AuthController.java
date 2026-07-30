package com.a508.backend.auth.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.a508.backend.auth.dto.GoogleLoginRequest;
import com.a508.backend.auth.dto.GoogleLoginResponse;
import com.a508.backend.auth.dto.LoginResult;
import com.a508.backend.auth.dto.TokenReissueRequest;
import com.a508.backend.auth.dto.TokenReissueResponse;
import com.a508.backend.auth.dto.TokenReissueResult;
import com.a508.backend.auth.service.GoogleAuthService;
import com.a508.backend.auth.service.LogoutService;
import com.a508.backend.auth.service.TokenReissueService;
import com.a508.backend.global.response.ResponseBody;
import com.a508.backend.global.response.ResponseUtil;
import com.a508.backend.global.security.AuthenticatedUser;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

	private final GoogleAuthService googleAuthService;
	private final TokenReissueService tokenReissueService;
	private final LogoutService logoutService;

	@PostMapping("/oauth/google")
	public ResponseEntity<ResponseBody<GoogleLoginResponse>> googleLogin(
		@Valid @RequestBody GoogleLoginRequest request) {
		LoginResult result = googleAuthService.authenticate(request.idToken());

		GoogleLoginResponse data = GoogleLoginResponse.from(result);

		return ResponseEntity.ok(ResponseUtil.createSuccessResponse(data));
	}

	@PostMapping("/token/reissue")
	public ResponseEntity<ResponseBody<TokenReissueResponse>> reissueTokens(
		@Valid @RequestBody TokenReissueRequest request) {
		TokenReissueResult result = tokenReissueService.reissue(request.refreshToken());

		TokenReissueResponse data = TokenReissueResponse.from(result);

		return ResponseEntity.ok(ResponseUtil.createSuccessResponse(data));
	}

	@PostMapping("/logout")
	public ResponseEntity<ResponseBody<Void>> logout(@AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
		logoutService.logout(authenticatedUser.getUserId());

		return ResponseEntity.ok(ResponseUtil.createSuccessResponse());
	}
}
