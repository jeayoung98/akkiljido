package com.a508.backend.global.util;

import static org.assertj.core.api.Assertions.assertThat;

import org.assertj.core.data.Offset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Point;

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
}
