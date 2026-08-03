package com.a508.backend.domain.notification.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.a508.backend.domain.notification.dto.NotificationPlaceResult;
import com.a508.backend.domain.notification.dto.request.NotificationPlaceCreateRequest;
import com.a508.backend.domain.notification.dto.request.NotificationPlaceUpdateRequest;
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

	/** 로그인한 사용자가 등록한 알림 장소 목록을 ID 오름차순으로 조회한다. */
	@Transactional(readOnly = true)
	public List<NotificationPlaceResult> getNotificationPlaces(Long userId) {
		return notificationPlaceRepository.findAllByUser_IdOrderByIdAsc(userId)
				.stream()
				.map(NotificationPlaceResult::from)
				.toList();
	}

	/** 로그인한 사용자가 소유한 알림 장소의 상세 정보를 조회한다. */
	@Transactional(readOnly = true)
	public NotificationPlaceResult getNotificationPlace(Long userId, Long notificationPlaceId) {
		NotificationPlace notificationPlace = getOwnedNotificationPlace(userId, notificationPlaceId);
		return NotificationPlaceResult.from(notificationPlace);
	}

	/** 로그인한 사용자의 알림 장소를 등록한다. */
	@Transactional
	public NotificationPlaceResult createNotificationPlace(
			Long userId,
			NotificationPlaceCreateRequest request
	) {
		String normalizedName = request.notificationPlaceName().trim();
		String normalizedAddress = request.address().trim();
		String normalizedReason = request.reason().trim();

		validateDuplicateNotificationPlaceName(userId, normalizedName);

		User user = userService.getUser(userId);
		NotificationPlace notificationPlace = NotificationPlace.create(
				user,
				normalizedName,
				normalizedAddress,
				request.latitude(),
				request.longitude(),
				request.parsedStartTime(),
				request.parsedEndTime(),
				normalizedReason
		);

		return NotificationPlaceResult.from(notificationPlaceRepository.save(notificationPlace));
	}

	/** 로그인한 사용자가 소유한 알림 장소를 수정한다. */
	@Transactional
	public NotificationPlaceResult updateNotificationPlace(
			Long userId,
			Long notificationPlaceId,
			NotificationPlaceUpdateRequest request
	) {
		NotificationPlace notificationPlace = getOwnedNotificationPlace(userId, notificationPlaceId);

		updateName(userId, notificationPlaceId, request, notificationPlace);
		updateLocation(request, notificationPlace);
		updateTimeRange(request, notificationPlace);
		updateReason(request, notificationPlace);

		return NotificationPlaceResult.from(notificationPlace);
	}

	/** 로그인한 사용자가 소유한 알림 장소를 삭제한다. */
	@Transactional
	public void deleteNotificationPlace(Long userId, Long notificationPlaceId) {
		NotificationPlace notificationPlace = getOwnedNotificationPlace(userId, notificationPlaceId);
		notificationPlaceRepository.delete(notificationPlace);
	}

	private NotificationPlace getOwnedNotificationPlace(Long userId, Long notificationPlaceId) {
		return notificationPlaceRepository.findByIdAndUser_Id(notificationPlaceId, userId)
				.orElseThrow(() -> new BusinessException(ExceptionType.NOTIFICATION_PLACE_NOT_FOUND));
	}

	private void updateName(
			Long userId,
			Long notificationPlaceId,
			NotificationPlaceUpdateRequest request,
			NotificationPlace notificationPlace
	) {
		if (request.notificationPlaceName() == null) {
			return;
		}

		String normalizedName = request.notificationPlaceName().trim();
		validateDuplicateNotificationPlaceNameForUpdate(userId, normalizedName, notificationPlaceId);
		notificationPlace.updateNotificationPlaceName(normalizedName);
	}

	private void updateLocation(
			NotificationPlaceUpdateRequest request,
			NotificationPlace notificationPlace
	) {
		if (!request.hasLocation()) {
			return;
		}

		notificationPlace.updateLocation(
				request.address().trim(),
				request.latitude(),
				request.longitude()
		);
	}

	private void updateTimeRange(
			NotificationPlaceUpdateRequest request,
			NotificationPlace notificationPlace
	) {
		if (!request.hasTimeRange()) {
			return;
		}

		notificationPlace.updateNotificationTimeRange(
				request.parsedStartTime(),
				request.parsedEndTime()
		);
	}

	private void updateReason(
			NotificationPlaceUpdateRequest request,
			NotificationPlace notificationPlace
	) {
		if (request.reason() != null) {
			notificationPlace.updateReason(request.reason().trim());
		}
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

	private void validateDuplicateNotificationPlaceNameForUpdate(
			Long userId,
			String notificationPlaceName,
			Long notificationPlaceId
	) {
		boolean duplicated =
				notificationPlaceRepository.existsByUser_IdAndNotificationPlaceNameAndIdNot(
						userId,
						notificationPlaceName,
						notificationPlaceId
				);

		if (duplicated) {
			throw new BusinessException(ExceptionType.DUPLICATE_NOTIFICATION_PLACE_NAME);
		}
	}
}
