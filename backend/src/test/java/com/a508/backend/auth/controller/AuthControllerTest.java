package com.a508.backend.auth.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.Instant;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.a508.backend.auth.dto.LoginResult;
import com.a508.backend.auth.dto.TokenReissueResult;
import com.a508.backend.auth.service.GoogleAuthService;
import com.a508.backend.auth.service.LogoutService;
import com.a508.backend.auth.service.TokenReissueService;
import com.a508.backend.auth.token.AuthTokens;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.global.exception.GlobalExceptionHandler;
import com.a508.backend.global.security.AuthenticatedUser;
import com.a508.backend.user.domain.UserRole;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

	@Mock
	private GoogleAuthService googleAuthService;

	@Mock
	private TokenReissueService tokenReissueService;

	@Mock
	private LogoutService logoutService;

	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		AuthController authController = new AuthController(googleAuthService, tokenReissueService, logoutService);

		mockMvc = MockMvcBuilders.standaloneSetup(authController)
			.setControllerAdvice(new GlobalExceptionHandler())
			.setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
			.build();
	}

	@AfterEach
	void tearDown() {
		SecurityContextHolder.clearContext();
	}

	@Test
	@DisplayName("Google ID Token으로 로그인하고 자체 토큰을 반환한다")
	void loginWithGoogleIdToken() throws Exception {
		// given
		String rawIdToken = "test-google-id-token";

		AuthTokens tokens = new AuthTokens("test-access-token", "test-refresh-token", 1800L,
			Instant.parse("2026-08-07T00:00:00Z"));

		LoginResult result = new LoginResult(UserRole.GUEST, tokens);

		given(googleAuthService.authenticate(rawIdToken)).willReturn(result);

		// when & then
		mockMvc.perform(post("/api/v1/auth/oauth/google").contentType(MediaType.APPLICATION_JSON).content("""
				{
				  "idToken": "test-google-id-token"
				}
				"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.role").value("GUEST"))
			.andExpect(jsonPath("$.data.nicknameRequired").doesNotExist())
			.andExpect(jsonPath("$.data.accessToken").value("test-access-token"))
			.andExpect(jsonPath("$.data.refreshToken").value("test-refresh-token"))
			.andExpect(jsonPath("$.data.accessTokenExpiresIn").value(1800))
			.andExpect(jsonPath("$.data.refreshTokenExpiresAt").doesNotExist());

		verify(googleAuthService).authenticate(rawIdToken);
	}

	@Test
	@DisplayName("Google ID Token이 비어 있으면 400 응답을 반환한다")
	void rejectBlankGoogleIdToken() throws Exception {
		// when & then
		mockMvc.perform(post("/api/v1/auth/oauth/google").contentType(MediaType.APPLICATION_JSON).content("""
				{
				  "idToken": ""
				}
				"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("C002"));

		verify(googleAuthService, never()).authenticate(anyString());
	}

	@Test
	@DisplayName("유효한 Refresh Token으로 새 토큰을 발급한다")
	void reissueTokens() throws Exception {
		// given
		String oldRefreshToken = "old-refresh-token";

		AuthTokens newTokens = new AuthTokens("new-access-token", "new-refresh-token", 1800L,
			Instant.parse("2026-08-07T00:00:00Z"));

		TokenReissueResult result = new TokenReissueResult(newTokens);

		given(tokenReissueService.reissue(oldRefreshToken)).willReturn(result);

		// when & then
		mockMvc.perform(post("/api/v1/auth/token/reissue").contentType(MediaType.APPLICATION_JSON).content("""
				{
				  "refreshToken": "old-refresh-token"
				}
				"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.accessToken").value("new-access-token"))
			.andExpect(jsonPath("$.data.refreshToken").value("new-refresh-token"))
			.andExpect(jsonPath("$.data.accessTokenExpiresIn").value(1800))
			.andExpect(jsonPath("$.data.refreshTokenExpiresAt").doesNotExist());

		verify(tokenReissueService).reissue(oldRefreshToken);
	}

	@Test
	@DisplayName("Refresh Token이 비어 있으면 400 응답을 반환한다")
	void rejectBlankRefreshToken() throws Exception {
		// when & then
		mockMvc.perform(post("/api/v1/auth/token/reissue").contentType(MediaType.APPLICATION_JSON).content("""
				{
				  "refreshToken": ""
				}
				"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("C002"));

		verify(tokenReissueService, never()).reissue(anyString());
	}

	@Test
	@DisplayName("유효하지 않은 Refresh Token이면 401 응답을 반환한다")
	void rejectInvalidRefreshToken() throws Exception {
		// given
		String invalidRefreshToken = "invalid-refresh-token";

		given(tokenReissueService.reissue(invalidRefreshToken)).willThrow(
			new BusinessException(ExceptionType.INVALID_REFRESH_TOKEN));

		// when & then
		mockMvc.perform(post("/api/v1/auth/token/reissue").contentType(MediaType.APPLICATION_JSON).content("""
				{
				  "refreshToken": "invalid-refresh-token"
				}
				"""))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("A004"));

		verify(tokenReissueService).reissue(invalidRefreshToken);
	}

	@Test
	@DisplayName("인증된 회원이 로그아웃하면 Refresh Token을 삭제한다")
	void logout() throws Exception {
		// given
		setAuthentication(1L);

		// when & then
		mockMvc.perform(post("/api/v1/auth/logout"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data").doesNotExist());

		verify(logoutService).logout(1L);
	}

	private void setAuthentication(Long userId) {
		UsernamePasswordAuthenticationToken authentication = UsernamePasswordAuthenticationToken.authenticated(
			new AuthenticatedUser(userId), null, java.util.List.of());

		SecurityContextHolder.getContext().setAuthentication(authentication);
	}
}
