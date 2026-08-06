package com.a508.backend.domain.transaction_history.entity;

import static org.assertj.core.api.Assertions.*;

import java.time.LocalDate;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.global.util.DateTimeUtils;

/**
 * 조회 기간 값 객체 단위 테스트. 두 서비스에 흩어져 있던 파싱/기본값/검증 규칙을 여기서 고정한다.
 */
class DateRangeTest {

	@Test
	@DisplayName("값을 넘기면 그대로 파싱한다")
	void parsesGivenDates() {
		DateRange dateRange = DateRange.ofThisWeek("2026-07-27", "2026-08-01");

		assertThat(dateRange.start()).isEqualTo(LocalDate.of(2026, 7, 27));
		assertThat(dateRange.end()).isEqualTo(LocalDate.of(2026, 8, 1));
	}

	@Test
	@DisplayName("ofThisWeek 의 시작일 기본값은 이번 주 월요일이다")
	void defaultsToMondayOfThisWeek() {
		DateRange dateRange = DateRange.ofThisWeek(null, null);

		assertThat(dateRange.start()).isEqualTo(DateTimeUtils.mondayOfThisWeek());
		assertThat(dateRange.end()).isEqualTo(DateTimeUtils.today());
	}

	@Test
	@DisplayName("ofThisMonth 의 시작일 기본값은 이번 달 1일이다")
	void defaultsToFirstDayOfThisMonth() {
		DateRange dateRange = DateRange.ofThisMonth("", "");

		assertThat(dateRange.start()).isEqualTo(DateTimeUtils.today().withDayOfMonth(1));
		assertThat(dateRange.end()).isEqualTo(DateTimeUtils.today());
	}

	@Test
	@DisplayName("시작 경계는 당일 00:00, 종료 경계는 다음 날 00:00(KST)이다")
	void convertsToQueryBoundaries() {
		DateRange dateRange = DateRange.ofThisWeek("2026-07-27", "2026-08-01");

		assertThat(dateRange.startDateTime())
			.isEqualTo(DateTimeUtils.startOfDay(LocalDate.of(2026, 7, 27)));
		assertThat(dateRange.endDateTime())
			.isEqualTo(DateTimeUtils.startOfDay(LocalDate.of(2026, 8, 2)));
	}

	@Test
	@DisplayName("시작일과 종료일이 같으면 하루치 범위로 허용한다")
	void allowsSingleDayRange() {
		DateRange dateRange = DateRange.ofThisWeek("2026-07-27", "2026-07-27");

		assertThat(dateRange.startDateTime()).isBefore(dateRange.endDateTime());
	}

	@Test
	@DisplayName("날짜 형식이 잘못되면 INVALID_DATE_FORMAT 예외를 던진다")
	void rejectsInvalidFormat() {
		assertThatThrownBy(() -> DateRange.ofThisWeek("2026/07/27", null))
			.isInstanceOf(BusinessException.class)
			.extracting(e -> ((BusinessException)e).getExceptionType())
			.isEqualTo(ExceptionType.INVALID_DATE_FORMAT);
	}

	@Test
	@DisplayName("시작일이 종료일보다 뒤면 INVALID_DATE_RANGE 예외를 던진다")
	void rejectsInvertedRange() {
		assertThatThrownBy(() -> DateRange.ofThisMonth("2026-08-02", "2026-08-01"))
			.isInstanceOf(BusinessException.class)
			.extracting(e -> ((BusinessException)e).getExceptionType())
			.isEqualTo(ExceptionType.INVALID_DATE_RANGE);
	}
}
