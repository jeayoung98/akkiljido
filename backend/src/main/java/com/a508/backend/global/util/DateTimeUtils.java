package com.a508.backend.global.util;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;

/**
 * API 의 timezone 없는 datetime("yyyy-MM-dd HH:mm:ss")과 DB 의 TIMESTAMPTZ(OffsetDateTime) 사이 변환 유틸.
 * 서비스 기준 시간대를 Asia/Seoul 로 고정한다.
 */
public final class DateTimeUtils {

    public static final ZoneId SERVICE_ZONE = ZoneId.of("Asia/Seoul");

    private DateTimeUtils() {
    }

    /** 서비스 기준 시간대(KST)의 벽시계 시각으로 해석하여 OffsetDateTime 으로 변환한다. */
    public static OffsetDateTime toServiceOffset(LocalDateTime localDateTime) {
        if (localDateTime == null) {
            return null;
        }
        return localDateTime.atZone(SERVICE_ZONE).toOffsetDateTime();
    }

    /** 저장된 시점(instant)을 서비스 기준 시간대(KST)의 벽시계 시각으로 되돌린다. */
    public static LocalDateTime toServiceLocal(OffsetDateTime offsetDateTime) {
        if (offsetDateTime == null) {
            return null;
        }
        return offsetDateTime.atZoneSameInstant(SERVICE_ZONE).toLocalDateTime();
    }
}
