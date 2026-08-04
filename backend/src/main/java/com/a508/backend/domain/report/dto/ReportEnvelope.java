package com.a508.backend.domain.report.dto;

import java.time.LocalDate;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 리포트 봉투 — ai_answer 에 JSON 정본으로 저장되고, 상세 조회 시 역직렬화되어
 * 이 구조 그대로 응답 바디에 펼쳐진다(프론트는 문자열 blob 을 파싱하지 않는다).
 * <p>
 * 필드 선정 기준(설계 문서 §6): 화면에 그려지거나, 스키마 구멍을 메우거나.
 * <ul>
 *   <li>period — report 테이블에 기간 컬럼이 없는 동안의 유일한 기간 정보</li>
 *   <li>headline/body — LLM 산출물(그 외 필드는 전부 추출기가 결정적으로 계산)</li>
 *   <li>summary — 컬럼에 없는 건수·장소 수</li>
 *   <li>recommendations — 추천 모달 프리필 재료가 프론트까지 가는 유일한 통로</li>
 * </ul>
 * <p>
 * ⚠ 이 구조는 ai_answer 컬럼에 <b>문자열로 저장</b>되므로, 필드를 지우면 이미 저장된 리포트에는
 * 그 키가 남아 있다. 그래서 모르는 필드를 무시하도록 열어 둔다 — 스키마를 진화시켜도 과거
 * 리포트 조회가 깨지지 않아야 한다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "리포트 봉투(상세 조회 응답 본체)")
public record ReportEnvelope(

	@Schema(description = "리포트 대상 기간")
	Period period,

	@Schema(description = "헤드라인 한 줄", example = "주말에 전주에 다녀오셨네요")
	String headline,

	@Schema(description = "본문 문단 목록(1~4개)")
	List<String> body,

	@Schema(description = "요약 수치")
	Summary summary,

	@Schema(description = "장소알림 추천 목록(0~3건). 소진형이라 빈 목록이 정상 상태다")
	List<RecommendationItem> recommendations
) {

	@JsonIgnoreProperties(ignoreUnknown = true)
	@Schema(description = "리포트 기간(양끝 포함)")
	public record Period(

		@Schema(description = "시작일", example = "2026-10-12")
		@JsonFormat(pattern = "yyyy-MM-dd")
		LocalDate start,

		@Schema(description = "종료일", example = "2026-10-18")
		@JsonFormat(pattern = "yyyy-MM-dd")
		LocalDate end
	) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	@Schema(description = "요약 수치")
	public record Summary(

		@Schema(description = "기간 내 재량지출 건수", example = "38")
		int count,

		@Schema(description = "기간 내 방문 장소 수(거래명+좌표 기준)", example = "20")
		int placeCount
	) {
	}
}
