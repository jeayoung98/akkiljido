package com.a508.backend.domain.analysis.repository;

import java.time.OffsetDateTime;
import java.util.List;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;

/** 분석 기능에 필요한 거래내역 조회와 집계를 제공하는 Repository. */
public interface AnalysisRepository {

    /** 특정 기간의 사용자 지출을 카테고리별로 집계한다. */
    List<CategoryExpenseSummary> findCategoryExpenses(
            Long userId, OffsetDateTime startDateTime, OffsetDateTime endDateTime);

    /** 특정 기간에 발생한 사용자의 전체 지출 거래내역을 조회한다. */
    List<TransactionHistory> findExpenses(
            Long userId, OffsetDateTime startDateTime, OffsetDateTime endDateTime);
}
