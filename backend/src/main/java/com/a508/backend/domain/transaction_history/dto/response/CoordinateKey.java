package com.a508.backend.domain.transaction_history.dto.response;

import org.locationtech.jts.geom.Point;

import com.a508.backend.global.util.GeometryUtils;

/**
 * 좌표 그룹핑 키. double 을 그대로 키로 쓰면 부동소수점 오차로 같은 지점이 갈라질 수 있어
 * 소수점 7자리(약 1cm) 정수로 반올림해 비교한다.
 * <p>
 * Point 에서 위/경도를 꺼내는 축(x/y) 해석은 좌표 공통 유틸({@link GeometryUtils})에 맡긴다.
 */
record CoordinateKey(long latitude, long longitude) {

	private static final double SCALE = 1e7;

	static CoordinateKey of(Point point) {
		return new CoordinateKey(
			Math.round(GeometryUtils.latitudeOf(point) * SCALE),
			Math.round(GeometryUtils.longitudeOf(point) * SCALE));
	}
}
