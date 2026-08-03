package com.a508.backend.domain.notification.controller;

import static org.mockito.BDDMockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.*;

import java.time.LocalTime;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;

import com.a508.backend.domain.notification.dto.NotificationPlaceResult;
import com.a508.backend.domain.notification.service.NotificationPlaceService;
import com.a508.backend.global.exception.GlobalExceptionHandler;
import com.a508.backend.global.security.AuthenticatedUser;

@ExtendWith(MockitoExtension.class)
class NotificationPlaceControllerTest {

	private static final Long USER_ID = 1L;

	@Mock
	private NotificationPlaceService notificationPlaceService;

	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		NotificationPlaceController controller =
			new NotificationPlaceController(notificationPlaceService);

		mockMvc = standaloneSetup(controller)
			.setControllerAdvice(new GlobalExceptionHandler())
			.setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
			.build();

		setAuthentication(USER_ID);
	}

	@AfterEach
	void tearDown() {
		SecurityContextHolder.clearContext();
	}

	@Test
	@DisplayName("GET /api/v1/notification은 로그인 사용자의 알림 장소 목록을 반환한다")
	void getNotificationPlaces() throws Exception {
		given(notificationPlaceService.getNotificationPlaces(USER_ID))
			.willReturn(
				List.of(
					result(
						1L,
						"회사",
						"서울 강남구 역삼동",
						37.5007,
						127.0365,
						LocalTime.of(8, 30),
						LocalTime.of(9, 30),
						"출근 시간 소비 알림"
					),
					result(
						2L,
						"카페",
						"서울 마포구 서교동",
						37.5563,
						126.9236,
						LocalTime.of(12, 0),
						LocalTime.of(13, 0),
						"점심시간 과소비 방지"
					)
				)
			);

		mockMvc.perform(get("/api/v1/notification"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.notificationList.length()").value(2))
			.andExpect(jsonPath("$.data.notificationList[0].notificationPlaceId").value(1))
			.andExpect(jsonPath("$.data.notificationList[0].notificationPlaceName").value("회사"))
			.andExpect(jsonPath("$.data.notificationList[0].address").value("서울 강남구 역삼동"))
			.andExpect(jsonPath("$.data.notificationList[0].latitude").value(37.5007))
			.andExpect(jsonPath("$.data.notificationList[0].longitude").value(127.0365))
			.andExpect(jsonPath("$.data.notificationList[0].startTime").value("08:30"))
			.andExpect(jsonPath("$.data.notificationList[0].endTime").value("09:30"))
			.andExpect(jsonPath("$.data.notificationList[0].reason").value("출근 시간 소비 알림"))
			.andExpect(jsonPath("$.data.notificationList[1].notificationPlaceId").value(2))
			.andExpect(jsonPath("$.data.notificationList[1].notificationPlaceName").value("카페"));

		then(notificationPlaceService)
			.should()
			.getNotificationPlaces(USER_ID);
	}

	@Test
	@DisplayName("등록한 알림 장소가 없으면 notificationList에 빈 배열을 반환한다")
	void getEmptyNotificationPlaces() throws Exception {
		given(notificationPlaceService.getNotificationPlaces(USER_ID))
			.willReturn(List.of());

		mockMvc.perform(get("/api/v1/notification"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.notificationList").isArray())
			.andExpect(jsonPath("$.data.notificationList").isEmpty());

		then(notificationPlaceService)
			.should()
			.getNotificationPlaces(USER_ID);
	}

	@Test
	@DisplayName("JWT principal의 사용자 ID를 목록 조회 조건으로 전달한다")
	void useAuthenticatedUserId() throws Exception {
		Long anotherUserId = 99L;
		setAuthentication(anotherUserId);

		given(notificationPlaceService.getNotificationPlaces(anotherUserId))
			.willReturn(List.of());

		mockMvc.perform(get("/api/v1/notification"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true));

		then(notificationPlaceService)
			.should()
			.getNotificationPlaces(anotherUserId);

		then(notificationPlaceService)
			.should(never())
			.getNotificationPlaces(USER_ID);
	}

	private void setAuthentication(Long userId) {
		AuthenticatedUser principal = new AuthenticatedUser(userId);

		UsernamePasswordAuthenticationToken authentication =
			UsernamePasswordAuthenticationToken.authenticated(
				principal,
				null,
				List.of()
			);

		SecurityContextHolder.getContext().setAuthentication(authentication);
	}

	private NotificationPlaceResult result(
		Long notificationPlaceId,
		String notificationPlaceName,
		String address,
		Double latitude,
		Double longitude,
		LocalTime startTime,
		LocalTime endTime,
		String reason
	) {
		return new NotificationPlaceResult(
			notificationPlaceId,
			notificationPlaceName,
			address,
			latitude,
			longitude,
			startTime,
			endTime,
			reason
		);
	}
}
