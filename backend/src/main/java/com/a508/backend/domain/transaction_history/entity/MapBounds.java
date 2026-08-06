package com.a508.backend.domain.transaction_history.entity;

import org.locationtech.jts.geom.Polygon;

import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.global.util.GeometryUtils;

/**
 * 지도 조회 화면 영역(bounding box).
 * south/west/north/east 는 기본값이 없는 필수 파라미터이며, 누락 여부는 컨트롤러의 @RequestParam 이 막는다.
 */
public record MapBounds(
		double south,
		double west,
		double north,
		double east
) {
	/**
	 * 쿼리 파라미터를 검증하여 영역을 생성한다.
	 * 범위가 잘못되면 {@link ExceptionType#INVALID_MAP_BOUNDS} 예외를 던진다.
	 * <p>
	 * 위/경도 유효 범위는 좌표 공통 유틸({@link GeometryUtils})의 기준을 따른다.
	 */
	public static MapBounds of(double south, double west, double north, double east) {
		if (!GeometryUtils.isValidLatitude(south) || !GeometryUtils.isValidLatitude(north)
			|| !GeometryUtils.isValidLongitude(west) || !GeometryUtils.isValidLongitude(east)) {
			throw new BusinessException(ExceptionType.INVALID_MAP_BOUNDS);
		}
		// 경도는 날짜변경선을 넘는 경우 west > east 가 될 수 있으나, 국내 서비스 범위에서는 허용하지 않는다.
		if (south > north || west > east) {
			throw new BusinessException(ExceptionType.INVALID_MAP_BOUNDS);
		}

		return new MapBounds(south, west, north, east);
	}

	/** 공간 조건(ST_Intersects)에 사용할 사각형 Polygon(SRID 4326)으로 변환한다. */
	public Polygon toPolygon() {
		return GeometryUtils.toEnvelope(south, west, north, east);
	}
}
