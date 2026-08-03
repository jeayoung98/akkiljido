package com.a508.backend.domain.notification.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.a508.backend.domain.notification.dto.NotificationPlaceResult;
import com.a508.backend.domain.notification.repository.NotificationPlaceRepository;

import lombok.RequiredArgsConstructor;

/** 사용자의 알림 장소 조회 및 관리를 담당하는 서비스. */
@Service
@RequiredArgsConstructor
public class NotificationPlaceService {

	private final NotificationPlaceRepository notificationPlaceRepository;

	/** 로그인 사용자가 등록한 알림 장소 목록을 ID 오름차순으로 조회한다. */
	@Transactional(readOnly = true)
	public List<NotificationPlaceResult> getNotificationPlaces(Long userId) {
		return notificationPlaceRepository.findAllByUser_IdOrderByIdAsc(userId)
			.stream()
			.map(NotificationPlaceResult::from)
			.toList();
	}
}
