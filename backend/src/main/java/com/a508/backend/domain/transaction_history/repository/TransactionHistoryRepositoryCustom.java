package com.a508.backend.domain.transaction_history.repository;

import java.time.OffsetDateTime;
import java.util.List;

import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.Polygon;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.domain.transaction_history.entity.TransactionSort;
import com.a508.backend.domain.transaction_history.entity.TransactionType;

/**
 * 거래내역 조회용 QueryDSL 커스텀 리포지토리. 동적 조건(기간/유형/카테고리/검색어)과 공간 조건(PostGIS)을 조합한다.
 * <p>
 * 카테고리 필터는 여러 개를 받아 IN 조건으로 처리하며, null 이거나 비어 있으면 카테고리 조건 없이 전체를 조회한다.
 * <p>
 * 사각형 영역(지도 화면)은 {@link #findExpensesWithinArea}, 원형 반경(내 장소/내 주변)은
 * {@link #findExpensesWithinRadius} 를 사용한다. 반경 조회를 사각형으로 대체하지 않는다.
 */
public interface TransactionHistoryRepositoryCustom {

	// TODO: 페이지네이션 도입 시 Pageable 을 받아 Page<TransactionHistory> 를 반환하는 오버로드 추가

	/**
	 * 거래내역 목록/검색 공통 조회. 카테고리명을 함께 사용하므로 category 를 fetch join 한다(N+1 방지).
	 *
	 * @param type        null 이면 유형 필터 없이 전체 조회
	 * @param categoryIds null 이거나 비어 있으면 카테고리 필터 없이 전체 조회
	 * @param query       null 이면 검색어 필터 없이 전체 조회(거래명 부분 일치, 대소문자 무시)
	 */
	List<TransactionHistory> searchTransactions(Long userId, OffsetDateTime startDateTime,
		OffsetDateTime endDateTime, TransactionType type, List<Long> categoryIds, String query, TransactionSort sort);

	/**
	 * 주어진 사각형 영역 안에 좌표가 있는 지출 거래내역을 조회한다. 지도 화면 영역(bounding box) 조회용이다.
	 * 카테고리명을 함께 사용하므로 category 를 fetch join 한다(N+1 방지).
	 *
	 * @param area        ST_Intersects 대상 영역(SRID 4326)
	 * @param categoryIds null 이거나 비어 있으면 카테고리 필터 없이 전체 조회
	 */
	List<TransactionHistory> findExpensesWithinArea(Long userId, Polygon area, OffsetDateTime startDateTime,
		OffsetDateTime endDateTime, List<Long> categoryIds);

	/**
	 * 중심 좌표에서 반경(m) 안에 좌표가 있는 지출 거래내역을 조회한다.
	 * 원형 반경 판정을 PostGIS 에 그대로 맡기므로 호출부에서 거리를 다시 걸러낼 필요가 없다.
	 *
	 * @param center       반경의 중심 좌표(SRID 4326)
	 * @param radiusMeters 반경(m)
	 * @param categoryIds  null 이거나 비어 있으면 카테고리 필터 없이 전체 조회
	 */
	List<TransactionHistory> findExpensesWithinRadius(Long userId, Point center, double radiusMeters,
		OffsetDateTime startDateTime, OffsetDateTime endDateTime, List<Long> categoryIds);
}
