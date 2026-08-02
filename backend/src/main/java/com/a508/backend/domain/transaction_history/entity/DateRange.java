package com.a508.backend.domain.transaction_history.entity;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.global.util.DateTimeUtils;

/**
 * 거래내역 조회 기간. 쿼리 파라미터 파싱 + 기본값 + 시작/종료 순서 검증을 한곳에 모은다.
 * 기본값은 엔드포인트마다 다르므로(가계부는 이번 달, 지도는 이번 주) 팩터리를 나눠 제공한다.
 */
public record DateRange(LocalDate start, LocalDate end) {

	/**
	 * 값이 없을 때 이번 달 1일 ~ 오늘로 조회하는 기간.
	 */
	public static DateRange ofThisMonth(String startDate, String endDate) {
		return of(startDate, endDate, DateTimeUtils.today().withDayOfMonth(1));
	}

	/**
	 * 값이 없을 때 이번 주 시작일(월요일) ~ 오늘로 조회하는 기간.
	 */
	public static DateRange ofThisWeek(String startDate, String endDate) {
		return of(startDate, endDate, DateTimeUtils.mondayOfThisWeek());
	}

	/**
	 * 오늘을 포함한 최근 n일. 조회 기간이 고정이라 쿼리 파라미터를 받지 않는 화면(예: 홈)에서 쓴다.
	 */
	public static DateRange ofRecentDays(int days) {
		LocalDate today = DateTimeUtils.today();
		return new DateRange(today.minusDays(days - 1L), today);
	}

	/**
	 * 종료일의 기본값은 항상 오늘이다.
	 * 형식이 잘못되면 {@link ExceptionType#INVALID_DATE_FORMAT},
	 * 시작일이 종료일보다 뒤면 {@link ExceptionType#INVALID_DATE_RANGE} 예외를 던진다.
	 */
	private static DateRange of(String startDate, String endDate, LocalDate defaultStart) {
		LocalDate start = DateTimeUtils.parseDateOrDefault(startDate, defaultStart);
		LocalDate end = DateTimeUtils.parseDateOrDefault(endDate, DateTimeUtils.today());

		if (start.isAfter(end)) {
			throw new BusinessException(ExceptionType.INVALID_DATE_RANGE);
		}

		return new DateRange(start, end);
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
