package com.a508.backend.domain.home.repository;

import static com.a508.backend.domain.category.entity.QCategory.*;
import static com.a508.backend.domain.transaction_history.entity.QTransactionHistory.*;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.stereotype.Repository;

import com.a508.backend.domain.home.repository.projection.CategoryAmount;
import com.a508.backend.domain.transaction_history.entity.TransactionType;
import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;

import lombok.RequiredArgsConstructor;

/**
 * 홈 화면 집계 전용 QueryDSL 리포지토리.
 * <p>
 * CRUD 파생 메서드가 전혀 필요 없는 집계 전용이라 Spring Data 인터페이스(+Custom/+Impl) 3종 대신
 * {@link JPAQueryFactory} 를 직접 쓰는 단일 클래스로 둔다.
 * 좌표 반경 조회는 {@code TransactionHistoryRepositoryCustom.findExpensesWithinArea} 를 재사용하므로
 * 여기에는 카테고리 집계만 있다.
 */
@Repository
@RequiredArgsConstructor
public class HomeStatisticsRepository {

	private final JPAQueryFactory queryFactory;

	/**
	 * 기간 내 지출을 카테고리별로 합산해 금액 내림차순으로 조회한다.
	 * 상위 N개 절삭은 서비스에서 한다. percent 분모로 쓸 전체 합계가 필요하기 때문이다.
	 */
	public List<CategoryAmount> sumExpenseAmountsByCategory(
		Long userId, OffsetDateTime startDateTime, OffsetDateTime endDateTime) {
		return queryFactory
			.select(Projections.constructor(CategoryAmount.class,
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
			.orderBy(transactionHistory.amount.sum().desc(), category.id.asc())
			.fetch();
	}
}
