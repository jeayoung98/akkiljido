package com.a508.backend.domain.notification.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.a508.backend.domain.notification.entity.NotificationPlace;

@Repository
public interface NotificationPlaceRepository extends JpaRepository<NotificationPlace, Long> {

	List<NotificationPlace> findAllByUser_IdOrderByIdAsc(Long userId);

	Optional<NotificationPlace> findByIdAndUser_Id(Long notificationPlaceId, Long userId);

	boolean existsByUser_IdAndNotificationPlaceName(Long userId, String notificationPlaceName);

	boolean existsByUser_IdAndNotificationPlaceNameAndIdNot(
			Long userId,
			String notificationPlaceName,
			Long notificationPlaceId
	);
}
