package com.a508.backend.domain.report.service;

import static org.assertj.core.api.Assertions.*;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.Charset;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.a508.backend.domain.category.entity.Category;
import com.a508.backend.domain.mypage.domain.MyPlace;
import com.a508.backend.domain.report.entity.ReportPeriod;
import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.domain.transaction_history.entity.TransactionType;
import com.a508.backend.domain.user.domain.User;
import com.a508.backend.global.util.GeometryUtils;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * 사실 추출기 포팅 회귀 검증 — 시연용 시드 데이터 51주 전체에 대해, 자바 구현의 주별 발동 사실이
 * JS 참조 구현(PoC-AI 레포 obs24_inventory_v2.mjs)의 골든 파일과 완전히 일치해야 한다.
 * <p>
 * 픽스처(test/resources/report/)는 참조 구현 쪽에서 생성한다:
 * dummy_data.csv(시드 원본, cp949) · my_place.csv · golden_weekly_facts.json(주별 사실 이름, 정렬).
 * 임계값·조건을 바꾸면 참조 구현과 골든을 함께 갱신해야 한다.
 */
class WeeklyFactComparisonTest {

	private static final Charset CP949 = Charset.forName("MS949");
	private static final DateTimeFormatter DATETIME =
		DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ssXXX");

	private final FactExtractor factExtractor = new FactExtractor();

	@Test
	@DisplayName("51주 전체에서 발동 사실이 JS 참조 구현의 골든 파일과 일치한다")
	void weeklyFactsMatchGolden() throws Exception {
		User user = User.createGoogleGuest("fixture");
		List<TransactionHistory> all = loadTransactions(user);
		List<MyPlace> myPlaces = loadMyPlaces(user);
		Map<String, List<String>> golden = new ObjectMapper().readValue(
			resource("/report/golden_weekly_facts.json"),
			new TypeReference<TreeMap<String, List<String>>>() {
			});

		assertThat(golden).hasSize(51);

		List<String> mismatches = new ArrayList<>();
		for (Map.Entry<String, List<String>> entry : golden.entrySet()) {
			LocalDate monday = LocalDate.parse(entry.getKey());
			ReportPeriod period = new ReportPeriod(monday, monday.plusDays(6));

			List<TransactionHistory> weekly = all.stream()
				.filter(t -> !t.getDatetime().isBefore(period.startDateTime())
					&& t.getDatetime().isBefore(period.endDateTime()))
				.toList();

			List<String> actual = factExtractor
				.extractAll(new ReportSource(1L, period, weekly, myPlaces))
				.stream().map(Fact::name).sorted().toList();

			if (!actual.equals(entry.getValue())) {
				List<String> missing = entry.getValue().stream().filter(n -> !actual.contains(n)).toList();
				List<String> extra = actual.stream().filter(n -> !entry.getValue().contains(n)).toList();
				mismatches.add(String.format("%s: 누락=%s 초과=%s", entry.getKey(), missing, extra));
			}
		}

		assertThat(mismatches).as("골든과 어긋난 주").isEmpty();
	}

	@Test
	@DisplayName("선택 규칙: tier 내림차순 상위 4개, 같은 축에서는 최대 1개")
	void selectTopDeduplicatesAxis() {
		List<Fact> facts = List.of(
			new Fact("절대", "원거리", 3, "a"),
			new Fact("금액", "큰 결제 없음", 2, "b"),
			new Fact("금액", "금액 고른 편", 2, "c"),   // 금액 축 중복 → 탈락
			new Fact("공간", "회사 근처 편중", 2, "d"),
			new Fact("시퀀스", "퇴근후 편의점", 1, "e"),
			new Fact("집중", "단골 반복", 1, "f"));     // 5번째 축이지만 4개 초과 → 탈락

		List<Fact> selected = factExtractor.selectTop(facts);

		assertThat(selected).extracting(Fact::name)
			.containsExactly("원거리", "큰 결제 없음", "회사 근처 편중", "퇴근후 편의점");
	}

	// ── 픽스처 로더 ──

	private InputStream resource(String path) {
		return getClass().getResourceAsStream(path);
	}

	private List<TransactionHistory> loadTransactions(User user) throws Exception {
		Map<String, Category> categories = new HashMap<>();
		List<TransactionHistory> result = new ArrayList<>();
		try (BufferedReader reader = new BufferedReader(
			new InputStreamReader(resource("/report/dummy_data.csv"), CP949))) {
			List<String> header = parseCsvLine(reader.readLine());
			String line;
			while ((line = reader.readLine()) != null) {
				if (line.isBlank()) {
					continue;
				}
				List<String> f = parseCsvLine(line);
				Map<String, String> row = new HashMap<>();
				for (int i = 0; i < header.size(); i++) {
					row.put(header.get(i), i < f.size() ? f.get(i) : "");
				}
				Category category = categories.computeIfAbsent(row.get("category_name"),
					name -> Category.builder().user(user).name(name).build());
				result.add(TransactionHistory.builder()
					.user(user)
					.category(category)
					.datetime(OffsetDateTime.parse(row.get("datetime"), DATETIME))
					.amount(Long.parseLong(row.get("amount")))
					.type(TransactionType.valueOf(row.get("type")))
					.transactionName(row.get("transaction_name"))
					.paymentMethod(row.get("payment_method"))
					.region1DepthName(row.get("region_1depth_name"))
					.region2DepthName(row.get("region_2depth_name"))
					.region3DepthName(row.get("region_3depth_name"))
					.coordinate(GeometryUtils.toPoint(
						Double.parseDouble(row.get("latitude")),
						Double.parseDouble(row.get("longitude"))))
					.build());
			}
		}
		return result;
	}

	private List<MyPlace> loadMyPlaces(User user) throws Exception {
		List<MyPlace> result = new ArrayList<>();
		try (BufferedReader reader = new BufferedReader(
			new InputStreamReader(resource("/report/my_place.csv"), CP949))) {
			reader.readLine(); // header: my_place_id,user_id,place_name,address,latitude,longitude
			String line;
			while ((line = reader.readLine()) != null) {
				if (line.isBlank()) {
					continue;
				}
				List<String> f = parseCsvLine(line);
				result.add(MyPlace.create(user, f.get(2), f.get(3),
					Double.parseDouble(f.get(4)), Double.parseDouble(f.get(5))));
			}
		}
		return result;
	}

	/** 따옴표 필드를 처리하는 최소 CSV 파서(픽스처 전용). */
	private List<String> parseCsvLine(String line) {
		List<String> fields = new ArrayList<>();
		StringBuilder current = new StringBuilder();
		boolean inQuotes = false;
		for (int i = 0; i < line.length(); i++) {
			char ch = line.charAt(i);
			if (inQuotes) {
				if (ch == '"') {
					if (i + 1 < line.length() && line.charAt(i + 1) == '"') {
						current.append('"');
						i++;
					} else {
						inQuotes = false;
					}
				} else {
					current.append(ch);
				}
			} else if (ch == '"') {
				inQuotes = true;
			} else if (ch == ',') {
				fields.add(current.toString());
				current.setLength(0);
			} else {
				current.append(ch);
			}
		}
		fields.add(current.toString());
		return fields;
	}
}
