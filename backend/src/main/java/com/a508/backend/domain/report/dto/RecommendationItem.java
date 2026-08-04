package com.a508.backend.domain.report.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 봉투에 담기는 장소알림 추천 1건. 프론트 추천 알림 모달(RecommendedAlarmModal)의 프리필 재료다.
 * recommendation_log 테이블에는 시간대·이유 컬럼이 없으므로, 이 값들이 프론트까지 가는 유일한 통로가 봉투다.
 * <p>
 * reasonShort/reasonMessage 는 LLM 이 아니라 추출기 템플릿이 만든다(결정적 — 설계 문서 §4.4 분업표).
 */
@Schema(description = "장소알림 추천 항목")
public record RecommendationItem(

	@Schema(description = "추천 장소명(거래명)", example = "스타벅스")
	String placeName,

	@Schema(description = "주소", example = "경기 수원시 팔달구 덕영대로")
	String address,

	@Schema(description = "위도", example = "37.2659")
	Double latitude,

	@Schema(description = "경도", example = "126.9999")
	Double longitude,

	@Schema(description = "알림 시작 시각(그 장소 결제 최빈 3시간 구간)", example = "14:00")
	String startTime,

	@Schema(description = "알림 종료 시각", example = "17:00")
	String endTime,

	@Schema(description = "알림 요일. null 이면 매일 — 지오펜스가 요일 필터 역할을 하므로 null 이 기본이다", example = "null")
	Integer day,

	@Schema(description = "추천 이유 1줄 단문", example = "오후 14~17시에 3번, 모두 23,700원")
	String reasonShort,

	@Schema(description = "추천 이유 존댓말 멘트", example = "오후 14~17시쯤 스타벅스에 자주 들르시네요. …")
	String reasonMessage
) {
}
