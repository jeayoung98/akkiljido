package com.a508.backend.domain.analysis.repository;

import static com.a508.backend.domain.category.entity.QCategory.*;
import static com.a508.backend.domain.transaction_history.entity.QTransactionHistory.*;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.stereotype.Repository;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.domain.transaction_history.entity.TransactionType;
import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;

import lombok.RequiredArgsConstructor;

/** QueryDSL을 이용해 분석용 거래내역 조회와 집계 쿼리를 수행한다. */
@Repository
@RequiredArgsConstructor
public class AnalysisRepositoryImpl implements AnalysisRepository {

    private final JPAQueryFactory queryFactory;

    /** 사용자와 조회 기간에 해당하는 지출을 카테고리별로 합산한다. */
    @Override
    public List<CategoryExpenseSummary> findCategoryExpenses(
            Long userId, OffsetDateTime startDateTime, OffsetDateTime endDateTime) {
        return queryFactory
                .select(Projections.constructor(
                        CategoryExpenseSummary.class,
                        category.id,
                        category.name,
                        transactionHistory.amount.sum()))
                .from(transactionHistory)
                .join(transactionHistory.category, category)
                .where(
                        transactionHistory.user.id.eq(userId),
                        transactionHistory.type.eq(TransactionType.EXPENSE),
                        transactionHistory.datetime.goe(startDateTime),
                        transactionHistory.datetime.lt(endDateTime))
                .groupBy(category.id, category.name)
                .orderBy(
                        transactionHistory.amount.sum().desc(),
                        category.id.asc())
                .fetch();
    }

    /** 사용자와 조회 기간에 해당하는 전체 지출 거래내역을 조회한다. */
    @Override
    public List<TransactionHistory> findExpenses(
            Long userId, OffsetDateTime startDateTime, OffsetDateTime endDateTime) {
        return queryFactory
                .selectFrom(transactionHistory)
                .where(
                        transactionHistory.user.id.eq(userId),
                        transactionHistory.type.eq(TransactionType.EXPENSE),
                        transactionHistory.datetime.goe(startDateTime),
                        transactionHistory.datetime.lt(endDateTime))
                .orderBy(transactionHistory.datetime.asc())
                .fetch();
    }
}
