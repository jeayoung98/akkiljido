package com.a508.backend.domain.report.entity;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.TemporalAdjusters;

import com.a508.backend.global.util.DateTimeUtils;

/**
 * 리포트 대상 기간(양끝 포함). 배치 실행일 기준으로 "직전에 닫힌 기간"을 계산한다.
 * <p>
 * 주간 배치는 매주 월요일 새벽, 월간 배치는 매달 1일 새벽에 돌지만, 지연 실행·수동 재실행에도
 * 같은 기간이 나오도록 실행일이 주/월 중간이어도 항상 "직전 완결 주/달"을 돌려준다.
 * 시간 경계는 {@link DateTimeUtils} 기준(KST 하루 단위)을 따른다 — 조회는 [start 00:00, end 다음날 00:00).
 */
public record ReportPeriod(LocalDate start, LocalDate end) {

	/** 직전 완결 주(월~일). 예: 실행일이 월요일이면 지난주 월~일. */
	public static ReportPeriod previousWeek(LocalDate baseDate) {
		LocalDate thisMonday = baseDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
		return new ReportPeriod(thisMonday.minusWeeks(1), thisMonday.minusDays(1));
	}

	/** 직전 완결 달(1일~말일). 예: 실행일이 1일이면 지난달 전체. */
	public static ReportPeriod previousMonth(LocalDate baseDate) {
		LocalDate firstOfThisMonth = baseDate.withDayOfMonth(1);
		return new ReportPeriod(firstOfThisMonth.minusMonths(1), firstOfThisMonth.minusDays(1));
	}

	/** 조회 시작 경계(이상 비교용). 시작일 00:00:00(KST). */
	public OffsetDateTime startDateTime() {
		return DateTimeUtils.startOfDay(start);
	}

	/** 조회 종료 경계(미만 비교용). 종료일 다음 날 00:00:00(KST). */
	public OffsetDateTime endDateTime() {
		return DateTimeUtils.startOfNextDay(end);
	}
}
