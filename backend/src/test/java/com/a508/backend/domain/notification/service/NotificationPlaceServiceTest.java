package com.a508.backend.domain.notification.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

import java.time.LocalTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.a508.backend.domain.notification.dto.NotificationPlaceResult;
import com.a508.backend.domain.notification.dto.request.NotificationPlaceCreateRequest;
import com.a508.backend.domain.notification.entity.NotificationPlace;
import com.a508.backend.domain.notification.repository.NotificationPlaceRepository;
import com.a508.backend.domain.user.domain.User;
import com.a508.backend.domain.user.service.UserService;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;

@ExtendWith(MockitoExtension.class)
class NotificationPlaceServiceTest {

	private static final Long USER_ID = 1L;

	@Mock
	private NotificationPlaceRepository notificationPlaceRepository;

	@Mock
	private UserService userService;

	private NotificationPlaceService notificationPlaceService;
	private User user;

	@BeforeEach
	void setUp() {
		notificationPlaceService = new NotificationPlaceService(
			notificationPlaceRepository,
			userService
		);
		user = User.createGoogleGuest("google-sub");
		ReflectionTestUtils.setField(user, "id", USER_ID);
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

	@Test
	@DisplayName("알림 장소를 등록하고 정규화된 결과를 반환한다")
	void createNotificationPlace() {
		NotificationPlaceCreateRequest request = new NotificationPlaceCreateRequest(
			" 회사 ",
			" 서울 강남구 역삼동 ",
			37.5007,
			127.0365,
			"09:00",
			"18:00",
			" 근무 시간 소비 알림 "
		);

		given(
			notificationPlaceRepository.existsByUser_IdAndNotificationPlaceName(
				USER_ID,
				"회사"
			)
		).willReturn(false);
		given(userService.getUser(USER_ID)).willReturn(user);
		given(notificationPlaceRepository.save(any(NotificationPlace.class)))
			.willAnswer(invocation -> {
				NotificationPlace notificationPlace = invocation.getArgument(0);
				ReflectionTestUtils.setField(notificationPlace, "id", 1L);
				return notificationPlace;
			});

		NotificationPlaceResult result =
			notificationPlaceService.createNotificationPlace(USER_ID, request);

		assertThat(result.notificationPlaceId()).isEqualTo(1L);
		assertThat(result.notificationPlaceName()).isEqualTo("회사");
		assertThat(result.address()).isEqualTo("서울 강남구 역삼동");
		assertThat(result.latitude()).isEqualTo(37.5007);
		assertThat(result.longitude()).isEqualTo(127.0365);
		assertThat(result.startTime()).isEqualTo(LocalTime.of(9, 0));
		assertThat(result.endTime()).isEqualTo(LocalTime.of(18, 0));
		assertThat(result.reason()).isEqualTo("근무 시간 소비 알림");

		ArgumentCaptor<NotificationPlace> captor =
			ArgumentCaptor.forClass(NotificationPlace.class);

		then(notificationPlaceRepository)
			.should()
			.save(captor.capture());

		NotificationPlace savedNotificationPlace = captor.getValue();

		assertThat(savedNotificationPlace.getUser()).isSameAs(user);
		assertThat(savedNotificationPlace.getNotificationPlaceName()).isEqualTo("회사");
		assertThat(savedNotificationPlace.getAddress()).isEqualTo("서울 강남구 역삼동");
		assertThat(savedNotificationPlace.getStartTime()).isEqualTo(LocalTime.of(9, 0));
		assertThat(savedNotificationPlace.getEndTime()).isEqualTo(LocalTime.of(18, 0));
		assertThat(savedNotificationPlace.getReason()).isEqualTo("근무 시간 소비 알림");

		then(userService).should().getUser(USER_ID);
	}

	@Test
	@DisplayName("자정을 넘기는 알림 시간 범위를 등록한다")
	void createNotificationPlaceAcrossMidnight() {
		NotificationPlaceCreateRequest request = new NotificationPlaceCreateRequest(
			"야간 편의점",
			"서울 강남구 역삼동",
			37.5007,
			127.0365,
			"23:00",
			"01:00",
			"야간 소비 알림"
		);

		given(
			notificationPlaceRepository.existsByUser_IdAndNotificationPlaceName(
				USER_ID,
				"야간 편의점"
			)
		).willReturn(false);
		given(userService.getUser(USER_ID)).willReturn(user);
		given(notificationPlaceRepository.save(any(NotificationPlace.class)))
			.willAnswer(invocation -> {
				NotificationPlace notificationPlace = invocation.getArgument(0);
				ReflectionTestUtils.setField(notificationPlace, "id", 2L);
				return notificationPlace;
			});

		NotificationPlaceResult result =
			notificationPlaceService.createNotificationPlace(USER_ID, request);

		assertThat(result.startTime()).isEqualTo(LocalTime.of(23, 0));
		assertThat(result.endTime()).isEqualTo(LocalTime.of(1, 0));
	}

	@Test
	@DisplayName("동일한 사용자의 알림 장소 이름이 중복되면 등록을 거부한다")
	void rejectDuplicateNotificationPlaceName() {
		NotificationPlaceCreateRequest request = new NotificationPlaceCreateRequest(
			"회사",
			"서울 강남구 역삼동",
			37.5007,
			127.0365,
			"09:00",
			"18:00",
			"근무 시간 소비 알림"
		);

		given(
			notificationPlaceRepository.existsByUser_IdAndNotificationPlaceName(
				USER_ID,
				"회사"
			)
		).willReturn(true);

		BusinessException exception = catchThrowableOfType(
			() -> notificationPlaceService.createNotificationPlace(USER_ID, request),
			BusinessException.class
		);

		assertThat(exception.getExceptionType())
			.isEqualTo(ExceptionType.DUPLICATE_NOTIFICATION_PLACE_NAME);

		then(userService).should(never()).getUser(anyLong());
		then(notificationPlaceRepository).should(never()).save(any(NotificationPlace.class));
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
