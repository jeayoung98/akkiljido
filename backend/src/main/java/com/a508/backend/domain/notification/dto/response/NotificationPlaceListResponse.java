package com.a508.backend.domain.notification.dto.response;

import java.util.List;

import com.a508.backend.domain.notification.dto.NotificationPlaceResult;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "알림 장소 목록 응답")
public record NotificationPlaceListResponse(

	@Schema(description = "사용자가 등록한 알림 장소 목록")
	List<NotificationPlaceResponse> notificationList
) {

	public static NotificationPlaceListResponse from(List<NotificationPlaceResult> results) {
		List<NotificationPlaceResponse> notificationList = results.stream()
			.map(NotificationPlaceResponse::from)
			.toList();

		return new NotificationPlaceListResponse(notificationList);
	}
}
