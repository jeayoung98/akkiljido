package com.a508.backend.domain.notification.entity;

import static org.assertj.core.api.Assertions.*;

import java.time.LocalTime;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.a508.backend.domain.user.domain.User;

class NotificationPlaceTest {

	private User user;

	@BeforeEach
	void setUp() {
		user = User.createGoogleGuest("google-sub");
	}

	@Test
	@DisplayName("사용자가 지정한 시작 및 종료 시각으로 알림 장소를 생성한다")
	void createNotificationTimeRange() {
		NotificationPlace notificationPlace = createNotificationPlace(
			LocalTime.of(9, 0),
			LocalTime.of(18, 0)
		);

		assertThat(notificationPlace.getStartTime())
			.isEqualTo(LocalTime.of(9, 0));
		assertThat(notificationPlace.getEndTime())
			.isEqualTo(LocalTime.of(18, 0));
	}

	@Test
	@DisplayName("알림 시작 및 종료 시각을 함께 변경한다")
	void updateNotificationTimeRange() {
		NotificationPlace notificationPlace = createNotificationPlace(
			LocalTime.of(9, 0),
			LocalTime.of(18, 0)
		);

		notificationPlace.updateNotificationTimeRange(
			LocalTime.of(10, 30),
			LocalTime.of(19, 30)
		);

		assertThat(notificationPlace.getStartTime())
			.isEqualTo(LocalTime.of(10, 30));
		assertThat(notificationPlace.getEndTime())
			.isEqualTo(LocalTime.of(19, 30));
	}

	private NotificationPlace createNotificationPlace(
		LocalTime startTime,
		LocalTime endTime
	) {
		return NotificationPlace.create(
			user,
			"회사",
			"서울 강남구 역삼동",
			37.5007,
			127.0365,
			startTime,
			endTime,
			"근무 시간 소비 알림"
		);
	}
}
