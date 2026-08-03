package com.a508.backend.domain.fcm.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.a508.backend.domain.fcm.dto.FcmTestResponse;
import com.a508.backend.domain.fcm.dto.FcmTokenRegisterRequest;
import com.a508.backend.domain.fcm.entity.DeviceType;
import com.a508.backend.domain.fcm.entity.UserPushToken;
import com.a508.backend.domain.fcm.repository.UserPushTokenRepository;
import com.a508.backend.domain.user.domain.User;
import com.a508.backend.domain.user.service.UserService;
import com.a508.backend.global.client.fcm.FcmClient;
import com.a508.backend.global.client.fcm.FcmSendResult;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;

@ExtendWith(MockitoExtension.class)
class FcmServiceTest {

	private static final Long USER_ID = 1L;
	private static final String PUSH_TOKEN = "fcm-push-token";

	@Mock
	private UserPushTokenRepository userPushTokenRepository;

	@Mock
	private UserService userService;

	@Mock
	private FcmClient fcmClient;

	@InjectMocks
	private FcmService fcmService;

	@Test
	@DisplayName("등록되지 않은 푸시 토큰이면 현재 사용자의 기기 토큰을 저장한다")
	void registerNewPushToken() {
		User user = User.createGoogleGuest("provider-sub");
		FcmTokenRegisterRequest request = new FcmTokenRegisterRequest(
			DeviceType.ANDROID,
			"  " + PUSH_TOKEN + "  "
		);

		when(userService.getUser(USER_ID)).thenReturn(user);
		when(userPushTokenRepository.findByPushToken(PUSH_TOKEN)).thenReturn(Optional.empty());

		fcmService.registerPushToken(USER_ID, request);

		ArgumentCaptor<UserPushToken> pushTokenCaptor =
			ArgumentCaptor.forClass(UserPushToken.class);

		verify(userPushTokenRepository).save(pushTokenCaptor.capture());

		UserPushToken savedPushToken = pushTokenCaptor.getValue();

		assertThat(savedPushToken.getUser()).isSameAs(user);
		assertThat(savedPushToken.getDeviceType()).isEqualTo(DeviceType.ANDROID);
		assertThat(savedPushToken.getPushToken()).isEqualTo(PUSH_TOKEN);
	}

	@Test
	@DisplayName("이미 등록된 푸시 토큰이면 중복 저장하지 않고 사용자와 기기 종류를 갱신한다")
	void updateExistingPushTokenRegistration() {
		User previousUser = User.createGoogleGuest("previous-provider-sub");
		User currentUser = User.createGoogleGuest("current-provider-sub");
		UserPushToken existingPushToken = UserPushToken.create(
			previousUser,
			DeviceType.WEB,
			PUSH_TOKEN
		);
		FcmTokenRegisterRequest request = new FcmTokenRegisterRequest(
			DeviceType.IOS,
			PUSH_TOKEN
		);

		when(userService.getUser(USER_ID)).thenReturn(currentUser);
		when(userPushTokenRepository.findByPushToken(PUSH_TOKEN))
			.thenReturn(Optional.of(existingPushToken));

		fcmService.registerPushToken(USER_ID, request);

		assertThat(existingPushToken.getUser()).isSameAs(currentUser);
		assertThat(existingPushToken.getDeviceType()).isEqualTo(DeviceType.IOS);
		assertThat(existingPushToken.getPushToken()).isEqualTo(PUSH_TOKEN);

		verify(userPushTokenRepository, never()).save(any(UserPushToken.class));
	}

	// TODO: 테스트 알림 API 삭제 시 아래 테스트 전용 발송 로직 테스트들을 함께 삭제한다.
	@Test
	@DisplayName("등록된 모든 기기로 테스트 알림을 보내고 성공과 실패 수를 반환한다")
	void sendTestNotification() {
		User user = User.createGoogleGuest("provider-sub");
		UserPushToken successfulToken = createPushToken(1L, user, "successful-token");
		UserPushToken invalidToken = createPushToken(2L, user, "invalid-token");
		UserPushToken failedToken = createPushToken(3L, user, "failed-token");

		when(userService.getUser(USER_ID)).thenReturn(user);
		when(userPushTokenRepository.findAllByUser_IdOrderByIdAsc(USER_ID))
			.thenReturn(List.of(successfulToken, invalidToken, failedToken));
		when(fcmClient.send(eq("successful-token"), anyString(), anyString(), eq("FCM_TEST")))
			.thenReturn(FcmSendResult.sent());
		when(fcmClient.send(eq("invalid-token"), anyString(), anyString(), eq("FCM_TEST")))
			.thenReturn(FcmSendResult.failed(true));
		when(fcmClient.send(eq("failed-token"), anyString(), anyString(), eq("FCM_TEST")))
			.thenReturn(FcmSendResult.failed(false));

		FcmTestResponse response = fcmService.sendTestNotification(USER_ID);

		assertThat(response.requestedCount()).isEqualTo(3);
		assertThat(response.successCount()).isEqualTo(1);
		assertThat(response.failureCount()).isEqualTo(2);

		verify(userPushTokenRepository).deleteAllByIdInBatch(List.of(2L));
	}

	@Test
	@DisplayName("등록된 푸시 토큰이 없으면 FCM_PUSH_TOKEN_NOT_FOUND 예외를 던진다")
	void throwWhenPushTokenDoesNotExist() {
		User user = User.createGoogleGuest("provider-sub");

		when(userService.getUser(USER_ID)).thenReturn(user);
		when(userPushTokenRepository.findAllByUser_IdOrderByIdAsc(USER_ID))
			.thenReturn(List.of());

		assertThatThrownBy(() -> fcmService.sendTestNotification(USER_ID))
			.isInstanceOf(BusinessException.class)
			.extracting(e -> ((BusinessException)e).getExceptionType())
			.isEqualTo(ExceptionType.FCM_PUSH_TOKEN_NOT_FOUND);

		verifyNoInteractions(fcmClient);
	}

	private UserPushToken createPushToken(Long id, User user, String pushToken) {
		UserPushToken userPushToken = UserPushToken.create(
			user,
			DeviceType.ANDROID,
			pushToken
		);
		ReflectionTestUtils.setField(userPushToken, "id", id);
		return userPushToken;
	}
}
