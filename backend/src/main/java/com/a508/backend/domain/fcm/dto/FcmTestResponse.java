package com.a508.backend.domain.fcm.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "FCM 테스트 알림 발송 결과")
// TODO: 테스트 알림 API 삭제 시 함께 삭제한다.
public record FcmTestResponse(

	@Schema(description = "발송을 요청한 기기 수", example = "2")
	Integer requestedCount,

	@Schema(description = "발송 성공 기기 수", example = "2")
	Integer successCount,

	@Schema(description = "발송 실패 기기 수", example = "0")
	Integer failureCount
) {
}
