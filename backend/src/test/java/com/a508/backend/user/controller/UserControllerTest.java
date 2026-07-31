package com.a508.backend.user.controller;

import com.a508.backend.auth.token.AuthTokens;
import com.a508.backend.global.exception.GlobalExceptionHandler;
import com.a508.backend.global.security.AuthenticatedUser;
import com.a508.backend.user.domain.UserRole;
import com.a508.backend.user.dto.NicknameRegistrationResult;
import com.a508.backend.user.service.UserRegistrationService;

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

import java.time.Instant;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

	@Mock
	private UserRegistrationService userRegistrationService;

	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		UserController userController = new UserController(userRegistrationService);

		mockMvc = MockMvcBuilders.standaloneSetup(userController)
			.setControllerAdvice(new GlobalExceptionHandler())
			.setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
			.build();
	}

	@AfterEach
	void tearDown() {
		SecurityContextHolder.clearContext();
	}

	@Test
	@DisplayName("GUEST가 닉네임을 설정하면 USER 권한 토큰을 반환한다")
	void registerNickname() throws Exception {
		// given
		setAuthentication(1L);

		AuthTokens tokens = new AuthTokens("test-user-access-token", "test-user-refresh-token", 1800L,
			Instant.parse("2026-08-07T00:00:00Z"));

		NicknameRegistrationResult result = new NicknameRegistrationResult("홍길동", UserRole.USER, tokens);

		given(userRegistrationService.completeRegistration(1L, "홍길동")).willReturn(result);

		// when & then
		mockMvc.perform(patch("/api/v1/users/me/nickname").contentType(MediaType.APPLICATION_JSON).content("""
				{
				  "nickname": "홍길동"
				}
				"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.nickname").value("홍길동"))
			.andExpect(jsonPath("$.data.role").value("USER"))
			.andExpect(jsonPath("$.data.accessToken").value("test-user-access-token"))
			.andExpect(jsonPath("$.data.refreshToken").value("test-user-refresh-token"))
			.andExpect(jsonPath("$.data.accessTokenExpiresIn").value(1800));

		verify(userRegistrationService).completeRegistration(1L, "홍길동");
	}

	@Test
	@DisplayName("닉네임이 비어 있으면 400 응답을 반환한다")
	void rejectBlankNickname() throws Exception {
		// given
		setAuthentication(1L);

		// when & then
		mockMvc.perform(patch("/api/v1/users/me/nickname").contentType(MediaType.APPLICATION_JSON).content("""
				{
				  "nickname": ""
				}
				"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("C002"))
			.andExpect(jsonPath("$.msg").value("닉네임은 필수입니다."));

		verify(userRegistrationService, never()).completeRegistration(anyLong(), anyString());
	}

	@Test
	@DisplayName("닉네임이 20자를 초과하면 400 응답을 반환한다")
	void rejectLongNickname() throws Exception {
		// given
		setAuthentication(1L);

		// when & then
		mockMvc.perform(patch("/api/v1/users/me/nickname").contentType(MediaType.APPLICATION_JSON).content("""
				{
				  "nickname": "123456789012345678901"
				}
				"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("C002"))
			.andExpect(jsonPath("$.msg").value("닉네임은 20자 이하여야 합니다."));

		verify(userRegistrationService, never()).completeRegistration(anyLong(), anyString());
	}

	private void setAuthentication(Long userId) {
		UsernamePasswordAuthenticationToken authentication = UsernamePasswordAuthenticationToken.authenticated(
			new AuthenticatedUser(userId), null, java.util.List.of());

		SecurityContextHolder.getContext().setAuthentication(authentication);
	}
}
