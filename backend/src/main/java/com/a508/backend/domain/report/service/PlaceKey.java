package com.a508.backend.domain.report.service;

import org.locationtech.jts.geom.Point;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.global.util.GeometryUtils;

/**
 * 장소 식별 키 = <b>거래명 + 좌표(1e-7도 반올림)</b>. 설계 문서 §3.1.
 * <p>
 * branch 컬럼은 실서비스에서 항상 NULL 이라 거래명만으로는 "스타벅스" 두 지점이 구분되지 않는다 —
 * 좌표가 유일한 구분자다. 반올림 정밀도(약 1cm)는 지도 조회의 {@code CoordinateKey} 와 동일하다.
 * 좌표가 없는 거래는 같은 이름끼리 하나의 장소로 묶인다(sentinel 값).
 */
public record PlaceKey(String name, long latitudeE7, long longitudeE7) {

	private static final double SCALE = 1e7;
	private static final long NO_COORDINATE = Long.MIN_VALUE;

	public static PlaceKey of(TransactionHistory transaction) {
		Point point = transaction.getCoordinate();
		if (point == null) {
			return new PlaceKey(transaction.getTransactionName(), NO_COORDINATE, NO_COORDINATE);
		}
		return new PlaceKey(
			transaction.getTransactionName(),
			Math.round(GeometryUtils.latitudeOf(point) * SCALE),
			Math.round(GeometryUtils.longitudeOf(point) * SCALE));
	}
}
