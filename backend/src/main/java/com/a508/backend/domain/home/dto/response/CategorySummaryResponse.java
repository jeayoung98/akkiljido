package com.a508.backend.domain.home.dto.response;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 홈 화면 카테고리별 지출 응답. 이번 달 누적 지출 기준 상위 N개(기본 4개) 카테고리만 내려간다.
 */
@Schema(description = "카테고리별 지출 응답")
public record CategorySummaryResponse(

	@Schema(description = "이번 달 지출 상위 카테고리 목록(기본 최대 4개, limit 으로 조정)")
	List<CategorySummaryItem> categories
) {
	public static CategorySummaryResponse from(List<CategorySummaryItem> categories) {
		return new CategorySummaryResponse(categories);
	}
}
