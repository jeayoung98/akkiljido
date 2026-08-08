package com.a508.backend.global.client.fcm;

import java.util.Map;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.google.firebase.messaging.AndroidConfig;
import com.google.firebase.messaging.AndroidNotification;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.MessagingErrorCode;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/** Firebase Admin SDK를 사용해 기기에 푸시 알림을 발송하는 클라이언트. */
@Slf4j
@Component
@RequiredArgsConstructor
public class FcmClient {

	private static final String REPORT_CHANNEL_ID = "report";

	private final ObjectProvider<FirebaseMessaging> firebaseMessagingProvider;

	/** 단일 FCM 푸시 토큰으로 알림 메시지를 발송한다. */
	public FcmSendResult send(
		String pushToken,
		String title,
		String body,
		String notificationType
	) {
		return send(pushToken, title, body, notificationType, Map.of());
	}

	/**
	 * 추가 data 페이로드를 실어 발송한다. 앱이 알림 탭 시 바로 상세로 이동할 수 있도록
	 * 식별자(예: reportId)를 넘기는 용도다. {@code type} 키는 예약되어 있어 덮어쓸 수 없다.
	 */
	public FcmSendResult send(
		String pushToken,
		String title,
		String body,
		String notificationType,
		Map<String, String> extraData
	) {
		FirebaseMessaging firebaseMessaging = firebaseMessagingProvider.getIfAvailable();

		if (firebaseMessaging == null) {
			throw new BusinessException(ExceptionType.FCM_NOT_CONFIGURED);
		}

		Message.Builder messageBuilder = Message.builder()
			.setToken(pushToken)
			.setNotification(
				Notification.builder()
					.setTitle(title)
					.setBody(body)
					.build()
			);

		extraData.forEach((key, value) -> {
			if (!"type".equals(key) && value != null) {
				messageBuilder.putData(key, value);
			}
		});

		Message message = messageBuilder
			.putData("type", notificationType)
			.setAndroidConfig(
				AndroidConfig.builder()
					.setPriority(AndroidConfig.Priority.HIGH)
					.setNotification(
						AndroidNotification.builder()
							.setChannelId(REPORT_CHANNEL_ID)
							.setSound("default")
							.build()
					)
					.build()
			)
			.build();

		try {
			firebaseMessaging.send(message);
			return FcmSendResult.sent();
		} catch (FirebaseMessagingException e) {
			MessagingErrorCode errorCode = e.getMessagingErrorCode();
			boolean invalidToken =
				errorCode == MessagingErrorCode.UNREGISTERED
					|| errorCode == MessagingErrorCode.INVALID_ARGUMENT;

			log.warn("FCM 푸시 알림 발송 실패: errorCode={}", errorCode);
			return FcmSendResult.failed(invalidToken);
		}
	}
}
