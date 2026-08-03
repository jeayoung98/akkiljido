package com.a508.backend.domain.fcm.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.a508.backend.domain.fcm.dto.FcmTestResponse;
import com.a508.backend.domain.fcm.dto.FcmTokenRegisterRequest;
import com.a508.backend.domain.fcm.entity.UserPushToken;
import com.a508.backend.domain.fcm.repository.UserPushTokenRepository;
import com.a508.backend.domain.user.domain.User;
import com.a508.backend.domain.user.service.UserService;
import com.a508.backend.global.client.fcm.FcmClient;
import com.a508.backend.global.client.fcm.FcmSendResult;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;

import lombok.RequiredArgsConstructor;

/** 사용자 기기의 FCM 푸시 토큰과 테스트 알림 발송을 관리하는 서비스. */
@Service
@RequiredArgsConstructor
public class FcmService {

	// TODO: 테스트 알림 API 삭제 시 고정 테스트 메시지와 발송 로직을 함께 삭제한다.
	private static final String TEST_NOTIFICATION_TITLE = "FCM 테스트 알림";
	private static final String TEST_NOTIFICATION_BODY = "알림 연결이 정상적으로 완료되었습니다.";
	private static final String TEST_NOTIFICATION_TYPE = "FCM_TEST";

	private final UserPushTokenRepository userPushTokenRepository;
	private final UserService userService;
	private final FcmClient fcmClient;

	/** 푸시 토큰을 현재 로그인한 사용자에게 등록한다. */
	@Transactional
	public void registerPushToken(Long userId, FcmTokenRegisterRequest request) {
		User user = userService.getUser(userId);
		String normalizedPushToken = request.pushToken().trim();

		userPushTokenRepository.findByPushToken(normalizedPushToken)
			.ifPresentOrElse(
				pushToken -> pushToken.updateRegistration(user, request.deviceType()),
				() -> userPushTokenRepository.save(
					UserPushToken.create(user, request.deviceType(), normalizedPushToken)
				)
			);
	}

	/** 현재 사용자의 모든 등록 기기로 고정된 테스트 알림을 발송한다. */
	// TODO: 주간/월간 리포트 알림 연동 완료 후 테스트 전용 발송 로직을 삭제한다.
	public FcmTestResponse sendTestNotification(Long userId) {
		userService.getUser(userId);

		List<UserPushToken> pushTokens =
			userPushTokenRepository.findAllByUser_IdOrderByIdAsc(userId);

		if (pushTokens.isEmpty()) {
			throw new BusinessException(ExceptionType.FCM_PUSH_TOKEN_NOT_FOUND);
		}

		int successCount = 0;
		List<Long> invalidPushTokenIds = new ArrayList<>();

		for (UserPushToken pushToken : pushTokens) {
			FcmSendResult result = fcmClient.send(
				pushToken.getPushToken(),
				TEST_NOTIFICATION_TITLE,
				TEST_NOTIFICATION_BODY,
				TEST_NOTIFICATION_TYPE
			);

			if (result.success()) {
				successCount++;
			} else if (result.invalidToken()) {
				invalidPushTokenIds.add(pushToken.getId());
			}
		}

		if (!invalidPushTokenIds.isEmpty()) {
			userPushTokenRepository.deleteAllByIdInBatch(invalidPushTokenIds);
		}

		return new FcmTestResponse(
			pushTokens.size(),
			successCount,
			pushTokens.size() - successCount
		);
	}
}
