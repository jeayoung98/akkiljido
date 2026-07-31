package com.a508.backend.global.util;

import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;

/**
 * PostGIS geometry(POINT) 컬럼과 위/경도(lat/lng) 사이의 변환을 담당하는 유틸.
 * SRID 4326(WGS84)을 사용하며, 컬럼 정의(SRID)와 반드시 일치시켜야 insert 시 SRID 오류가 발생하지 않는다.
 */
public final class GeometryUtils {

    public static final int SRID_WGS84 = 4326;

    // GeometryFactory 는 thread-safe 하므로 재사용
    private static final GeometryFactory GEOMETRY_FACTORY =
            new GeometryFactory(new PrecisionModel(), SRID_WGS84);

    private GeometryUtils() {
    }

    /**
     * 위도/경도로 SRID 4326 Point 를 생성한다. 둘 중 하나라도 null 이면 null 을 반환한다.
     * 주의: JTS 는 (x=경도, y=위도) 순서로 좌표를 받는다.
     */
    public static Point toPoint(Double latitude, Double longitude) {
        if (latitude == null || longitude == null) {
            return null;
        }
        return GEOMETRY_FACTORY.createPoint(new Coordinate(longitude, latitude));
    }

    public static Double latitudeOf(Point point) {
        return point == null ? null : point.getY();
    }

    public static Double longitudeOf(Point point) {
        return point == null ? null : point.getX();
    }
}
