package com.a508.backend.mypage.domain;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class MyPlaceTest {

    @Test
    void createWgs84PointWithLongitudeAsXAndLatitudeAsY() {
        MyPlace myPlace = MyPlace.create(
                1L,
                "집",
                "서울 마포구",
                new BigDecimal("37.5563"),
                new BigDecimal("126.9236")
        );

        assertThat(myPlace.getCoordinate().getSRID()).isEqualTo(4326);
        assertThat(myPlace.getCoordinate().getX()).isEqualTo(126.9236);
        assertThat(myPlace.getCoordinate().getY()).isEqualTo(37.5563);
        assertThat(myPlace.getLatitude()).isEqualByComparingTo("37.5563");
        assertThat(myPlace.getLongitude()).isEqualByComparingTo("126.9236");
    }

    @Test
    void updateNameAndLocation() {
        MyPlace myPlace = MyPlace.create(
                1L,
                "집",
                "서울 마포구",
                new BigDecimal("37.5563"),
                new BigDecimal("126.9236")
        );

        myPlace.updateName("우리 집");
        myPlace.updateLocation(
                "서울 마포구 연남동",
                new BigDecimal("37.5638"),
                new BigDecimal("126.9217")
        );

        assertThat(myPlace.getMyPlaceName()).isEqualTo("우리 집");
        assertThat(myPlace.getAddress()).isEqualTo("서울 마포구 연남동");
        assertThat(myPlace.getCoordinate().getSRID()).isEqualTo(4326);
        assertThat(myPlace.getLatitude()).isEqualByComparingTo("37.5638");
        assertThat(myPlace.getLongitude()).isEqualByComparingTo("126.9217");
    }

    @Test
    void checkOwnership() {
        MyPlace myPlace = MyPlace.create(
                1L,
                "집",
                "서울 마포구",
                new BigDecimal("37.5563"),
                new BigDecimal("126.9236")
        );

        assertThat(myPlace.isOwnedBy(1L)).isTrue();
        assertThat(myPlace.isOwnedBy(2L)).isFalse();
    }
}
