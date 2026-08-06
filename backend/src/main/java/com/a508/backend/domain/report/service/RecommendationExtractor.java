package com.a508.backend.domain.report.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.locationtech.jts.geom.Point;
import org.springframework.stereotype.Component;

import com.a508.backend.domain.mypage.domain.MyPlace;
import com.a508.backend.domain.report.dto.RecommendationItem;
import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.global.util.DateTimeUtils;
import com.a508.backend.global.util.GeometryUtils;

/**
 * 장소알림 추천 추출기 — JS 참조 구현(PoC-AI 레포 obs26_notify_recommend.mjs)의 1:1 포팅.
 * 시드 51주에 대해 추천 결과(횟수·금액·시간창)가 골든과 일치하는지 회귀 검증한다.
 * <p>
 * 필터 4단(설계 문서 §5.1): ① 물리 방문만 — 재량지출(자동이체·계좌이체 제외)에 좌표 필수.
 * 배달·온라인은 좌표가 집(=my_place 300m)이거나 좌표가 없어 자연히 걸러진다.
 * ② 모든 my_place 300m 밖(안 그러면 매일 울린다) ③ 교통 제외 ④ 집에서 50km 이내(여행지 재방문 0).
 * <p>
 * 이유 2종은 LLM 을 거치지 않는 결정적 템플릿이다 — 사용자가 저장하면 notification_place.reason 에
 * 영구히 남는 텍스트라 환각 허용치가 0 이다(설계 문서 §4.4 분업표).
 * <p>
 * ⚠ 이 기능은 소진형이다(실험 로그 #185): 후보가 사용자당 한 자릿수라 쿨다운을 걸면 몇 주 안에
 * 마른다. 그래서 쿨다운 때문에 0건이 되는 주에는 {@link #extractFallback}이 1건을 구제하지만,
 * 후보 자체가 없는 주는 여전히 0건이다 — 빈 목록은 정상 상태이며 UI 도 그렇게 다뤄야 한다.
 */
@Component
public class RecommendationExtractor {

	/** 쿨다운(주) — 배치가 recommendation_log 조회 기준으로 사용한다. */
	public static final int COOLDOWN_WEEKS = 8;

	private static final int TOP_N = 3;
	/** 폴백으로 낼 추천 개수. 빈 화면을 막는 최소한이라 1건만 낸다. */
	private static final int FALLBACK_N = 1;
	private static final int WINDOW_HOURS = 3;
	private static final String CAT_TRANSPORT = "교통";
	private static final double NEAR_MY_PLACE_METERS = 300;
	private static final double FAR_TRIP_METERS = 50_000;
	/** 근거 하한 — 커피 한 잔으로 알림을 권하지 않는다: 2회 이상 방문 또는 1회 3만 원 이상. */
	private static final int MIN_VISITS = 2;
	private static final long MIN_SINGLE_AMOUNT = 30_000;

	/**
	 * 기간 내 거래에서 추천 최대 3건을 만든다. 점수 = 그 기간 그 장소의 지출 총액.
	 *
	 * @param excludedPlaceNames 쿨다운 — 최근 {@link #COOLDOWN_WEEKS}주 내 추천된 장소명(거래명).
	 *                           이름 기준 제외라 동명 타지점도 함께 제외된다(보수적 — 의도된 동작)
	 */
	public List<RecommendationItem> extract(ReportSource source, Set<String> excludedPlaceNames) {
		return extract(source, excludedPlaceNames, TOP_N);
	}

	/**
	 * 쿨다운 때문에 추천이 0건이 됐을 때의 폴백 — <b>쿨다운을 무시하고 1건만</b> 낸다.
	 * <p>
	 * 팀 결정(2026-08-04): 빈 추천 화면을 보이지 않기 위해, 최근에 추천했던 곳이라도 다시 보여준다.
	 * 선정 기준은 기본 경로와 같은 "기간 내 지출 총액 1위"다 — 폴백이 도는 주는 곧 늘 가던 곳만 간 주라서,
	 * 같은 장소가 반복돼도 "많이 쓰는 곳"이라는 참인 신호다.
	 * <p>
	 * ⚠ 후보 자체가 없어서 0건이 된 경우에는 이 폴백도 0건이다(쿨다운이 원인이 아니므로).
	 * 즉 이 기능이 빈 목록을 완전히 없애지는 못한다 — 빈 상태 UI 는 여전히 필요하다.
	 */
	public List<RecommendationItem> extractFallback(ReportSource source) {
		return extract(source, Set.of(), FALLBACK_N);
	}

	private List<RecommendationItem> extract(ReportSource source, Set<String> excludedPlaceNames, int limit) {
		Map<PlaceKey, List<TransactionHistory>> byPlace = new LinkedHashMap<>();
		for (TransactionHistory t : candidates(source)) {
			byPlace.computeIfAbsent(PlaceKey.of(t), k -> new ArrayList<>()).add(t);
		}

		return byPlace.entrySet().stream()
			.filter(e -> !excludedPlaceNames.contains(e.getKey().name()))
			.filter(e -> e.getValue().size() >= MIN_VISITS || totalAmount(e.getValue()) >= MIN_SINGLE_AMOUNT)
			.sorted((a, b) -> Long.compare(totalAmount(b.getValue()), totalAmount(a.getValue())))
			.limit(limit)
			.map(e -> buildItem(e.getValue()))
			.toList();
	}

