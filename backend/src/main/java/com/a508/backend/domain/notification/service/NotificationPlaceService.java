package com.a508.backend.domain.notification.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.a508.backend.domain.notification.dto.NotificationPlaceResult;
import com.a508.backend.domain.notification.dto.request.NotificationPlaceCreateRequest;
import com.a508.backend.domain.notification.entity.NotificationPlace;
import com.a508.backend.domain.notification.repository.NotificationPlaceRepository;
import com.a508.backend.domain.user.domain.User;
import com.a508.backend.domain.user.service.UserService;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;

import lombok.RequiredArgsConstructor;

/** 사용자의 알림 장소 조회 및 관리를 담당하는 서비스. */
@Service
@RequiredArgsConstructor
public class NotificationPlaceService {

	private final NotificationPlaceRepository notificationPlaceRepository;
	private final UserService userService;

	/** 로그인 사용자가 등록한 알림 장소 목록을 ID 오름차순으로 조회한다. */
	@Transactional(readOnly = true)
	public List<NotificationPlaceResult> getNotificationPlaces(Long userId) {
		return notificationPlaceRepository.findAllByUser_IdOrderByIdAsc(userId)
			.stream()
			.map(NotificationPlaceResult::from)
			.toList();
	}

	/** 로그인 사용자의 알림 장소를 등록한다. */
	@Transactional
	public NotificationPlaceResult createNotificationPlace(
		Long userId,
		NotificationPlaceCreateRequest request
	) {
		String normalizedNotificationPlaceName = request.notificationPlaceName().trim();
		String normalizedAddress = request.address().trim();
		String normalizedReason = request.reason().trim();

		validateDuplicateNotificationPlaceName(userId, normalizedNotificationPlaceName);

		User user = userService.getUser(userId);
		NotificationPlace notificationPlace = NotificationPlace.create(
			user,
			normalizedNotificationPlaceName,
			normalizedAddress,
			request.latitude(),
			request.longitude(),
			request.parsedStartTime(),
			request.parsedEndTime(),
			normalizedReason
		);

		return NotificationPlaceResult.from(
			notificationPlaceRepository.save(notificationPlace)
		);
	}

	private void validateDuplicateNotificationPlaceName(
		Long userId,
		String notificationPlaceName
	) {
		boolean duplicated =
			notificationPlaceRepository.existsByUser_IdAndNotificationPlaceName(
				userId,
				notificationPlaceName
			);

		if (duplicated) {
			throw new BusinessException(ExceptionType.DUPLICATE_NOTIFICATION_PLACE_NAME);
		}
	}
}
