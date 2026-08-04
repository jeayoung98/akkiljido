package com.a508.backend.domain.report.service;

import static org.assertj.core.api.Assertions.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.a508.backend.domain.category.entity.Category;
import com.a508.backend.domain.mypage.domain.MyPlace;
import com.a508.backend.domain.report.dto.RecommendationItem;
import com.a508.backend.domain.report.entity.ReportPeriod;
import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.domain.transaction_history.entity.TransactionType;
import com.a508.backend.domain.user.domain.User;
import com.a508.backend.global.util.DateTimeUtils;
import com.a508.backend.global.util.GeometryUtils;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * 추천 추출기 검증 — 51주 골든 대조(참조 구현 obs26) + 템플릿 가드(수량 부사·조사) 단위 검증.
 * 골든은 장소명 표기가 참조 구현과 달라(상호+지점 vs 거래명) [횟수, 금액, 시작시각] 튜플로 비교한다.
 */
class RecommendationExtractorTest {

	private final RecommendationExtractor extractor = new RecommendationExtractor();

	private final User user = User.createGoogleGuest("test-sub");
	private final Category food = Category.builder().user(user).name("음식점").build();
	private final Category mart = Category.builder().user(user).name("편의점·마트").build();
	private final List<MyPlace> myPlaces = List.of(
		MyPlace.create(user, "집", "수원 천천동", 37.2975, 126.9730),
		MyPlace.create(user, "회사", "서울 강남", 37.4990, 127.0280));

	@Test
	@DisplayName("51주 전체에서 추천 결과(횟수·금액·시간창)가 JS 참조 구현의 골든과 일치한다")
	void weeklyRecommendationsMatchGolden() throws Exception {
		User fixtureUser = User.createGoogleGuest("fixture");
		List<TransactionHistory> all = ReportFixtures.loadTransactions(fixtureUser);
		List<MyPlace> places = ReportFixtures.loadMyPlaces(fixtureUser);
		Map<String, List<List<Long>>> golden = new ObjectMapper().readValue(
			ReportFixtures.resource("/report/golden_weekly_recs.json"),
			new TypeReference<TreeMap<String, List<List<Long>>>>() {
			});

		assertThat(golden).hasSize(51);

		List<String> mismatches = new ArrayList<>();
		for (Map.Entry<String, List<List<Long>>> entry : golden.entrySet()) {
			LocalDate monday = LocalDate.parse(entry.getKey());
			ReportPeriod period = new ReportPeriod(monday, monday.plusDays(6));
			List<TransactionHistory> weekly = all.stream()
				.filter(t -> !t.getDatetime().isBefore(period.startDateTime())
					&& t.getDatetime().isBefore(period.endDateTime()))
				.toList();

			ReportSource source = new ReportSource(1L, period, weekly, places);
			List<List<Long>> actual = new ArrayList<>();
			for (RecommendationItem item : extractor.extract(source, Set.of())) {
				actual.add(List.of(
					matching(source, item).count(),
					matching(source, item).mapToLong(TransactionHistory::getAmount).sum(),
					(long)Integer.parseInt(item.startTime().substring(0, 2))));
			}
			if (!actual.equals(entry.getValue())) {
				mismatches.add(entry.getKey() + ": 기대=" + entry.getValue() + " 실제=" + actual);
			}
		}

		assertThat(mismatches).as("골든과 어긋난 주").isEmpty();
	}

	/** 추천 항목이 가리키는 장소(거래명+좌표)의 원본 거래 스트림 — 골든 튜플(횟수·금액) 역산용. */
	private java.util.stream.Stream<TransactionHistory> matching(ReportSource source, RecommendationItem item) {
		return source.discretionary().stream()
			.filter(t -> t.getTransactionName().equals(item.placeName()))
			.filter(t -> t.getCoordinate() != null
				&& Math.abs(GeometryUtils.latitudeOf(t.getCoordinate()) - item.latitude()) < 1e-6
				&& Math.abs(GeometryUtils.longitudeOf(t.getCoordinate()) - item.longitude()) < 1e-6);
	}

	// ── 템플릿·필터 단위 검증 ──

