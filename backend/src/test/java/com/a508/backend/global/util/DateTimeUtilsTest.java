package com.a508.backend.global.util;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class DateTimeUtilsTest {

    private static final LocalDateTime KST_WALL_CLOCK = LocalDateTime.of(2026, 7, 27, 15, 30, 0);

    @Test
    @DisplayName("toServiceOffset 은 KST(+09:00) 벽시계 시각으로 해석한 instant 를 만든다")
    void toServiceOffset() {
        OffsetDateTime offset = DateTimeUtils.toServiceOffset(KST_WALL_CLOCK);

        // 2026-07-27 15:30 KST == 2026-07-27 06:30 UTC
        assertThat(offset.withOffsetSameInstant(ZoneOffset.UTC).toLocalDateTime())
                .isEqualTo(LocalDateTime.of(2026, 7, 27, 6, 30, 0));
    }

    @Test
    @DisplayName("toServiceLocal 은 저장된 instant 를 KST 벽시계 시각으로 되돌린다 (round-trip)")
    void roundTrip() {
        OffsetDateTime stored = DateTimeUtils.toServiceOffset(KST_WALL_CLOCK)
                .withOffsetSameInstant(ZoneOffset.UTC); // DB/Hibernate 가 offset 을 UTC 로 정규화해도

        assertThat(DateTimeUtils.toServiceLocal(stored)).isEqualTo(KST_WALL_CLOCK);
    }

    @Test
    @DisplayName("null 입력은 null 을 반환한다")
    void nullSafe() {
        assertThat(DateTimeUtils.toServiceOffset(null)).isNull();
        assertThat(DateTimeUtils.toServiceLocal(null)).isNull();
    }
}
