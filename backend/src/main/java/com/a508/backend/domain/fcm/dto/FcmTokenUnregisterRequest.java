package com.a508.backend.domain.fcm.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "FCM 푸시 토큰 해제 요청")
public record FcmTokenUnregisterRequest(

	@Schema(description = "현재 기기에 발급된 FCM 푸시 토큰")
	@NotBlank(message = "푸시 토큰은 필수입니다.")
	String pushToken
) {
}
