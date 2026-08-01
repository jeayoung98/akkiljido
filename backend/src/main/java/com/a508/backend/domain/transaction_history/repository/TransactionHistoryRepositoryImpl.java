package com.a508.backend.domain.transaction_history.repository;

import static com.a508.backend.domain.category.entity.QCategory.*;
import static com.a508.backend.domain.transaction_history.entity.QTransactionHistory.*;

import java.time.OffsetDateTime;
import java.util.List;

import org.locationtech.jts.geom.Polygon;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.domain.transaction_history.entity.TransactionType;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.core.types.dsl.Expressions;
import com.querydsl.jpa.impl.JPAQueryFactory;

import lombok.RequiredArgsConstructor;

/**
 * {@link TransactionHistoryRepositoryCustom} 의 QueryDSL 구현체.
 * 클래스명은 Spring Data 의 커스텀 구현 규칙(리포지토리명 + Impl)을 따라야 자동으로 조립된다.
 */
@RequiredArgsConstructor
public class TransactionHistoryRepositoryImpl implements TransactionHistoryRepositoryCustom {

	private final JPAQueryFactory queryFactory;

	@Override
	public List<TransactionHistory> findExpensesWithinArea(Long userId, Polygon area, OffsetDateTime startDateTime,
		OffsetDateTime endDateTime, Long categoryId) {
		return queryFactory
			.selectFrom(transactionHistory)
			.join(transactionHistory.category, category).fetchJoin()
			.where(
				transactionHistory.user.id.eq(userId),
				transactionHistory.type.eq(TransactionType.EXPENSE),
				transactionHistory.datetime.goe(startDateTime),
				transactionHistory.datetime.lt(endDateTime),
				categoryIdEq(categoryId),
				withinArea(area))
			.orderBy(transactionHistory.datetime.asc())
			.fetch();
	}

	private BooleanExpression categoryIdEq(Long categoryId) {
		return categoryId == null ? null : category.id.eq(categoryId);
	}

	/**
	 * PostGIS ST_Intersects 로 좌표가 대상 영역 안에 있는지 판정한다.
	 * 경계선 위의 좌표를 제외하지 않기 위해 ST_Within 대신 ST_Intersects 를 사용한다(둘 다 GiST 인덱스 사용 가능).
	 * 좌표가 없는 거래(coordinate is null)는 결과가 null 이므로 자연스럽게 제외된다.
	 */
	private BooleanExpression withinArea(Polygon area) {
		return Expressions.booleanTemplate("st_intersects({0}, {1}) = true", transactionHistory.coordinate, area);
	}
}
