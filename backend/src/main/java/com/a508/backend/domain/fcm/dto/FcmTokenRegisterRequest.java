package com.a508.backend.domain.fcm.dto;

import com.a508.backend.domain.fcm.entity.DeviceType;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Schema(description = "FCM 푸시 토큰 등록 요청")
public record FcmTokenRegisterRequest(

	@Schema(description = "기기 플랫폼", example = "ANDROID")
	@NotNull(message = "기기 종류는 필수입니다.")
	DeviceType deviceType,

	@Schema(description = "FCM에서 발급받은 기기 푸시 토큰")
	@NotBlank(message = "푸시 토큰은 필수입니다.")
	String pushToken
) {
}
