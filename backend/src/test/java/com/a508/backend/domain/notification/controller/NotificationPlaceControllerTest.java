package com.a508.backend.domain.notification.controller;

import static org.mockito.ArgumentMatchers.*;
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
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;

import com.a508.backend.domain.notification.dto.NotificationPlaceResult;
import com.a508.backend.domain.notification.dto.request.NotificationPlaceUpdateRequest;
import com.a508.backend.domain.notification.service.NotificationPlaceService;
import com.a508.backend.global.exception.GlobalExceptionHandler;
import com.a508.backend.global.security.AuthenticatedUser;
import com.fasterxml.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class NotificationPlaceUpdateControllerTest {

	private static final Long USER_ID = 1L;
	private static final Long NOTIFICATION_PLACE_ID = 1L;

	@Mock
	private NotificationPlaceService notificationPlaceService;

	private MockMvc mockMvc;
	private ObjectMapper objectMapper;

	@BeforeEach
	void setUp() {
		NotificationPlaceController controller =
				new NotificationPlaceController(notificationPlaceService);

		mockMvc = standaloneSetup(controller)
				.setControllerAdvice(new GlobalExceptionHandler())
				.setCustomArgumentResolvers(
						new AuthenticationPrincipalArgumentResolver()
				)
				.build();

		objectMapper = new ObjectMapper();
		setAuthentication(USER_ID);
	}

	@AfterEach
	void tearDown() {
		SecurityContextHolder.clearContext();
	}

	@Test
	@DisplayName("PATCH /api/v1/notification/{id}는 알림 장소를 수정한다")
	void updateNotificationPlace() throws Exception {
		NotificationPlaceUpdateRequest request =
				new NotificationPlaceUpdateRequest(
						"사무실",
						"서울 서초구 서초동",
						37.4923,
						127.0292,
						"10:00",
						"19:00",
						"퇴근 전 소비 알림",
						null
				);

		NotificationPlaceResult result = new NotificationPlaceResult(
				NOTIFICATION_PLACE_ID,
				"사무실",
				"서울 서초구 서초동",
				37.4923,
				127.0292,
				LocalTime.of(10, 0),
				LocalTime.of(19, 0),
				"퇴근 전 소비 알림",
				true
		);

		given(
				notificationPlaceService.updateNotificationPlace(
						USER_ID,
						NOTIFICATION_PLACE_ID,
						request
				)
		).willReturn(result);

		mockMvc.perform(
						patch(
								"/api/v1/notification/{notificationPlaceId}",
								NOTIFICATION_PLACE_ID
						)
								.contentType(MediaType.APPLICATION_JSON)
								.content(objectMapper.writeValueAsString(request))
				)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.notificationPlaceId").value(1))
				.andExpect(jsonPath("$.data.notificationPlaceName").value("사무실"))
				.andExpect(jsonPath("$.data.address").value("서울 서초구 서초동"))
				.andExpect(jsonPath("$.data.latitude").value(37.4923))
				.andExpect(jsonPath("$.data.longitude").value(127.0292))
				.andExpect(jsonPath("$.data.startTime").value("10:00"))
				.andExpect(jsonPath("$.data.endTime").value("19:00"))
				.andExpect(jsonPath("$.data.reason").value("퇴근 전 소비 알림"))
				.andExpect(jsonPath("$.data.active").value(true));

		then(notificationPlaceService)
				.should()
				.updateNotificationPlace(
						USER_ID,
						NOTIFICATION_PLACE_ID,
						request
				);
	}

	@Test
	@DisplayName("일부 필드만 입력해 알림 장소를 수정한다")
	void updateNotificationPlacePartially() throws Exception {
		NotificationPlaceUpdateRequest request =
				new NotificationPlaceUpdateRequest(
						null,
						null,
						null,
						null,
						null,
						null,
						"점심 소비 주의",
						null
				);

		NotificationPlaceResult result = new NotificationPlaceResult(
				NOTIFICATION_PLACE_ID,
				"회사",
				"서울 강남구 역삼동",
				37.5007,
				127.0365,
				LocalTime.of(9, 0),
				LocalTime.of(18, 0),
				"점심 소비 주의",
				true
		);

		given(
				notificationPlaceService.updateNotificationPlace(
						USER_ID,
						NOTIFICATION_PLACE_ID,
						request
				)
		).willReturn(result);

		mockMvc.perform(
						patch(
								"/api/v1/notification/{notificationPlaceId}",
								NOTIFICATION_PLACE_ID
						)
								.contentType(MediaType.APPLICATION_JSON)
								.content(objectMapper.writeValueAsString(request))
				)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.notificationPlaceName").value("회사"))
				.andExpect(jsonPath("$.data.reason").value("점심 소비 주의"))
				.andExpect(jsonPath("$.data.active").value(true));
	}

	@Test
	@DisplayName("active만 입력해 알림 장소를 비활성화한다")
	void deactivateNotificationPlace() throws Exception {
		NotificationPlaceUpdateRequest request =
				new NotificationPlaceUpdateRequest(
						null,
						null,
						null,
						null,
						null,
						null,
						null,
						false
				);

		NotificationPlaceResult result = new NotificationPlaceResult(
				NOTIFICATION_PLACE_ID,
				"회사",
				"서울 강남구 역삼동",
				37.5007,
				127.0365,
				LocalTime.of(9, 0),
				LocalTime.of(18, 0),
				"근무 시간 소비 알림",
				false
		);

		given(
				notificationPlaceService.updateNotificationPlace(
						USER_ID,
						NOTIFICATION_PLACE_ID,
						request
				)
		).willReturn(result);

		mockMvc.perform(
						patch(
								"/api/v1/notification/{notificationPlaceId}",
								NOTIFICATION_PLACE_ID
						)
								.contentType(MediaType.APPLICATION_JSON)
								.content(objectMapper.writeValueAsString(request))
				)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.notificationPlaceId").value(1))
				.andExpect(jsonPath("$.data.active").value(false));

		then(notificationPlaceService)
				.should()
				.updateNotificationPlace(
						USER_ID,
						NOTIFICATION_PLACE_ID,
						request
				);
	}

	@Test
	@DisplayName("수정할 정보가 없으면 N004를 반환한다")
	void rejectEmptyUpdateRequest() throws Exception {
		NotificationPlaceUpdateRequest request =
				new NotificationPlaceUpdateRequest(
						null,
						null,
						null,
						null,
						null,
						null,
						null,
						null
				);

		mockMvc.perform(
						patch(
								"/api/v1/notification/{notificationPlaceId}",
								NOTIFICATION_PLACE_ID
						)
								.contentType(MediaType.APPLICATION_JSON)
								.content(objectMapper.writeValueAsString(request))
				)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.success").value(false))
				.andExpect(jsonPath("$.code").value("N004"));

		then(notificationPlaceService)
				.should(never())
				.updateNotificationPlace(anyLong(), anyLong(), any());
	}

	@Test
	@DisplayName("주소와 좌표를 일부만 입력하면 N001을 반환한다")
	void rejectIncompleteLocation() throws Exception {
		NotificationPlaceUpdateRequest request =
				new NotificationPlaceUpdateRequest(
						null,
						"서울 강남구 역삼동",
						null,
						null,
						null,
						null,
						null,
						null
				);

		mockMvc.perform(
						patch(
								"/api/v1/notification/{notificationPlaceId}",
								NOTIFICATION_PLACE_ID
						)
								.contentType(MediaType.APPLICATION_JSON)
								.content(objectMapper.writeValueAsString(request))
				)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.success").value(false))
				.andExpect(jsonPath("$.code").value("N001"));

		then(notificationPlaceService)
				.should(never())
				.updateNotificationPlace(anyLong(), anyLong(), any());
	}

	@Test
	@DisplayName("시작 시간과 종료 시간이 같으면 N003을 반환한다")
	void rejectSameStartTimeAndEndTime() throws Exception {
		NotificationPlaceUpdateRequest request =
				new NotificationPlaceUpdateRequest(
						null,
						null,
						null,
						null,
						"09:00",
						"09:00",
						null,
						null
				);

		mockMvc.perform(
						patch(
								"/api/v1/notification/{notificationPlaceId}",
								NOTIFICATION_PLACE_ID
						)
								.contentType(MediaType.APPLICATION_JSON)
								.content(objectMapper.writeValueAsString(request))
				)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.success").value(false))
				.andExpect(jsonPath("$.code").value("N003"));

		then(notificationPlaceService)
				.should(never())
				.updateNotificationPlace(anyLong(), anyLong(), any());
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
}
