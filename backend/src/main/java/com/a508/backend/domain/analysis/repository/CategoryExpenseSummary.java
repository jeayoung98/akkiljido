package com.a508.backend.domain.analysis.repository;

/** 카테고리별 지출 합계 조회 결과. */
public record CategoryExpenseSummary(

        Long categoryId,

        String categoryName,

        Long amount
) {
}
