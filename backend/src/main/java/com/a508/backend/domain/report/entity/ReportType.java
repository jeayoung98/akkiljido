package com.a508.backend.domain.report.entity;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 리포트 발행 단위. 주간은 매주 월요일 새벽(직전 월~일), 월간은 매달 1일 새벽(직전 달) 배치로 생성된다.
 */
@Schema(description = "리포트 유형(주간/월간)", example = "WEEKLY")
public enum ReportType {
	WEEKLY,
	MONTHLY
}
