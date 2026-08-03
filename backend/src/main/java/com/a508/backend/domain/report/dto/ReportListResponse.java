package com.a508.backend.domain.report.dto;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 리포트 목록 응답.
 */
@Schema(description = "리포트 목록 응답")
public record ReportListResponse(

	@Schema(description = "리포트 목록(최신순)")
	List<ReportSummaryResponse> reportList
) {
	public static ReportListResponse of(List<ReportSummaryResponse> reports) {
		return new ReportListResponse(reports);
	}
}
