package com.a508.backend.global.util;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import org.assertj.core.data.Offset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Point;

import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;

class GeometryUtilsTest {

    @Test
    @DisplayName("toPoint 는 위/경도로 SRID 4326 Point 를 만든다 (JTS 는 x=경도, y=위도)")
    void toPointCreatesWgs84Point() {
        Point point = GeometryUtils.toPoint(37.5006, 127.0366);

        assertThat(point).isNotNull();
        assertThat(point.getSRID()).isEqualTo(GeometryUtils.SRID_WGS84);
        assertThat(point.getY()).isCloseTo(37.5006, Offset.offset(1e-9));
        assertThat(point.getX()).isCloseTo(127.0366, Offset.offset(1e-9));
    }

    @Test
    @DisplayName("toPoint 는 위도나 경도가 null 이면 null 을 반환한다")
    void toPointReturnsNullWhenEitherIsNull() {
        assertThat(GeometryUtils.toPoint(null, 127.0)).isNull();
        assertThat(GeometryUtils.toPoint(37.5, null)).isNull();
        assertThat(GeometryUtils.toPoint(null, null)).isNull();
    }

    @Test
    @DisplayName("latitudeOf/longitudeOf 는 Point 의 좌표를 반환하고 null 이면 null 을 반환한다")
    void extractsCoordinates() {
        Point point = GeometryUtils.toPoint(37.5006, 127.0366);

        assertThat(GeometryUtils.latitudeOf(point)).isCloseTo(37.5006, Offset.offset(1e-9));
        assertThat(GeometryUtils.longitudeOf(point)).isCloseTo(127.0366, Offset.offset(1e-9));
        assertThat(GeometryUtils.latitudeOf(null)).isNull();
        assertThat(GeometryUtils.longitudeOf(null)).isNull();
    }

    @Test
    @DisplayName("toPoint 는 z 좌표가 없는 2차원 Point 를 만든다")
    void toPointCreatesTwoDimensionalPoint() {
        // toPoint 로 갓 만든 Point 에 대한 검증이다.
        // DB 에서 읽어온 Point 는 hibernate-spatial 의 WKB 리더가 dimension 3(z=NaN)으로 만들 수 있다.
        Point point = GeometryUtils.toPoint(37.5006, 127.0366);

        assertThat(point.getCoordinateSequence().getDimension()).isEqualTo(2);
        assertThat(point.getCoordinate().getZ()).isNaN();
    }

    @Test
    @DisplayName("toPoint 는 위도가 유효 범위를 벗어나면 INVALID_LATITUDE BusinessException 을 던진다")
    void toPointRejectsOutOfRangeLatitude() {
        Throwable thrown = catchThrowable(() -> GeometryUtils.toPoint(90.1, 127.0));

        assertThat(thrown).isInstanceOf(BusinessException.class);
        assertThat(((BusinessException)thrown).getExceptionType())
                .isEqualTo(ExceptionType.INVALID_LATITUDE);
    }

    @Test
    @DisplayName("toPoint 는 경도가 유효 범위를 벗어나면 INVALID_LONGITUDE BusinessException 을 던진다")
    void toPointRejectsOutOfRangeLongitude() {
        Throwable thrown = catchThrowable(() -> GeometryUtils.toPoint(37.5, 180.1));

        assertThat(thrown).isInstanceOf(BusinessException.class);
        assertThat(((BusinessException)thrown).getExceptionType())
                .isEqualTo(ExceptionType.INVALID_LONGITUDE);
    }

    @Test
    @DisplayName("toPoint 는 경계값(±90, ±180)은 허용한다")
    void toPointAcceptsBoundaryCoordinates() {
        assertThat(GeometryUtils.toPoint(90.0, 180.0)).isNotNull();
        assertThat(GeometryUtils.toPoint(-90.0, -180.0)).isNotNull();
    }
}
