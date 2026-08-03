package com.a508.backend.domain.fcm.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.a508.backend.domain.fcm.dto.FcmTokenRegisterRequest;
import com.a508.backend.domain.fcm.entity.UserPushToken;
import com.a508.backend.domain.fcm.repository.UserPushTokenRepository;
import com.a508.backend.domain.user.domain.User;
import com.a508.backend.domain.user.service.UserService;

import lombok.RequiredArgsConstructor;

/** 사용자 기기의 FCM 푸시 토큰을 관리하는 서비스. */
@Service
@RequiredArgsConstructor
public class FcmService {

	private final UserPushTokenRepository userPushTokenRepository;
	private final UserService userService;

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
}
