package com.a508.backend.domain.report.dto;

import java.time.LocalDate;

import com.a508.backend.domain.report.entity.Report;
import com.a508.backend.domain.report.entity.ReportType;
import com.fasterxml.jackson.annotation.JsonFormat;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 리포트 목록 항목. 구조화 컬럼(총액·장소 2종)은 파싱 없이 쓰고,
 * 기간·헤드라인만 봉투에서 꺼내 온다(목록 카드에 필요한 최소만).
 */
@Schema(description = "리포트 목록 항목")
public record ReportSummaryResponse(

	@Schema(description = "리포트 ID", example = "1")
	Long reportId,

	@Schema(description = "리포트 유형", example = "WEEKLY")
	ReportType type,

	@Schema(description = "기간 시작일", example = "2026-10-12")
	@JsonFormat(pattern = "yyyy-MM-dd")
	LocalDate periodStart,

	@Schema(description = "기간 종료일", example = "2026-10-18")
	@JsonFormat(pattern = "yyyy-MM-dd")
	LocalDate periodEnd,

	@Schema(description = "기간 총지출", example = "357700")
	Long totalCost,

	@Schema(description = "최다 지출 장소(재량 기준)", example = "전주 한옥스테이")
	String highestSpendingPlace,

	@Schema(description = "최다 방문 장소(교통 제외)", example = "스타벅스")
	String mostFrequentPlace,

	@Schema(description = "헤드라인", example = "주말에 전주에 다녀오셨네요")
	String headline
) {
	public static ReportSummaryResponse of(Report report, ReportEnvelope envelope) {
		return new ReportSummaryResponse(
			report.getId(),
			report.getType(),
			envelope.period() == null ? null : envelope.period().start(),
			envelope.period() == null ? null : envelope.period().end(),
			report.getTotalCost(),
			report.getHighestSpendingPlace(),
			report.getMostFrequentPlace(),
			envelope.headline());
	}
}
