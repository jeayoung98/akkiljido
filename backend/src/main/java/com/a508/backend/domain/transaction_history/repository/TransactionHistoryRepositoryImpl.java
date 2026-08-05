package com.a508.backend.domain.transaction_history.repository;

import static com.a508.backend.domain.category.entity.QCategory.*;
import static com.a508.backend.domain.transaction_history.entity.QTransactionHistory.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.Polygon;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.domain.transaction_history.entity.TransactionSort;
import com.a508.backend.domain.transaction_history.entity.TransactionType;
import com.a508.backend.global.config.SpatialFunctionContributor;
import com.querydsl.core.types.OrderSpecifier;
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
	public List<TransactionHistory> searchTransactions(Long userId, OffsetDateTime startDateTime,
		OffsetDateTime endDateTime, TransactionType type, List<Long> categoryIds, String query, TransactionSort sort) {
		// 소득 거래는 카테고리를 갖지 않으므로 left join 이어야 한다. inner join 이면 소득이 목록/검색에서 누락된다.
		return queryFactory
			.selectFrom(transactionHistory)
			.leftJoin(transactionHistory.category, category).fetchJoin()
			.where(
				transactionHistory.user.id.eq(userId),
				transactionHistory.datetime.goe(startDateTime),
				transactionHistory.datetime.lt(endDateTime),
				typeEq(type),
				categoryIdIn(categoryIds),
				nameContains(query))
			.orderBy(datetimeOrder(sort))
			.fetch();
	}

	@Override
	public List<TransactionHistory> findExpensesWithinArea(Long userId, Polygon area, OffsetDateTime startDateTime,
		OffsetDateTime endDateTime, List<Long> categoryIds) {
		return findExpenses(userId, startDateTime, endDateTime, categoryIds, withinArea(area));
	}

	@Override
	public List<TransactionHistory> findExpensesWithinRadius(Long userId, Point center, double radiusMeters,
		OffsetDateTime startDateTime, OffsetDateTime endDateTime, List<Long> categoryIds) {
		return findExpenses(userId, startDateTime, endDateTime, categoryIds, withinRadius(center, radiusMeters));
	}

	/**
	 * 공간 조건만 다른 두 조회의 공통 부분. 카테고리명을 함께 쓰므로 category 를 fetch join 한다(N+1 방지).
	 * 지출만 조회하므로 카테고리가 항상 존재한다 - 여기서는 inner join 을 유지한다(소득은 카테고리가 null).
	 */
	private List<TransactionHistory> findExpenses(Long userId, OffsetDateTime startDateTime,
		OffsetDateTime endDateTime, List<Long> categoryIds, Predicate spatialCondition) {
		return queryFactory
			.selectFrom(transactionHistory)
			.join(transactionHistory.category, category).fetchJoin()
			.where(
				transactionHistory.user.id.eq(userId),
				transactionHistory.type.eq(TransactionType.EXPENSE),
				transactionHistory.datetime.goe(startDateTime),
				transactionHistory.datetime.lt(endDateTime),
				categoryIdIn(categoryIds),
				spatialCondition)
			.orderBy(transactionHistory.datetime.asc())
			.fetch();
	}

	private BooleanExpression typeEq(TransactionType type) {
		return type == null ? null : transactionHistory.type.eq(type);
	}

	/**
	 * 카테고리 다중 필터. null 이거나 비어 있으면 조건을 걸지 않는다(전체 조회).
	 * 빈 리스트를 그대로 in 절에 넘기면 결과가 항상 0건이 되므로 반드시 여기서 걸러낸다.
	 * 쿼리 파라미터가 {@code categoryId=1,} 처럼 빈 구간을 포함하면 null 원소가 섞일 수 있어 함께 걸러낸다.
	 */
	private BooleanExpression categoryIdIn(List<Long> categoryIds) {
		if (categoryIds == null) {
			return null;
		}
		List<Long> ids = categoryIds.stream().filter(Objects::nonNull).distinct().toList();
		return ids.isEmpty() ? null : category.id.in(ids);
	}

	/**
	 * 거래명 부분 일치 검색(대소문자 무시). 컬럼은 DB 의 lower 로, 검색어는 Locale.ROOT 로 낮춰
	 * 서버 기본 로케일(터키어의 i/I 등)에 결과가 흔들리지 않게 한다.
	 * likeIgnoreCase/containsIgnoreCase 는 검색어 소문자화에 기본 로케일을 쓰거나 %, _ 를 이스케이프하므로 쓰지 않는다.
	 */
	// TODO: 검색어에 포함된 %, _ 가 와일드카드로 동작하는 문제는 검색 정책 정리 후 함께 처리
	private BooleanExpression nameContains(String query) {
		if (query == null) {
			return null;
		}
		return transactionHistory.transactionName.lower().like("%" + query.toLowerCase(Locale.ROOT) + "%");
	}

	private OrderSpecifier<OffsetDateTime> datetimeOrder(TransactionSort sort) {
		return sort.isAscending() ? transactionHistory.datetime.asc() : transactionHistory.datetime.desc();
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
