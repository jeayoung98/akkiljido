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
	@DisplayName("기준 알림 시각의 전후 30분으로 시작 및 종료 시각을 설정한다")
	void createNotificationTimeWindow() {
		NotificationPlace notificationPlace = createNotificationPlace(
			LocalTime.of(9, 0)
		);

		assertThat(notificationPlace.getStartTime())
			.isEqualTo(LocalTime.of(8, 30));
		assertThat(notificationPlace.getEndTime())
			.isEqualTo(LocalTime.of(9, 30));
	}

	@Test
	@DisplayName("기준 알림 시각이 자정 직후이면 시작 시각이 전날 시각으로 순환한다")
	void createNotificationTimeWindowAfterMidnight() {
		NotificationPlace notificationPlace = createNotificationPlace(
			LocalTime.of(0, 10)
		);

		assertThat(notificationPlace.getStartTime())
			.isEqualTo(LocalTime.of(23, 40));
		assertThat(notificationPlace.getEndTime())
			.isEqualTo(LocalTime.of(0, 40));
	}

	@Test
	@DisplayName("기준 알림 시각이 자정 직전이면 종료 시각이 다음 날 시각으로 순환한다")
	void createNotificationTimeWindowBeforeMidnight() {
		NotificationPlace notificationPlace = createNotificationPlace(
			LocalTime.of(23, 50)
		);

		assertThat(notificationPlace.getStartTime())
			.isEqualTo(LocalTime.of(23, 20));
		assertThat(notificationPlace.getEndTime())
			.isEqualTo(LocalTime.of(0, 20));
	}

	@Test
	@DisplayName("기준 알림 시각을 변경하면 시작 및 종료 시각을 함께 갱신한다")
	void updateNotificationTime() {
		NotificationPlace notificationPlace = createNotificationPlace(
			LocalTime.of(9, 0)
		);

		notificationPlace.updateNotificationTime(LocalTime.of(14, 30));

		assertThat(notificationPlace.getStartTime())
			.isEqualTo(LocalTime.of(14, 0));
		assertThat(notificationPlace.getEndTime())
			.isEqualTo(LocalTime.of(15, 0));
	}

	private NotificationPlace createNotificationPlace(LocalTime notificationTime) {
		return NotificationPlace.create(
			user,
			"회사",
			"서울 강남구 역삼동",
			37.5007,
			127.0365,
			notificationTime,
			"출근 시간 소비 알림"
		);
	}
}
