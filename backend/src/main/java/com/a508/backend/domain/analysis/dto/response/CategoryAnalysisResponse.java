package com.a508.backend.domain.analysis.dto.response;

import java.util.List;

import com.a508.backend.domain.analysis.repository.CategoryExpenseSummary;

import io.swagger.v3.oas.annotations.media.Schema;

/** 선택한 월의 총지출과 카테고리별 지출 분석을 제공하는 응답. */
@Schema(description = "월별 카테고리 지출 분석 응답")
public record CategoryAnalysisResponse(

        @Schema(description = "해당 월의 총지출", example = "490000")
        Long totalAmount,

        @Schema(description = "카테고리별 지출 분석")
        List<CategoryExpenseResponse> categories
) {

    /** 카테고리별 집계 결과를 총지출과 비율이 포함된 응답으로 변환한다. */
    public static CategoryAnalysisResponse from(List<CategoryExpenseSummary> summaries) {
        long totalAmount = summaries.stream()
                .mapToLong(CategoryExpenseSummary::amount)
                .sum();

        List<CategoryExpenseResponse> categories = summaries.stream()
                .map(summary -> CategoryExpenseResponse.of(summary, totalAmount))
                .toList();

        return new CategoryAnalysisResponse(totalAmount, categories);
    }
}
