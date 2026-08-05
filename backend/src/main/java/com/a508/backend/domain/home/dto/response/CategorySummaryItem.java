package com.a508.backend.domain.home.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 홈 화면 카테고리별 지출 단건. amount 는 이번 달 해당 카테고리의 지출 합계,
 * percent 는 이번 달 전체 지출 대비 비율을 반올림한 정수다.
 */
@Schema(description = "카테고리별 지출 항목")
public record CategorySummaryItem(

	@Schema(description = "카테고리 ID", example = "3")
	Long categoryId,

	@Schema(description = "카테고리명", example = "음식점")
	String categoryName,

	@Schema(description = "이번 달 해당 카테고리 지출 합계", example = "182000")
	Long amount,

	@Schema(description = "이번 달 전체 지출 대비 비율(%, 반올림)", example = "37")
	int percent
) {
	public static CategorySummaryItem of(Long categoryId, String categoryName, Long amount, int percent) {
		return new CategorySummaryItem(categoryId, categoryName, amount, percent);
	}
}
