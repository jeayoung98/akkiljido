package com.a508.backend.domain.transaction_history.repository;

import java.time.OffsetDateTime;
import java.util.List;

import org.locationtech.jts.geom.Polygon;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;

/**
 * 지도 조회용 QueryDSL 커스텀 리포지토리. 공간 조건(PostGIS)과 동적 조건(기간/카테고리)을 함께 조합한다.
 */
public interface TransactionHistoryRepositoryCustom {

	/**
	 * 주어진 영역 안에 좌표가 있는 지출 거래내역을 조회한다.
	 * 카테고리명을 함께 사용하므로 category 를 fetch join 한다(N+1 방지).
	 *
	 * @param area       ST_Intersects 대상 영역(SRID 4326)
	 * @param categoryId null 이면 카테고리 필터 없이 전체 조회
	 */
	List<TransactionHistory> findExpensesWithinArea(Long userId, Polygon area, OffsetDateTime startDateTime,
		OffsetDateTime endDateTime, Long categoryId);
}
