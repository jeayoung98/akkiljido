package com.a508.backend.domain.notification.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.BDDMockito.*;

import java.time.LocalTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.a508.backend.domain.notification.dto.NotificationPlaceResult;
import com.a508.backend.domain.notification.entity.NotificationPlace;
import com.a508.backend.domain.notification.repository.NotificationPlaceRepository;

@ExtendWith(MockitoExtension.class)
class NotificationPlaceServiceTest {

	private static final Long USER_ID = 1L;

	@Mock
	private NotificationPlaceRepository notificationPlaceRepository;

	private NotificationPlaceService notificationPlaceService;

	@BeforeEach
	void setUp() {
		notificationPlaceService = new NotificationPlaceService(notificationPlaceRepository);
	}

	@Test
	@DisplayName("로그인 사용자의 알림 장소 목록을 조회한다")
	void getNotificationPlaces() {
		NotificationPlace firstPlace = notificationPlace(
			1L,
			"회사",
			"서울 강남구 역삼동",
			37.5007,
			127.0365,
			LocalTime.of(8, 30),
			LocalTime.of(9, 30),
			"출근 시간 소비 알림"
		);
		NotificationPlace secondPlace = notificationPlace(
			2L,
			"카페",
			"서울 마포구 서교동",
			37.5563,
			126.9236,
			LocalTime.of(12, 0),
			LocalTime.of(13, 0),
			"점심시간 과소비 방지"
		);

		given(notificationPlaceRepository.findAllByUser_IdOrderByIdAsc(USER_ID))
			.willReturn(List.of(firstPlace, secondPlace));

		List<NotificationPlaceResult> results =
			notificationPlaceService.getNotificationPlaces(USER_ID);

		assertThat(results).hasSize(2);

		assertThat(results.get(0).notificationPlaceId()).isEqualTo(1L);
		assertThat(results.get(0).notificationPlaceName()).isEqualTo("회사");
		assertThat(results.get(0).address()).isEqualTo("서울 강남구 역삼동");
		assertThat(results.get(0).latitude()).isEqualTo(37.5007);
		assertThat(results.get(0).longitude()).isEqualTo(127.0365);
		assertThat(results.get(0).startTime()).isEqualTo(LocalTime.of(8, 30));
		assertThat(results.get(0).endTime()).isEqualTo(LocalTime.of(9, 30));
		assertThat(results.get(0).reason()).isEqualTo("출근 시간 소비 알림");

		assertThat(results.get(1).notificationPlaceId()).isEqualTo(2L);
		assertThat(results.get(1).notificationPlaceName()).isEqualTo("카페");

		then(notificationPlaceRepository)
			.should()
			.findAllByUser_IdOrderByIdAsc(USER_ID);
	}

	@Test
	@DisplayName("등록한 알림 장소가 없으면 빈 목록을 반환한다")
	void getEmptyNotificationPlaces() {
		given(notificationPlaceRepository.findAllByUser_IdOrderByIdAsc(USER_ID))
			.willReturn(List.of());

		List<NotificationPlaceResult> results =
			notificationPlaceService.getNotificationPlaces(USER_ID);

		assertThat(results).isEmpty();

		then(notificationPlaceRepository)
			.should()
			.findAllByUser_IdOrderByIdAsc(USER_ID);
	}

	private NotificationPlace notificationPlace(
		Long notificationPlaceId,
		String notificationPlaceName,
		String address,
		Double latitude,
		Double longitude,
		LocalTime startTime,
		LocalTime endTime,
		String reason
	) {
		NotificationPlace notificationPlace = mock(NotificationPlace.class);

		given(notificationPlace.getId()).willReturn(notificationPlaceId);
		given(notificationPlace.getNotificationPlaceName()).willReturn(notificationPlaceName);
		given(notificationPlace.getAddress()).willReturn(address);
		given(notificationPlace.getLatitude()).willReturn(latitude);
		given(notificationPlace.getLongitude()).willReturn(longitude);
		given(notificationPlace.getStartTime()).willReturn(startTime);
		given(notificationPlace.getEndTime()).willReturn(endTime);
		given(notificationPlace.getReason()).willReturn(reason);

		return notificationPlace;
	}
}