	private List<TransactionHistory> candidates(ReportSource source) {
		Point home = source.home().map(MyPlace::getCoordinate).orElse(null);
		return source.discretionary().stream()
			.filter(t -> t.getCoordinate() != null)
			.filter(t -> !CAT_TRANSPORT.equals(t.getCategory().getName()))
			.filter(t -> source.myPlaces().stream().noneMatch(
				p -> GeometryUtils.distanceMeters(p.getCoordinate(), t.getCoordinate()) < NEAR_MY_PLACE_METERS))
			.filter(t -> home == null
				|| GeometryUtils.distanceMeters(home, t.getCoordinate()) <= FAR_TRIP_METERS)
			.toList();
	}

	private static long totalAmount(List<TransactionHistory> transactions) {
		return transactions.stream().mapToLong(TransactionHistory::getAmount).sum();
	}

	private RecommendationItem buildItem(List<TransactionHistory> visits) {
		int n = visits.size();
		long amount = totalAmount(visits);
		TransactionHistory first = visits.get(0);

		List<Integer> hours = visits.stream()
			.map(t -> DateTimeUtils.toServiceLocal(t.getDatetime()).getHour()).toList();
		int windowStart = bestWindowStart(hours);
		long inWindow = hours.stream()
			.filter(h -> h >= windowStart && h < windowStart + WINDOW_HOURS).count();

		String when = ampm(windowStart) + " " + windowStart + "~" + (windowStart + WINDOW_HOURS) + "시";
		boolean allInWindow = inWindow == n;

		return new RecommendationItem(
			first.getTransactionName(),
			first.getAddress(),
			GeometryUtils.latitudeOf(first.getCoordinate()),
			GeometryUtils.longitudeOf(first.getCoordinate()),
			String.format("%02d:00", windowStart),
			String.format("%02d:00", windowStart + WINDOW_HOURS),
			reasonShort(n, amount, when, allInWindow),
			reasonMessage(first.getTransactionName(), n, amount, when, windowStart, allInWindow));
	}

	/** 최빈 3시간 구간의 시작 시각. 동률이면 이른 구간. 방문 1회여도 그 시각을 포함하는 구간을 쓴다(관찰 25: 95% 적중). */
	private static int bestWindowStart(List<Integer> hours) {
		int bestStart = hours.get(0);
		long bestCount = 1;
		for (int h = 0; h <= 21; h++) {
			int start = h;
			long count = hours.stream().filter(x -> x >= start && x < start + WINDOW_HOURS).count();
			if (count > bestCount) {
				bestCount = count;
				bestStart = h;
			}
		}
		return bestStart;
	}

	// [삭제] 요일 지정(pickDay) — 알림은 요일 없이 "장소 + 시간대"로만 건다.
	//   근거: ① notification_place 엔티티에 day 컬럼이 없어 저장할 곳이 없다
	//        ② 지오펜스가 요일 필터 역할을 한다 — 그날 그 근처에 없으면 울리지 않는다
	//        ③ 특정 요일로 못 박으면 오히려 놓친다: 이 데이터의 단일 요일 집중도는 44~63%인데
	//           주말(토+일) 집중도는 71~100%다(실험 로그 #181). 실측 추천 131건 중 지정 0건.

	// ── 이유 템플릿 — 수량 부사("두 번 다")는 반드시 전량 검사(allInWindow)와 짝을 이룬다 ──

	private static String reasonShort(int n, long amount, String when, boolean allInWindow) {
		if (n >= 3) {
			return String.format("%s에 %d번, 모두 %,d원", when, n, amount);
		}
		if (n == 2) {
			return String.format("%s에 두 번, %,d원", allInWindow ? when : "이번 기간", amount);
		}
		return String.format("%s에 %,d원", when, amount);
	}

	private static String reasonMessage(String name, int n, long amount, String when,
		int windowStart, boolean allInWindow) {
		if (n >= 3) {
			return String.format("%s쯤 %s에 자주 들르시네요. 이번 기간에만 %d번, %,d원을 쓰셨어요. "
				+ "그 시간에 근처를 지나면 미리 알려드릴까요?", when, name, n, amount);
		}
		if (n == 2) {
			if (allInWindow) {
				return String.format("%s에 두 번 들르셨어요(%,d원). 두 번 다 %s는데, "
					+ "이 시간대에 알림을 받아보시겠어요?", name, amount, pastForm(ampm(windowStart)));
			}
			return String.format("%s에 두 번 들르셨어요(%,d원). %s쯤에 알림을 받아보시겠어요?",
				name, amount, when);
		}
		return String.format("%s에서 %,d원을 쓰셨어요. %s쯤이었는데, 다음에 근처를 지날 때 알려드릴까요?",
			name, amount, when);
	}

	private static String ampm(int hour) {
		if (hour < 6) {
			return "새벽";
		}
		if (hour < 12) {
			return "오전";
		}
		if (hour < 18) {
			return "오후";
		}
		return "저녁";
	}

	/** 서술격 과거형 — 받침이 있으면 '이었'(오전이었-), 없으면 '였'(오후였-). */
	private static String pastForm(String word) {
		char last = word.charAt(word.length() - 1);
		boolean hasFinalConsonant = last >= 0xAC00 && last <= 0xD7A3 && (last - 0xAC00) % 28 != 0;
		return word + (hasFinalConsonant ? "이었" : "였");
	}
}
