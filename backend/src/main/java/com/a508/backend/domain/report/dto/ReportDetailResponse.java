package com.a508.backend.domain.report.dto;

import java.util.List;

import com.a508.backend.domain.report.entity.Report;
import com.a508.backend.domain.report.entity.ReportType;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 리포트 상세 응답 — 봉투를 역직렬화해 필드로 펼쳐서 내려준다.
 * 프론트는 문자열 blob(ai_answer)을 파싱하지 않는다(설계 문서 §6 저장·서빙 흐름).
 */
@Schema(description = "리포트 상세 응답")
public record ReportDetailResponse(

	@Schema(description = "리포트 ID", example = "1")
	Long reportId,

	@Schema(description = "리포트 유형", example = "WEEKLY")
	ReportType type,

	@Schema(description = "기간 총지출", example = "357700")
	Long totalCost,

	@Schema(description = "최다 지출 장소(재량 기준)", example = "전주 한옥스테이")
	String highestSpendingPlace,

	@Schema(description = "최다 방문 장소(교통 제외)", example = "스타벅스")
	String mostFrequentPlace,

	@Schema(description = "리포트 기간")
	ReportEnvelope.Period period,

	@Schema(description = "헤드라인", example = "주말에 전주에 다녀오셨네요")
	String headline,

	@Schema(description = "본문 문단(1~4개)")
	List<String> body,

	@Schema(description = "요약 수치")
	ReportEnvelope.Summary summary,

	@Schema(description = "장소알림 추천(0~3건). 빈 목록이 정상 상태다 — 소진형 기능")
	List<RecommendationItem> recommendations
) {
	public static ReportDetailResponse of(Report report, ReportEnvelope envelope) {
		return new ReportDetailResponse(
			report.getId(),
			report.getType(),
			report.getTotalCost(),
			report.getHighestSpendingPlace(),
			report.getMostFrequentPlace(),
			envelope.period(),
			envelope.headline(),
			envelope.body(),
			envelope.summary(),
			envelope.recommendations());
	}
}
