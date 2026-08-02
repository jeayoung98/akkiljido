package com.a508.backend.domain.analysis.repository;

import java.time.OffsetDateTime;
import java.util.List;

/** 분석 기능에 필요한 거래내역 집계 조회를 제공하는 Repository. */
public interface AnalysisRepository {

    /** 특정 기간의 사용자 지출을 카테고리별로 집계한다. */
    List<CategoryExpenseSummary> findCategoryExpenses(
            Long userId, OffsetDateTime startDateTime, OffsetDateTime endDateTime);
}
