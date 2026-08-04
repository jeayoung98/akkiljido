package com.a508.backend.domain.notification.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

import java.time.LocalTime;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.a508.backend.domain.notification.dto.NotificationPlaceResult;
import com.a508.backend.domain.notification.dto.request.NotificationPlaceUpdateRequest;
import com.a508.backend.domain.notification.entity.NotificationPlace;
import com.a508.backend.domain.notification.repository.NotificationPlaceRepository;
import com.a508.backend.domain.user.domain.User;
import com.a508.backend.domain.user.service.UserService;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;

@ExtendWith(MockitoExtension.class)
class NotificationPlaceUpdateServiceTest {

	private static final Long USER_ID = 1L;
	private static final Long NOTIFICATION_PLACE_ID = 1L;

	@Mock
	private NotificationPlaceRepository notificationPlaceRepository;

	@Mock
	private UserService userService;

	private NotificationPlaceService notificationPlaceService;
	private NotificationPlace notificationPlace;

	@BeforeEach
	void setUp() {
		notificationPlaceService = new NotificationPlaceService(
				notificationPlaceRepository,
				userService
		);

		User user = User.createGoogleGuest("google-sub");
		ReflectionTestUtils.setField(user, "id", USER_ID);

		notificationPlace = NotificationPlace.create(
				user,
				"회사",
				"서울 강남구 역삼동",
				37.5007,
				127.0365,
				LocalTime.of(9, 0),
				LocalTime.of(18, 0),
				"근무 시간 소비 알림"
		);
		ReflectionTestUtils.setField(
				notificationPlace,
				"id",
				NOTIFICATION_PLACE_ID
		);
	}

	@Test
	@DisplayName("알림 장소의 모든 정보를 수정한다")
	void updateNotificationPlace() {
		NotificationPlaceUpdateRequest request = request(
				" 사무실 ",
				" 서울 서초구 서초동 ",
				37.4923,
				127.0292,
				"10:00",
				"19:00",
				" 퇴근 전 소비 알림 "
		);

		givenOwnedNotificationPlace();
		given(
				notificationPlaceRepository
						.existsByUser_IdAndNotificationPlaceNameAndIdNot(
								USER_ID,
								"사무실",
								NOTIFICATION_PLACE_ID
						)
		).willReturn(false);

		NotificationPlaceResult result =
				notificationPlaceService.updateNotificationPlace(
						USER_ID,
						NOTIFICATION_PLACE_ID,
						request
				);

		assertThat(result.notificationPlaceId()).isEqualTo(NOTIFICATION_PLACE_ID);
		assertThat(result.notificationPlaceName()).isEqualTo("사무실");
		assertThat(result.address()).isEqualTo("서울 서초구 서초동");
		assertThat(result.latitude()).isEqualTo(37.4923);
		assertThat(result.longitude()).isEqualTo(127.0292);
		assertThat(result.startTime()).isEqualTo(LocalTime.of(10, 0));
		assertThat(result.endTime()).isEqualTo(LocalTime.of(19, 0));
		assertThat(result.reason()).isEqualTo("퇴근 전 소비 알림");
		assertThat(result.active()).isTrue();

		then(notificationPlaceRepository)
				.should()
				.findByIdAndUser_Id(NOTIFICATION_PLACE_ID, USER_ID);
		then(notificationPlaceRepository)
				.should()
				.existsByUser_IdAndNotificationPlaceNameAndIdNot(
						USER_ID,
						"사무실",
						NOTIFICATION_PLACE_ID
				);
		then(notificationPlaceRepository).should(never()).save(any());
	}

	@Test
	@DisplayName("알림 장소의 일부 정보만 수정한다")
	void updateNotificationPlacePartially() {
		NotificationPlaceUpdateRequest request = request(
				null,
				null,
				null,
				null,
				null,
				null,
				" 점심 소비 주의 "
		);

		givenOwnedNotificationPlace();

		NotificationPlaceResult result =
				notificationPlaceService.updateNotificationPlace(
						USER_ID,
						NOTIFICATION_PLACE_ID,
						request
				);

		assertThat(result.notificationPlaceName()).isEqualTo("회사");
		assertThat(result.address()).isEqualTo("서울 강남구 역삼동");
		assertThat(result.startTime()).isEqualTo(LocalTime.of(9, 0));
		assertThat(result.endTime()).isEqualTo(LocalTime.of(18, 0));
		assertThat(result.reason()).isEqualTo("점심 소비 주의");
		assertThat(result.active()).isTrue();

		then(notificationPlaceRepository)
				.should(never())
				.existsByUser_IdAndNotificationPlaceNameAndIdNot(
						anyLong(),
						anyString(),
						anyLong()
				);
	}

	@Test
	@DisplayName("알림 장소를 비활성화한다")
	void deactivateNotificationPlace() {
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

		givenOwnedNotificationPlace();

		NotificationPlaceResult result =
				notificationPlaceService.updateNotificationPlace(
						USER_ID,
						NOTIFICATION_PLACE_ID,
						request
				);

		assertThat(result.active()).isFalse();
		assertThat(notificationPlace.isActive()).isFalse();

		then(notificationPlaceRepository)
				.should()
				.findByIdAndUser_Id(NOTIFICATION_PLACE_ID, USER_ID);
		then(notificationPlaceRepository).should(never()).save(any());
	}

