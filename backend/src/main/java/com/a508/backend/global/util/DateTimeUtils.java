package com.a508.backend.global.util;

import java.time.DayOfWeek;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.time.temporal.TemporalAdjusters;

import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;

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

    /** 서비스 기준 시간대(KST)의 오늘 날짜. */
    public static LocalDate today() {
        return LocalDate.now(SERVICE_ZONE);
    }

    /** 서비스 기준 시간대(KST)로 이번 주 시작일(월요일). */
    public static LocalDate mondayOfThisWeek() {
        return today().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    /**
     * 조회용 날짜 문자열("yyyy-MM-dd")을 파싱한다.
     * 값이 없거나 공백이면 기본값을 사용하고, 형식이 잘못되면 {@link ExceptionType#INVALID_DATE_FORMAT} 예외를 던진다.
     */
    public static LocalDate parseDateOrDefault(String value, LocalDate defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException e) {
            throw new BusinessException(ExceptionType.INVALID_DATE_FORMAT);
        }
    }

    /** 조회 시작 경계. 해당 일자의 00:00:00(KST). */
    public static OffsetDateTime startOfDay(LocalDate date) {
        return date.atStartOfDay(SERVICE_ZONE).toOffsetDateTime();
    }

    /** 조회 종료 경계(미만 비교용). 다음 날의 00:00:00(KST). */
    public static OffsetDateTime startOfNextDay(LocalDate date) {
        return date.plusDays(1).atStartOfDay(SERVICE_ZONE).toOffsetDateTime();
    }

    /** 선택한 연월의 시작 시각(포함)과 다음 달 시작 시각(미포함)을 반환한다. */
    public static DateTimeRange monthRange(int year, int month) {
        YearMonth selectedMonth = YearMonth.of(year, month);

        OffsetDateTime start = startOfDay(selectedMonth.atDay(1));
        OffsetDateTime end = startOfDay(selectedMonth.plusMonths(1).atDay(1));

        return new DateTimeRange(start, end);
    }

    /** 연도·월·일을 날짜로 만들고, 존재하지 않는 날짜이면 캘린더 날짜 오류를 던진다. */
    public static LocalDate createDate(int year, int month, int day) {
        try {
            return LocalDate.of(year, month, day);
        } catch (DateTimeException e) {
            throw new BusinessException(ExceptionType.INVALID_CALENDAR_DATE);
        }
    }
}
