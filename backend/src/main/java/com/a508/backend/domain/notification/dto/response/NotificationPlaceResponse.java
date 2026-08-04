package com.a508.backend.domain.notification.dto.response;

import java.time.LocalTime;

import com.a508.backend.domain.notification.dto.NotificationPlaceResult;
import com.fasterxml.jackson.annotation.JsonFormat;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "알림 장소 정보")
public record NotificationPlaceResponse(

	@Schema(description = "알림 장소 ID", example = "1")
	Long notificationPlaceId,

	@Schema(description = "알림 장소 이름", example = "베통 역삼점")
	String notificationPlaceName,

	@Schema(description = "알림 장소 주소", example = "서울 강남구 테헤란로 123")
	String address,

	@Schema(description = "알림 장소 위도", example = "37.5007")
	Double latitude,

	@Schema(description = "알림 장소 경도", example = "127.0365")
	Double longitude,

	@Schema(description = "알림 시작 시간", example = "09:30")
	@JsonFormat(pattern = "HH:mm")
	LocalTime startTime,

	@Schema(description = "알림 종료 시간", example = "10:30")
	@JsonFormat(pattern = "HH:mm")
	LocalTime endTime,

	@Schema(description = "알림 설정 이유", example = "점심시간 과소비 방지")
	String reason
) {

	public static NotificationPlaceResponse from(NotificationPlaceResult result) {
		return new NotificationPlaceResponse(
			result.notificationPlaceId(),
			result.notificationPlaceName(),
			result.address(),
			result.latitude(),
			result.longitude(),
			result.startTime(),
			result.endTime(),
			result.reason()
		);
	}
}
