package com.a508.backend.domain.transaction_history.entity;

import static org.assertj.core.api.Assertions.*;

import java.util.Locale;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;

class TransactionSortTest {

	private final Locale defaultLocale = Locale.getDefault();

	@AfterEach
	void tearDown() {
		Locale.setDefault(defaultLocale);
	}

	@Test
	@DisplayName("값이 없으면 최신순(LATEST)이 기본값이다")
	void defaultsToLatest() {
		assertThat(TransactionSort.from(null)).isEqualTo(TransactionSort.LATEST);
		assertThat(TransactionSort.from("  ")).isEqualTo(TransactionSort.LATEST);
	}

	@Test
	@DisplayName("대소문자를 가리지 않고 파싱한다")
	void parsesIgnoringCase() {
		assertThat(TransactionSort.from("LATEST")).isEqualTo(TransactionSort.LATEST);
		assertThat(TransactionSort.from("Oldest")).isEqualTo(TransactionSort.OLDEST);
	}

	@Test
	@DisplayName("서버 기본 로케일이 터키어여도 파싱 결과가 달라지지 않는다")
	void parsesRegardlessOfDefaultLocale() {
		// 터키어 로케일에서 "LATEST".toLowerCase() 는 'I' 를 'ı'(점 없는 i)로 바꿔 매칭에 실패한다.
		Locale.setDefault(Locale.forLanguageTag("tr"));

		assertThat(TransactionSort.from("LATEST")).isEqualTo(TransactionSort.LATEST);
		assertThat(TransactionSort.from("OLDEST")).isEqualTo(TransactionSort.OLDEST);
	}

	@Test
	@DisplayName("지원하지 않는 값이면 INVALID_SORT_TYPE 예외를 던진다")
	void rejectsUnsupportedValue() {
		assertThatThrownBy(() -> TransactionSort.from("random"))
			.isInstanceOf(BusinessException.class)
			.extracting(e -> ((BusinessException)e).getExceptionType())
			.isEqualTo(ExceptionType.INVALID_SORT_TYPE);
	}

	@Test
	@DisplayName("최신순은 내림차순, 과거순은 오름차순이다")
	void exposesSortDirection() {
		assertThat(TransactionSort.LATEST.isAscending()).isFalse();
		assertThat(TransactionSort.OLDEST.isAscending()).isTrue();
	}
}