	@Test
	@DisplayName("알림 장소 시간을 자정을 넘기는 범위로 수정한다")
	void updateNotificationPlaceAcrossMidnight() {
		NotificationPlaceUpdateRequest request = request(
				null,
				null,
				null,
				null,
				"23:00",
				"01:00",
				null
		);

		givenOwnedNotificationPlace();

		NotificationPlaceResult result =
				notificationPlaceService.updateNotificationPlace(
						USER_ID,
						NOTIFICATION_PLACE_ID,
						request
				);

		assertThat(result.startTime()).isEqualTo(LocalTime.of(23, 0));
		assertThat(result.endTime()).isEqualTo(LocalTime.of(1, 0));
	}

	@Test
	@DisplayName("기존 장소 이름을 유지하는 수정 요청을 허용한다")
	void updateWithSameNotificationPlaceName() {
		NotificationPlaceUpdateRequest request = request(
				"회사",
				null,
				null,
				null,
				null,
				null,
				null
		);

		givenOwnedNotificationPlace();
		given(
				notificationPlaceRepository
						.existsByUser_IdAndNotificationPlaceNameAndIdNot(
								USER_ID,
								"회사",
								NOTIFICATION_PLACE_ID
						)
		).willReturn(false);

		NotificationPlaceResult result =
				notificationPlaceService.updateNotificationPlace(
						USER_ID,
						NOTIFICATION_PLACE_ID,
						request
				);

		assertThat(result.notificationPlaceName()).isEqualTo("회사");
	}

	@Test
	@DisplayName("다른 알림 장소와 이름이 중복되면 수정을 거부한다")
	void rejectDuplicateNotificationPlaceName() {
		NotificationPlaceUpdateRequest request = request(
				"카페",
				null,
				null,
				null,
				null,
				null,
				null
		);

		givenOwnedNotificationPlace();
		given(
				notificationPlaceRepository
						.existsByUser_IdAndNotificationPlaceNameAndIdNot(
								USER_ID,
								"카페",
								NOTIFICATION_PLACE_ID
						)
		).willReturn(true);

		BusinessException exception = catchThrowableOfType(
				() -> notificationPlaceService.updateNotificationPlace(
						USER_ID,
						NOTIFICATION_PLACE_ID,
						request
				),
				BusinessException.class
		);

		assertThat(exception.getExceptionType())
				.isEqualTo(ExceptionType.DUPLICATE_NOTIFICATION_PLACE_NAME);
		assertThat(notificationPlace.getNotificationPlaceName()).isEqualTo("회사");
	}

	@Test
	@DisplayName("존재하지 않는 알림 장소는 수정할 수 없다")
	void rejectMissingNotificationPlace() {
		NotificationPlaceUpdateRequest request = request(
				"사무실",
				null,
				null,
				null,
				null,
				null,
				null
		);

		given(
				notificationPlaceRepository.findByIdAndUser_Id(
						NOTIFICATION_PLACE_ID,
						USER_ID
				)
		).willReturn(Optional.empty());

		BusinessException exception = catchThrowableOfType(
				() -> notificationPlaceService.updateNotificationPlace(
						USER_ID,
						NOTIFICATION_PLACE_ID,
						request
				),
				BusinessException.class
		);

		assertThat(exception.getExceptionType())
				.isEqualTo(ExceptionType.NOTIFICATION_PLACE_NOT_FOUND);

		then(notificationPlaceRepository)
				.should(never())
				.existsByUser_IdAndNotificationPlaceNameAndIdNot(
						anyLong(),
						anyString(),
						anyLong()
				);
	}

	@Test
	@DisplayName("다른 사용자가 소유한 알림 장소는 수정할 수 없다")
	void rejectAnotherUserNotificationPlace() {
		Long anotherUserId = 2L;

		NotificationPlaceUpdateRequest request = request(
				"사무실",
				null,
				null,
				null,
				null,
				null,
				null
		);

		given(
				notificationPlaceRepository.findByIdAndUser_Id(
						NOTIFICATION_PLACE_ID,
						anotherUserId
				)
		).willReturn(Optional.empty());

		BusinessException exception = catchThrowableOfType(
				() -> notificationPlaceService.updateNotificationPlace(
						anotherUserId,
						NOTIFICATION_PLACE_ID,
						request
				),
				BusinessException.class
		);

		assertThat(exception.getExceptionType())
				.isEqualTo(ExceptionType.NOTIFICATION_PLACE_NOT_FOUND);
	}

	private void givenOwnedNotificationPlace() {
		given(
				notificationPlaceRepository.findByIdAndUser_Id(
						NOTIFICATION_PLACE_ID,
						USER_ID
				)
		).willReturn(Optional.of(notificationPlace));
	}

	private NotificationPlaceUpdateRequest request(
			String notificationPlaceName,
			String address,
			Double latitude,
			Double longitude,
			String startTime,
			String endTime,
			String reason
	) {
		return new NotificationPlaceUpdateRequest(
				notificationPlaceName,
				address,
				latitude,
				longitude,
				startTime,
				endTime,
				reason,
				null
		);
	}
}
