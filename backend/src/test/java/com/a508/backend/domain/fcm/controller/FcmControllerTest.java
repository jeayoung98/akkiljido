package com.a508.backend.domain.fcm.controller;

import static org.mockito.Mockito.*;
import static org.springframework.http.MediaType.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.a508.backend.domain.fcm.dto.FcmTokenRegisterRequest;
import com.a508.backend.domain.fcm.entity.DeviceType;
import com.a508.backend.domain.fcm.service.FcmService;
import com.a508.backend.global.exception.GlobalExceptionHandler;
import com.a508.backend.global.security.AuthenticatedUser;

class FcmControllerTest {

	private static final Long USER_ID = 1L;
	private static final String PUSH_TOKEN = "fcm-push-token";

	private final FcmService fcmService = mock(FcmService.class);
	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		mockMvc = MockMvcBuilders.standaloneSetup(new FcmController(fcmService))
			.setControllerAdvice(new GlobalExceptionHandler())
			.setMessageConverters(new JacksonJsonHttpMessageConverter())
			.setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
			.build();

		UsernamePasswordAuthenticationToken authentication =
			UsernamePasswordAuthenticationToken.authenticated(
				new AuthenticatedUser(USER_ID),
				null,
				List.of()
			);

		SecurityContextHolder.getContext().setAuthentication(authentication);
	}

	@AfterEach
	void tearDown() {
		SecurityContextHolder.clearContext();
	}

	@Test
	@DisplayName("POST /api/v1/fcm은 로그인 사용자의 푸시 토큰을 등록한다")
	void registerPushToken() throws Exception {
		mockMvc.perform(post("/api/v1/fcm")
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "deviceType": "ANDROID",
					  "pushToken": "fcm-push-token"
					}
					"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true));

		verify(fcmService).registerPushToken(
			USER_ID,
			new FcmTokenRegisterRequest(DeviceType.ANDROID, PUSH_TOKEN)
		);
	}

	@Test
	@DisplayName("푸시 토큰이 공백이면 400과 C002를 반환한다")
	void rejectBlankPushToken() throws Exception {
		mockMvc.perform(post("/api/v1/fcm")
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "deviceType": "ANDROID",
					  "pushToken": " "
					}
					"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("C002"))
			.andExpect(jsonPath("$.msg").value("푸시 토큰은 필수입니다."));

		verifyNoInteractions(fcmService);
	}

	@Test
	@DisplayName("기기 종류가 누락되면 400과 C002를 반환한다")
	void rejectMissingDeviceType() throws Exception {
		mockMvc.perform(post("/api/v1/fcm")
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "pushToken": "fcm-push-token"
					}
					"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("C002"))
			.andExpect(jsonPath("$.msg").value("기기 종류는 필수입니다."));

		verifyNoInteractions(fcmService);
	}

	@Test
	@DisplayName("지원하지 않는 기기 종류이면 400과 C004를 반환한다")
	void rejectInvalidDeviceType() throws Exception {
		mockMvc.perform(post("/api/v1/fcm")
				.contentType(APPLICATION_JSON)
				.content("""
					{
					  "deviceType": "WINDOWS",
					  "pushToken": "fcm-push-token"
					}
					"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("C004"));

		verifyNoInteractions(fcmService);
	}
}
