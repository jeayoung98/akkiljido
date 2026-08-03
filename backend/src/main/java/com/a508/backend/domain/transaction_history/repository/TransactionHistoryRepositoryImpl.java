package com.a508.backend.domain.transaction_history.repository;

import static com.a508.backend.domain.category.entity.QCategory.*;
import static com.a508.backend.domain.transaction_history.entity.QTransactionHistory.*;

import java.time.OffsetDateTime;
import java.util.List;

import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.Polygon;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.domain.transaction_history.entity.TransactionType;
import com.a508.backend.global.config.SpatialFunctionContributor;
import com.querydsl.core.types.Predicate;
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
		return findExpenses(userId, startDateTime, endDateTime, categoryId, withinArea(area));
	}

	@Override
	public List<TransactionHistory> findExpensesWithinRadius(Long userId, Point center, double radiusMeters,
		OffsetDateTime startDateTime, OffsetDateTime endDateTime, Long categoryId) {
		return findExpenses(userId, startDateTime, endDateTime, categoryId, withinRadius(center, radiusMeters));
	}

	/** 공간 조건만 다른 두 조회의 공통 부분. 카테고리명을 함께 쓰므로 category 를 fetch join 한다(N+1 방지). */
	private List<TransactionHistory> findExpenses(Long userId, OffsetDateTime startDateTime,
		OffsetDateTime endDateTime, Long categoryId, Predicate spatialCondition) {
		return queryFactory
			.selectFrom(transactionHistory)
			.join(transactionHistory.category, category).fetchJoin()
			.where(
				transactionHistory.user.id.eq(userId),
				transactionHistory.type.eq(TransactionType.EXPENSE),
				transactionHistory.datetime.goe(startDateTime),
				transactionHistory.datetime.lt(endDateTime),
				categoryIdEq(categoryId),
				spatialCondition)
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

	/**
	 * PostGIS ST_DWithin 으로 좌표가 중심에서 반경(m) 안에 있는지 판정한다.
	 * <p>
	 * geometry(4326) 의 거리 단위는 도(degree)라 미터를 그대로 넘길 수 없어 geography 로 캐스팅한다.
	 * 캐스팅이 HQL 파서를 통과하지 못하므로 {@link SpatialFunctionContributor} 에 등록한 패턴 함수를 호출한다.
	 * <p>
	 * ST_DWithin 은 내부적으로 bounding box 로 후보를 좁힌 뒤 정확한 거리를 재검사하므로,
	 * 애플리케이션에서 사각형 후보를 만들어 다시 걸러낼 필요가 없다.
	 * 단, 캐스팅한 표현식은 geometry 컬럼의 인덱스를 타지 않으므로
	 * {@code coordinate::geography} 에 대한 GiST 표현식 인덱스가 필요하다(db/index.sql 참고).
	 * <p>
	 * 좌표가 없는 거래(coordinate is null)는 결과가 null 이므로 자연스럽게 제외된다.
	 */
	private BooleanExpression withinRadius(Point center, double radiusMeters) {
		return Expressions.booleanTemplate(
			SpatialFunctionContributor.ST_DWITHIN_GEOGRAPHY + "({0}, {1}, {2}) = true",
			transactionHistory.coordinate, center, radiusMeters);
	}
}
