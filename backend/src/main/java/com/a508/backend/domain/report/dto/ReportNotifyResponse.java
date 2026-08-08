package com.a508.backend.domain.report.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 리포트 알림 발송 결과 요약. 스케줄 실행에서는 로그로, 시연용 수동 트리거에서는 응답 바디로 쓰인다.
 * <p>
 * 사용자 단위 집계(target/notified/skipped)와 토큰 단위 집계(sent/failed/deleted)를 분리해 둔 이유:
 * 한 사용자가 기기를 여러 대 등록할 수 있어 두 축의 합이 서로 맞지 않는다.
 */
@Schema(description = "리포트 알림 발송 결과")
public record ReportNotifyResponse(

	@Schema(description = "발송 대상 사용자 수(해당 유형 리포트를 가진 사용자)", example = "12")
	int targetUserCount,

	@Schema(description = "기기 1대 이상에 발송이 성공한 사용자 수", example = "9")
	int notifiedUserCount,

	@Schema(description = "등록된 푸시 토큰이 없어 건너뛴 사용자 수", example = "3")
	int skippedNoTokenCount,

	@Schema(description = "발송 성공 토큰 수", example = "11")
	int sentTokenCount,

	@Schema(description = "발송 실패 토큰 수", example = "1")
	int failedTokenCount,

	@Schema(description = "만료·무효로 판정되어 삭제된 토큰 수", example = "1")
	int deletedTokenCount
) {

	public static ReportNotifyResponse empty() {
		return new ReportNotifyResponse(0, 0, 0, 0, 0, 0);
	}
}
