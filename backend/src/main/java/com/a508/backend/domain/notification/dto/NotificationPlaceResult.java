package com.a508.backend.domain.notification.dto;

import java.time.LocalTime;

import com.a508.backend.domain.notification.entity.NotificationPlace;

public record NotificationPlaceResult(
	Long notificationPlaceId,
	String notificationPlaceName,
	String address,
	Double latitude,
	Double longitude,
	LocalTime startTime,
	LocalTime endTime,
	String reason,
	boolean active
) {

	public static NotificationPlaceResult from(NotificationPlace notificationPlace) {
		return new NotificationPlaceResult(
			notificationPlace.getId(),
			notificationPlace.getNotificationPlaceName(),
			notificationPlace.getAddress(),
			notificationPlace.getLatitude(),
			notificationPlace.getLongitude(),
			notificationPlace.getStartTime(),
			notificationPlace.getEndTime(),
			notificationPlace.getReason(),
			notificationPlace.isActive()
		);
	}
}
