package com.a508.backend.domain.transaction_history.repository;

import java.time.OffsetDateTime;
import java.util.List;

import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.Polygon;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;

/**
 * 지도 조회용 QueryDSL 커스텀 리포지토리. 공간 조건(PostGIS)과 동적 조건(기간/카테고리)을 함께 조합한다.
 * <p>
 * 사각형 영역(지도 화면)은 {@link #findExpensesWithinArea}, 원형 반경(내 장소/내 주변)은
 * {@link #findExpensesWithinRadius} 를 사용한다. 반경 조회를 사각형으로 대체하지 않는다.
 */
public interface TransactionHistoryRepositoryCustom {

	/**
	 * 주어진 사각형 영역 안에 좌표가 있는 지출 거래내역을 조회한다. 지도 화면 영역(bounding box) 조회용이다.
	 * 카테고리명을 함께 사용하므로 category 를 fetch join 한다(N+1 방지).
	 *
	 * @param area       ST_Intersects 대상 영역(SRID 4326)
	 * @param categoryId null 이면 카테고리 필터 없이 전체 조회
	 */
	List<TransactionHistory> findExpensesWithinArea(Long userId, Polygon area, OffsetDateTime startDateTime,
		OffsetDateTime endDateTime, Long categoryId);

	/**
	 * 중심 좌표에서 반경(m) 안에 좌표가 있는 지출 거래내역을 조회한다.
	 * 원형 반경 판정을 PostGIS 에 그대로 맡기므로 호출부에서 거리를 다시 걸러낼 필요가 없다.
	 *
	 * @param center       반경의 중심 좌표(SRID 4326)
	 * @param radiusMeters 반경(m)
	 * @param categoryId   null 이면 카테고리 필터 없이 전체 조회
	 */
	List<TransactionHistory> findExpensesWithinRadius(Long userId, Point center, double radiusMeters,
		OffsetDateTime startDateTime, OffsetDateTime endDateTime, Long categoryId);
}
