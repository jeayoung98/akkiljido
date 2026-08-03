package com.a508.backend.domain.fcm.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.a508.backend.domain.fcm.dto.FcmTokenRegisterRequest;
import com.a508.backend.domain.fcm.entity.DeviceType;
import com.a508.backend.domain.fcm.entity.UserPushToken;
import com.a508.backend.domain.fcm.repository.UserPushTokenRepository;
import com.a508.backend.domain.user.domain.User;
import com.a508.backend.domain.user.service.UserService;

@ExtendWith(MockitoExtension.class)
class FcmServiceTest {

	private static final Long USER_ID = 1L;
	private static final String PUSH_TOKEN = "fcm-push-token";

	@Mock
	private UserPushTokenRepository userPushTokenRepository;

	@Mock
	private UserService userService;

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
}
