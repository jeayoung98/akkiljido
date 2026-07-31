package com.a508.backend.user.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.Instant;
import java.util.List;

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

import com.a508.backend.auth.token.AuthTokens;
import com.a508.backend.domain.user.controller.UserController;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.global.exception.GlobalExceptionHandler;
import com.a508.backend.global.security.AuthenticatedUser;
import com.a508.backend.domain.user.domain.OAuthProvider;
import com.a508.backend.domain.user.domain.UserRole;
import com.a508.backend.domain.user.dto.NicknameRegistrationResult;
import com.a508.backend.domain.user.dto.UserProfileResult;
import com.a508.backend.domain.user.service.UserProfileService;
import com.a508.backend.domain.user.service.UserRegistrationService;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

	private static final Long USER_ID = 1L;

	@Mock
	private UserRegistrationService
		userRegistrationService;

	@Mock
	private UserProfileService userProfileService;

	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		UserController userController =
			new UserController(
				userRegistrationService,
				userProfileService
			);

		mockMvc = MockMvcBuilders
			.standaloneSetup(userController)
			.setControllerAdvice(
				new GlobalExceptionHandler()
			)
			.setCustomArgumentResolvers(
				new AuthenticationPrincipalArgumentResolver()
			)
			.build();

		setAuthentication(USER_ID);
	}

	@AfterEach
	void tearDown() {
		SecurityContextHolder.clearContext();
	}

	@Test
	@DisplayName("인증된 사용자의 프로필을 조회한다")
	void getMyProfile() throws Exception {
		UserProfileResult result =
			new UserProfileResult(
				USER_ID,
				"Dust",
				OAuthProvider.GOOGLE,
				UserRole.USER
			);

		given(
			userProfileService.getMyProfile(USER_ID)
		).willReturn(result);

		mockMvc.perform(
				get("/api/v1/users/me")
			)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(
				jsonPath("$.data.userId")
					.value(USER_ID)
			)
			.andExpect(
				jsonPath("$.data.nickname")
					.value("Dust")
			)
			.andExpect(
				jsonPath("$.data.provider")
					.value("GOOGLE")
			)
			.andExpect(
				jsonPath("$.data.role")
					.value("USER")
			);

		verify(userProfileService)
			.getMyProfile(USER_ID);
	}

	@Test
	@DisplayName("프로필의 사용자가 없으면 401을 반환한다")
	void rejectMissingProfile() throws Exception {
		given(
			userProfileService.getMyProfile(USER_ID)
		).willThrow(
			new BusinessException(
				ExceptionType.UNAUTHENTICATED
			)
		);

		mockMvc.perform(
				get("/api/v1/users/me")
			)
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("A001"));
	}

	@Test
	@DisplayName("GUEST가 닉네임을 설정하면 USER 토큰을 반환한다")
	void registerNickname() throws Exception {
		AuthTokens tokens =
			new AuthTokens(
				"test-user-access-token",
				"test-user-refresh-token",
				1800L,
				Instant.parse(
					"2026-08-07T00:00:00Z"
				)
			);

		NicknameRegistrationResult result =
			new NicknameRegistrationResult(
				"Dust",
				UserRole.USER,
				tokens
			);

		given(
			userRegistrationService.completeRegistration(
				USER_ID,
				"Dust"
			)
		).willReturn(result);

		mockMvc.perform(
				patch("/api/v1/users/me/nickname")
					.contentType(
						MediaType.APPLICATION_JSON
					)
					.content("""
						{
						  "nickname": "Dust"
						}
						""")
			)
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(
				jsonPath("$.data.nickname")
					.value("Dust")
			)
			.andExpect(
				jsonPath("$.data.role")
					.value("USER")
			)
			.andExpect(
				jsonPath("$.data.accessToken")
					.value("test-user-access-token")
			)
			.andExpect(
				jsonPath("$.data.refreshToken")
					.value("test-user-refresh-token")
			)
			.andExpect(
				jsonPath(
					"$.data.accessTokenExpiresIn"
				).value(1800)
			);

		verify(userRegistrationService)
			.completeRegistration(USER_ID, "Dust");
	}

	@Test
	@DisplayName("닉네임이 비어 있으면 400을 반환한다")
	void rejectBlankNickname() throws Exception {
		mockMvc.perform(
				patch("/api/v1/users/me/nickname")
					.contentType(
						MediaType.APPLICATION_JSON
					)
					.content("""
						{
						  "nickname": ""
						}
						""")
			)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("C002"));

		verify(userRegistrationService, never())
			.completeRegistration(
				anyLong(),
				anyString()
			);
	}

	@Test
	@DisplayName("닉네임이 20자를 초과하면 400을 반환한다")
	void rejectLongNickname() throws Exception {
		mockMvc.perform(
				patch("/api/v1/users/me/nickname")
					.contentType(
						MediaType.APPLICATION_JSON
					)
					.content("""
						{
						  "nickname": "123456789012345678901"
						}
						""")
			)
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("C002"));

		verify(userRegistrationService, never())
			.completeRegistration(
				anyLong(),
				anyString()
			);
	}

	private void setAuthentication(Long userId) {
		AuthenticatedUser principal =
			new AuthenticatedUser(userId);

		UsernamePasswordAuthenticationToken authentication =
			UsernamePasswordAuthenticationToken.authenticated(
				principal,
				null,
				List.of()
			);

		SecurityContextHolder.getContext()
			.setAuthentication(authentication);
	}
}