	private TransactionHistory visit(Category category, String name, long amount,
		LocalDateTime when, double lat, double lon) {
		return TransactionHistory.builder()
			.user(user).category(category)
			.datetime(DateTimeUtils.toServiceOffset(when))
			.amount(amount).type(TransactionType.EXPENSE)
			.transactionName(name).paymentMethod("카드")
			.address("경기 수원시").coordinate(GeometryUtils.toPoint(lat, lon))
			.build();
	}

	private ReportSource weekOf(TransactionHistory... transactions) {
		return new ReportSource(1L,
			new ReportPeriod(LocalDate.of(2026, 10, 12), LocalDate.of(2026, 10, 18)),
			List.of(transactions), myPlaces);
	}

	@Test
	@DisplayName("두 방문이 같은 시간창이면 '두 번 다 …이었/였', 다르면 수량 부사를 쓰지 않는다")
	void quantifierRequiresAllInWindow() {
		// 둘 다 오전(9시, 10시) — 같은 창
		List<RecommendationItem> same = extractor.extract(weekOf(
			visit(food, "수원역초밥", 20_000, LocalDateTime.of(2026, 10, 13, 9, 0), 37.2662, 127.0002),
			visit(food, "수원역초밥", 21_000, LocalDateTime.of(2026, 10, 15, 10, 0), 37.2662, 127.0002)),
			Set.of());
		assertThat(same.get(0).reasonMessage()).contains("두 번 다 오전이었는데");

		// 9시와 20시 — 다른 창 → "두 번 다" 금지
		List<RecommendationItem> split = extractor.extract(weekOf(
			visit(food, "수원역초밥", 20_000, LocalDateTime.of(2026, 10, 13, 9, 0), 37.2662, 127.0002),
			visit(food, "수원역초밥", 21_000, LocalDateTime.of(2026, 10, 15, 20, 0), 37.2662, 127.0002)),
			Set.of());
		assertThat(split.get(0).reasonMessage()).doesNotContain("두 번 다");
	}

	@Test
	@DisplayName("받침 없는 시간대(오후)는 '였는데'로 활용한다")
	void koreanParticleForAfternoon() {
		List<RecommendationItem> items = extractor.extract(weekOf(
			visit(food, "수원역초밥", 20_000, LocalDateTime.of(2026, 10, 13, 14, 0), 37.2662, 127.0002),
			visit(food, "수원역초밥", 21_000, LocalDateTime.of(2026, 10, 15, 15, 0), 37.2662, 127.0002)),
			Set.of());
		assertThat(items.get(0).reasonMessage()).contains("두 번 다 오후였는데");
	}

	@Test
	@DisplayName("근거 하한: 1회 소액은 제외, 1회라도 3만 원 이상이면 후보")
	void minimumEvidence() {
		List<RecommendationItem> items = extractor.extract(weekOf(
			visit(food, "수원역초밥", 7_600, LocalDateTime.of(2026, 10, 13, 18, 0), 37.2662, 127.0002),
			visit(food, "인계동막창", 31_500, LocalDateTime.of(2026, 10, 15, 19, 0), 37.2875, 127.0350)),
			Set.of());
		assertThat(items).extracting(RecommendationItem::placeName).containsExactly("인계동막창");
	}

	@Test
	@DisplayName("쿨다운: 최근 추천된 장소명은 제외된다")
	void cooldownExcludesByName() {
		List<RecommendationItem> items = extractor.extract(weekOf(
			visit(food, "수원역초밥", 20_000, LocalDateTime.of(2026, 10, 13, 18, 0), 37.2662, 127.0002),
			visit(food, "수원역초밥", 21_000, LocalDateTime.of(2026, 10, 15, 18, 0), 37.2662, 127.0002)),
			Set.of("수원역초밥"));
		assertThat(items).isEmpty();
	}

	@Test
	@DisplayName("my_place 300m 안(집 근처 마트 등)은 위치 알림 후보에서 제외된다")
	void nearMyPlaceExcluded() {
		List<RecommendationItem> items = extractor.extract(weekOf(
			visit(mart, "CU", 9_000, LocalDateTime.of(2026, 10, 13, 20, 0), 37.2980, 126.9725),
			visit(mart, "CU", 8_000, LocalDateTime.of(2026, 10, 15, 20, 0), 37.2980, 126.9725)),
			Set.of());
		assertThat(items).isEmpty();
	}
}
