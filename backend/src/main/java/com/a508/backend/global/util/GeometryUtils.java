package com.a508.backend.global.util;

import org.locationtech.jts.geom.CoordinateXY;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;

import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;

/**
 * PostGIS geometry(Point, 4326) 컬럼과 위/경도(latitude/longitude) 사이의 변환을 담당하는 단일 유틸.
 * <p>
 * 좌표를 다루는 코드는 엔티티/서비스/DTO 어디에서든 이 클래스만 사용한다.
 * 엔티티마다 GeometryFactory 를 따로 두면 SRID·차원 정책이 갈리므로 여기서만 정의한다.
 * <ul>
 *     <li>SRID 는 4326(WGS84) 으로 고정한다. 컬럼 정의의 SRID 와 일치해야 insert 시 SRID 오류가 없다.</li>
 *     <li>JTS 는 (x=경도, y=위도) 순서다. 이 클래스의 파라미터 순서(위도, 경도)와 반대이므로 직접 Coordinate 를 만들지 않는다.</li>
 *     <li>좌표 타입은 Double 로 통일한다. JTS 내부가 double 이라 BigDecimal 을 써도 정밀도 이득이 없다.</li>
 * </ul>
 */
public final class GeometryUtils {

    public static final int SRID_WGS84 = 4326;

    private static final double MIN_LATITUDE = -90.0;
    private static final double MAX_LATITUDE = 90.0;
    private static final double MIN_LONGITUDE = -180.0;
    private static final double MAX_LONGITUDE = 180.0;

    // GeometryFactory 는 thread-safe 하므로 재사용한다.
    private static final GeometryFactory GEOMETRY_FACTORY =
            new GeometryFactory(new PrecisionModel(), SRID_WGS84);

    private GeometryUtils() {
    }

    /**
     * 위도/경도로 SRID 4326 Point 를 생성한다. 둘 중 하나라도 null 이면 null 을 반환한다.
     * CoordinateXY 를 사용해 z 값(NaN)이 WKB 에 섞이지 않도록 2차원 좌표로 고정한다.
     *
     * @throws BusinessException 위도/경도가 유효 범위를 벗어난 경우(INVALID_LATITUDE / INVALID_LONGITUDE)
     */
    public static Point toPoint(Double latitude, Double longitude) {
        if (latitude == null || longitude == null) {
            return null;
        }
        validateRange(latitude, longitude);

        Point point = GEOMETRY_FACTORY.createPoint(new CoordinateXY(longitude, latitude));
        point.setSRID(SRID_WGS84);

        return point;
    }

    /** Point 의 위도(y)를 반환한다. null 이면 null 을 반환한다. */
    public static Double latitudeOf(Point point) {
        return point == null ? null : point.getY();
    }

    /** Point 의 경도(x)를 반환한다. null 이면 null 을 반환한다. */
    public static Double longitudeOf(Point point) {
        return point == null ? null : point.getX();
    }

    /**
     * 좌표 범위 검증. 요청 DTO 의 @DecimalMin/@DecimalMax 로 이미 걸러지므로,
     * 여기서는 내부 호출 실수를 잡는 최후 방어선 역할만 한다.
     * 공통 예외 양식(BusinessException + ExceptionType)을 따라 GlobalExceptionHandler 가 400 으로 응답하게 한다.
     */
    private static void validateRange(double latitude, double longitude) {
        if (latitude < MIN_LATITUDE || latitude > MAX_LATITUDE) {
            throw new BusinessException(ExceptionType.INVALID_LATITUDE);
        }
        if (longitude < MIN_LONGITUDE || longitude > MAX_LONGITUDE) {
            throw new BusinessException(ExceptionType.INVALID_LONGITUDE);
        }
    }
}
