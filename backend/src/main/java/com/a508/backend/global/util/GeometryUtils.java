package com.a508.backend.global.util;

import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.CoordinateXY;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.Polygon;
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

    private static final double EARTH_RADIUS_METERS = 6_371_008.8;

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
     * 지도 화면 영역(bounding box)을 SRID 4326 사각형 Polygon 으로 만든다.
     * 공간 조건(ST_Intersects)의 대상 영역으로 사용하며, PostGIS GiST 인덱스를 탈 수 있다.
     * <p>
     * toPoint 와 동일하게 CoordinateXY 로 2차원을 고정하고, 좌표 범위도 같은 기준으로 검증한다.
     *
     * @throws BusinessException 꼭짓점 좌표가 유효 범위를 벗어난 경우(INVALID_LATITUDE / INVALID_LONGITUDE)
     */
    public static Polygon toEnvelope(double south, double west, double north, double east) {
        validateRange(south, west);
        validateRange(north, east);

        Coordinate[] coordinates = {
            new CoordinateXY(west, south),
            new CoordinateXY(east, south),
            new CoordinateXY(east, north),
            new CoordinateXY(west, north),
            new CoordinateXY(west, south)
        };

        Polygon polygon = GEOMETRY_FACTORY.createPolygon(coordinates);
        polygon.setSRID(SRID_WGS84);

        return polygon;
    }

    /**
     * 두 좌표 사이의 대권 거리(m)를 하버사인 공식으로 계산한다.
     * 둘 중 하나라도 null 이면 반경 계산 대상에서 제외되도록 무한대를 반환한다.
     */
    public static double distanceMeters(Point from, Point to) {
        if (from == null || to == null) {
            return Double.POSITIVE_INFINITY;
        }

        double latitudeDelta = Math.toRadians(to.getY() - from.getY());
        double longitudeDelta = Math.toRadians(to.getX() - from.getX());

        double a = Math.pow(Math.sin(latitudeDelta / 2), 2)
            + Math.cos(Math.toRadians(from.getY())) * Math.cos(Math.toRadians(to.getY()))
            * Math.pow(Math.sin(longitudeDelta / 2), 2);

        return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1.0, Math.sqrt(a)));
    }

    /**
     * 위도 유효 범위 판정. 좌표 범위 기준을 이 클래스 하나로 모으기 위해 공개한다.
     * 범위를 벗어났을 때 던질 예외가 도메인마다 다른 경우(예: 지도 영역)를 위해 검증이 아닌 판정만 제공한다.
     */
    public static boolean isValidLatitude(double latitude) {
        return latitude >= MIN_LATITUDE && latitude <= MAX_LATITUDE;
    }

    /** 경도 유효 범위 판정. {@link #isValidLatitude} 와 같은 이유로 공개한다. */
    public static boolean isValidLongitude(double longitude) {
        return longitude >= MIN_LONGITUDE && longitude <= MAX_LONGITUDE;
    }

    /**
     * Point 를 만들지 않고 좌표 범위만 검증한다.
     * 좌표를 쿼리 파라미터로만 사용하는 조회 API(예: 내 주변 지출)에서 쓴다.
     *
     * @throws BusinessException 위도/경도가 유효 범위를 벗어난 경우(INVALID_LATITUDE / INVALID_LONGITUDE)
     */
    public static void validateCoordinate(double latitude, double longitude) {
        validateRange(latitude, longitude);
    }

    /**
     * 좌표 범위 검증. 요청 DTO 의 @DecimalMin/@DecimalMax 로 이미 걸러지므로,
     * 여기서는 내부 호출 실수를 잡는 최후 방어선 역할만 한다.
     * 공통 예외 양식(BusinessException + ExceptionType)을 따라 GlobalExceptionHandler 가 400 으로 응답하게 한다.
     */
    private static void validateRange(double latitude, double longitude) {
        if (!isValidLatitude(latitude)) {
            throw new BusinessException(ExceptionType.INVALID_LATITUDE);
        }
        if (!isValidLongitude(longitude)) {
            throw new BusinessException(ExceptionType.INVALID_LONGITUDE);
        }
    }
}
