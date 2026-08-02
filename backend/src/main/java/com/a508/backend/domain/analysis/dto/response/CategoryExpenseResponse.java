package com.a508.backend.domain.analysis.dto.response;

import com.a508.backend.domain.analysis.repository.CategoryExpenseSummary;

import io.swagger.v3.oas.annotations.media.Schema;

/** 월별 카테고리 지출 금액과 전체 지출 대비 비율을 나타내는 응답. */
@Schema(description = "월별 카테고리 지출")
public record CategoryExpenseResponse(

        @Schema(description = "카테고리 ID", example = "3")
        Long categoryId,

        @Schema(description = "카테고리명", example = "음식점")
        String categoryName,

        @Schema(description = "카테고리 지출 합계", example = "182000")
        Long amount,

        @Schema(description = "전체 지출 대비 비율", example = "37")
        Integer percent
) {

    /** 카테고리 집계 결과와 전체 지출을 이용해 응답을 생성한다. */
    public static CategoryExpenseResponse of(CategoryExpenseSummary summary, long totalAmount) {
        int percent = totalAmount == 0
                ? 0
                : (int)Math.round((double)summary.amount() * 100 / totalAmount);

        return new CategoryExpenseResponse(
                summary.categoryId(),
                summary.categoryName(),
                summary.amount(),
                percent
        );
    }
}
