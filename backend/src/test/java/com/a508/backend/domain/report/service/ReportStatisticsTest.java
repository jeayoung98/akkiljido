package com.a508.backend.domain.report.service;

import static org.assertj.core.api.Assertions.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.a508.backend.domain.category.entity.Category;
import com.a508.backend.domain.report.entity.ReportPeriod;
import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.domain.transaction_history.entity.TransactionType;
import com.a508.backend.domain.user.domain.User;
import com.a508.backend.global.util.DateTimeUtils;
import com.a508.backend.global.util.GeometryUtils;

/** 구조화 컬럼 3종(총지출/최다지출 장소/최빈 장소) 계산 기준을 검증한다. */
class ReportStatisticsTest {

	private final User user = User.createGoogleGuest("test-sub");
	private final Category food = Category.builder().user(user).name("음식점").build();
	private final Category cafe = Category.builder().user(user).name("카페·간식").build();
	private final Category transport = Category.builder().user(user).name("교통").build();
	private final Category living = Category.builder().user(user).name("생활").build();

	private TransactionHistory tx(Category category, String name, long amount, String paymentMethod,
		TransactionType type, double latitude, double longitude) {
		return TransactionHistory.builder()
			.user(user)
			.category(category)
			.datetime(DateTimeUtils.toServiceOffset(LocalDateTime.of(2026, 10, 12, 12, 0)))
			.amount(amount)
			.type(type)
			.transactionName(name)
			.paymentMethod(paymentMethod)
			.coordinate(GeometryUtils.toPoint(latitude, longitude))
			.build();
	}

	private ReportSource sourceOf(TransactionHistory... transactions) {
		return new ReportSource(1L,
			new ReportPeriod(LocalDate.of(2026, 10, 12), LocalDate.of(2026, 10, 18)),
			List.of(transactions), List.of());
	}

	@Test
	@DisplayName("총지출은 고정비를 포함하고, 최다지출 장소는 재량지출 기준이라 고정비(자동이체)를 제외한다")
	void highestExcludesFixedCost() {
		ReportStatistics stats = ReportStatistics.from(sourceOf(
			tx(living, "임대인", 500_000, "자동이체", TransactionType.EXPENSE, 37.2975, 126.9730),
			tx(food, "수원역초밥", 27_300, "카드", TransactionType.EXPENSE, 37.2662, 127.0002),
			tx(cafe, "스타벅스", 4_500, "카드", TransactionType.EXPENSE, 37.2659, 126.9999)));

		assertThat(stats.totalCost()).isEqualTo(531_800);
		assertThat(stats.highestSpendingPlace()).isEqualTo("수원역초밥");
		assertThat(stats.count()).isEqualTo(2);
	}

	@Test
	@DisplayName("최빈 장소는 교통 카테고리를 제외한다 — 출퇴근 정류장이 항상 1위가 되는 것을 막는다")
	void mostFrequentExcludesTransport() {
		ReportStatistics stats = ReportStatistics.from(sourceOf(
			tx(transport, "3003번", 3_000, "교통카드", TransactionType.EXPENSE, 37.2988, 126.9742),
			tx(transport, "3003번", 3_000, "교통카드", TransactionType.EXPENSE, 37.2988, 126.9742),
			tx(transport, "3003번", 3_000, "교통카드", TransactionType.EXPENSE, 37.2988, 126.9742),
			tx(cafe, "스타벅스", 4_500, "카드", TransactionType.EXPENSE, 37.2659, 126.9999),
			tx(cafe, "스타벅스", 4_500, "카드", TransactionType.EXPENSE, 37.2659, 126.9999)));

		assertThat(stats.mostFrequentPlace()).isEqualTo("스타벅스");
	}

	@Test
	@DisplayName("같은 거래명이라도 좌표가 다르면 다른 장소다 — branch 가 항상 NULL 이라 좌표가 유일한 구분자")
	void sameNameDifferentCoordinateIsDifferentPlace() {
		ReportStatistics stats = ReportStatistics.from(sourceOf(
			tx(cafe, "스타벅스", 5_000, "카드", TransactionType.EXPENSE, 37.4985, 127.0270),
			tx(cafe, "스타벅스", 8_000, "카드", TransactionType.EXPENSE, 37.2659, 126.9999)));

		assertThat(stats.placeCount()).isEqualTo(2);
	}

	@Test
	@DisplayName("수입 거래는 총지출·장소 집계 어디에도 들어가지 않는다")
	void incomeIsExcluded() {
		ReportStatistics stats = ReportStatistics.from(sourceOf(
			tx(living, "(주)넥스트코어", 2_000_000, "입금", TransactionType.INCOME, 37.4990, 127.0280),
			tx(cafe, "스타벅스", 4_500, "카드", TransactionType.EXPENSE, 37.2659, 126.9999)));

		assertThat(stats.totalCost()).isEqualTo(4_500);
		assertThat(stats.placeCount()).isEqualTo(1);
		assertThat(stats.highestSpendingPlace()).isEqualTo("스타벅스");
	}

	@Test
	@DisplayName("재량 거래가 하나도 없으면 장소 컬럼은 '-' 로 채운다 (NOT NULL 컬럼)")
	void emptyDiscretionaryUsesPlaceholder() {
		ReportStatistics stats = ReportStatistics.from(sourceOf(
			tx(living, "임대인", 500_000, "자동이체", TransactionType.EXPENSE, 37.2975, 126.9730)));

		assertThat(stats.highestSpendingPlace()).isEqualTo("-");
		assertThat(stats.mostFrequentPlace()).isEqualTo("-");
		assertThat(stats.count()).isZero();
	}
}
