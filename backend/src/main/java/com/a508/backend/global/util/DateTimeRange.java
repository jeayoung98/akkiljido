package com.a508.backend.global.util;

import java.time.OffsetDateTime;

/** 조회 시작 시각(포함)과 종료 시각(미포함)을 나타내는 기간. */
public record DateTimeRange(
        OffsetDateTime start,
        OffsetDateTime end
) {
}
