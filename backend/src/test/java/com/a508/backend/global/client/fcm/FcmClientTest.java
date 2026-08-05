package com.a508.backend.global.client.fcm;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.MessagingErrorCode;

@ExtendWith(MockitoExtension.class)
class FcmClientTest {

	private static final String PUSH_TOKEN = "fcm-push-token";

	@Mock
	private ObjectProvider<FirebaseMessaging> firebaseMessagingProvider;

	@Mock
	private FirebaseMessaging firebaseMessaging;

	@Mock
	private FirebaseMessagingException firebaseMessagingException;

	@InjectMocks
	private FcmClient fcmClient;

	@Test
	@DisplayName("Firebase가 설정되지 않았으면 FCM_NOT_CONFIGURED 예외를 던진다")
	void throwWhenFirebaseIsNotConfigured() {
		when(firebaseMessagingProvider.getIfAvailable()).thenReturn(null);

		assertThatThrownBy(() -> fcmClient.send(
			PUSH_TOKEN,
			"제목",
			"내용",
			"FCM_TEST"
		))
			.isInstanceOf(BusinessException.class)
			.extracting(e -> ((BusinessException)e).getExceptionType())
			.isEqualTo(ExceptionType.FCM_NOT_CONFIGURED);
	}

	@Test
	@DisplayName("Firebase 발송이 성공하면 성공 결과를 반환한다")
	void returnSuccessWhenMessageIsSent() throws Exception {
		when(firebaseMessagingProvider.getIfAvailable()).thenReturn(firebaseMessaging);
		when(firebaseMessaging.send(any(Message.class)))
			.thenReturn("projects/project/messages/message-id");

		FcmSendResult result = fcmClient.send(
			PUSH_TOKEN,
			"제목",
			"내용",
			"FCM_TEST"
		);

		assertThat(result.success()).isTrue();
		assertThat(result.invalidToken()).isFalse();

		verify(firebaseMessaging).send(any(Message.class));
	}

	@Test
	@DisplayName("만료된 토큰이면 삭제 가능한 실패 결과를 반환한다")
	void returnInvalidTokenResultWhenTokenIsUnregistered() throws Exception {
		when(firebaseMessagingProvider.getIfAvailable()).thenReturn(firebaseMessaging);
		when(firebaseMessagingException.getMessagingErrorCode())
			.thenReturn(MessagingErrorCode.UNREGISTERED);
		when(firebaseMessaging.send(any(Message.class)))
			.thenThrow(firebaseMessagingException);

		FcmSendResult result = fcmClient.send(
			PUSH_TOKEN,
			"제목",
			"내용",
			"FCM_TEST"
		);

		assertThat(result.success()).isFalse();
		assertThat(result.invalidToken()).isTrue();
	}
}
