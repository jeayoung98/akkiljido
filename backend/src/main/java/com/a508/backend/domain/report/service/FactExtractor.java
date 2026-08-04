package com.a508.backend.domain.report.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;

import org.locationtech.jts.geom.Point;
import org.springframework.stereotype.Component;

import com.a508.backend.domain.mypage.domain.MyPlace;
import com.a508.backend.domain.report.entity.ReportPeriod;
import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.domain.transaction_history.entity.TransactionType;
import com.a508.backend.global.util.DateTimeUtils;
import com.a508.backend.global.util.GeometryUtils;

/**
 * 사실 재고 47종 — 리포트 본문의 재료를 만드는 결정적 추출기.
 * <p>
 * JS 참조 구현(PoC-AI 레포 obs24_inventory_v2.mjs)의 1:1 포팅이며, 시드 데이터 51주에 대해
 * 발동 사실이 참조 구현과 완전히 일치하는지 골든 파일로 회귀 검증한다(WeeklyFactComparisonTest).
 * 임계값의 근거는 51주 분위수 보정(발동률 5~20% 목표, 실험 로그 관찰 23) — 임의 수정 금지.
 * <p>
 * 참조 구현 대비 의도된 일반화(설계 문서 §4.2 구현 치환, 시드 데이터에선 결과 동일):
 * <ul>
 *   <li>집 앵커: 좌표 상수 → 이름이 '집'인 my_place. 없으면 집 의존 사실은 조용히 null</li>
 *   <li>회사 근처: 집 기준 20~25km 밴드 → 비-집 my_place 각각의 반경 2km(백엔드 지도 API 와 동일 의미론)</li>
 *   <li>생활권: 집 300m ∪ 비-집 my_place 2km</li>
 * </ul>
 * 모든 사실은 이 기간 안의 거래만 본다 — 과거 비교 서술은 구조적으로 불가능하다(콜드 스타트, §2).
 */
@Component
public class FactExtractor {

	private static final int MAX_FACTS = 4;

	// 카테고리명(백엔드 DefaultCategory 어휘 — 가운뎃점)
	private static final String CAT_TRANSPORT = "교통";
	private static final String CAT_CAFE = "카페·간식";
	private static final String CAT_CONVENIENCE = "편의점·마트";
	private static final String CAT_FOOD = "음식점";
	private static final String CAT_SHOPPING = "쇼핑";

	private static final double HOME_DELIVERY_METERS = 50;      // 배달 판정(§3.2)
	private static final double HOME_NEAR_METERS = 300;         // 집 근처
	private static final double MY_PLACE_RADIUS_METERS = 2_000; // 내 장소 생활권(백엔드 관례)
	private static final double FAR_TRIP_KM = 50;               // 원거리

	private static final String[] DOW_KO = {"월", "화", "수", "목", "금", "토", "일"};

	/** 사실 정의 — 선언 순서가 동률 시 우선순위다(참조 구현과 동일). */
	private record FactDef(String axis, String name, int tier, Function<Ctx, String> rule) {
	}

	private final List<FactDef> definitions = buildDefinitions();

	/** 기간에 대해 발동한 사실 전부(tier 내림차순, 동일 tier 는 선언 순서). */
	public List<Fact> extractAll(ReportSource source) {
		Ctx c = new Ctx(source);
		List<Fact> facts = new ArrayList<>();
		for (FactDef def : definitions) {
			String text = def.rule().apply(c);
			if (text != null) {
				facts.add(new Fact(def.axis(), def.name(), def.tier(), text));
			}
		}
		facts.sort((a, b) -> Integer.compare(b.tier(), a.tier())); // 안정 정렬 — 동률은 선언 순서 유지
		return facts;
	}

	/** 본문에 실을 상위 4개 — 같은 축에서는 최대 1개(§4.3). 같은 얘기의 반복을 막는다. */
	public List<Fact> selectTop(List<Fact> facts) {
		List<Fact> selected = new ArrayList<>();
		Set<String> usedAxes = new HashSet<>();
		for (Fact fact : facts) {
			if (selected.size() >= MAX_FACTS) {
				break;
			}
			if (usedAxes.add(fact.axis())) {
				selected.add(fact);
			}
		}
		return selected;
	}

	// =====================================================================
	// 기간 컨텍스트 — 참조 구현의 ctx() 를 그대로 옮긴 파생값 묶음
	// =====================================================================
	private static final class Ctx {
		final List<LocalDate> days = new ArrayList<>();
		final List<TransactionHistory> disc;
		final long dTot;
		final Map<LocalDate, List<TransactionHistory>> discByDay = new LinkedHashMap<>();
		final Map<LocalDate, Integer> expenseCountByDay = new LinkedHashMap<>();
		final Map<PlaceKey, long[]> place = new LinkedHashMap<>();       // [amt, n]
		final Map<PlaceKey, String> placeCategory = new LinkedHashMap<>(); // 첫 거래의 카테고리
		final Map<String, long[]> cat = new LinkedHashMap<>();           // [amt, n]
		final List<Long> amtsSorted;
		final Map<String, Integer> seqCount = new LinkedHashMap<>();
		final Map<String, Integer> bigram = new LinkedHashMap<>();
		final List<List<String>> seqs = new ArrayList<>();
		final Optional<Point> home;
		final List<MyPlace> otherPlaces;

		Ctx(ReportSource source) {
			ReportPeriod period = source.period();
			for (LocalDate d = period.start(); !d.isAfter(period.end()); d = d.plusDays(1)) {
				days.add(d);
				discByDay.put(d, new ArrayList<>());
				expenseCountByDay.put(d, 0);
			}
			disc = source.discretionary();
			long total = 0;
			for (TransactionHistory t : source.expenses()) {
				expenseCountByDay.merge(dateOf(t), 1, Integer::sum);
			}
			for (TransactionHistory t : disc) {
				total += t.getAmount();
				discByDay.get(dateOf(t)).add(t);
				long[] p = place.computeIfAbsent(PlaceKey.of(t), k -> new long[2]);
				p[0] += t.getAmount();
				p[1]++;
				placeCategory.putIfAbsent(PlaceKey.of(t), categoryOf(t));
				long[] cAgg = cat.computeIfAbsent(categoryOf(t), k -> new long[2]);
				cAgg[0] += t.getAmount();
				cAgg[1]++;
			}
			dTot = total;
			amtsSorted = disc.stream().map(TransactionHistory::getAmount).sorted().toList();
			for (LocalDate d : days) {
				List<String> seq = discByDay.get(d).stream().map(Ctx::categoryOf).toList();
				seqs.add(seq);
				if (!seq.isEmpty()) {
					seqCount.merge(String.join(">", seq), 1, Integer::sum);
					for (int i = 0; i + 1 < seq.size(); i++) {
						bigram.merge(seq.get(i) + ">" + seq.get(i + 1), 1, Integer::sum);
					}
				}
			}
			home = source.home().map(MyPlace::getCoordinate);
			otherPlaces = source.myPlaces().stream()
				.filter(p -> !ReportSource.HOME_PLACE_NAME.equals(p.getMyPlaceName()))
				.toList();
		}

		static LocalDate dateOf(TransactionHistory t) {
			return DateTimeUtils.toServiceLocal(t.getDatetime()).toLocalDate();
		}

		static int hourOf(TransactionHistory t) {
			return DateTimeUtils.toServiceLocal(t.getDatetime()).getHour();
		}

		static String categoryOf(TransactionHistory t) {
			return t.getCategory().getName();
		}

		static boolean isWeekend(LocalDate d) {
			return d.getDayOfWeek() == DayOfWeek.SATURDAY || d.getDayOfWeek() == DayOfWeek.SUNDAY;
		}

		/** 집에서의 거리(m). 집이 없거나 거래 좌표가 없으면 +무한대 — 거리 조건이 자연히 불발된다. */
		double homeMeters(TransactionHistory t) {
			return home.map(h -> GeometryUtils.distanceMeters(h, t.getCoordinate()))
				.orElse(Double.POSITIVE_INFINITY);
		}

		long dayAmount(LocalDate d) {
			return discByDay.get(d).stream().mapToLong(TransactionHistory::getAmount).sum();
		}

		List<Long> weekdayAmounts() {
			return days.stream().filter(d -> !isWeekend(d)).map(this::dayAmount).toList();
		}

		List<Long> weekendAmounts() {
			return days.stream().filter(Ctx::isWeekend).map(this::dayAmount).toList();
		}

		long[] catAgg(String name) {
			return cat.getOrDefault(name, new long[2]);
		}

		List<TransactionHistory> ofCategory(String name) {
			return disc.stream().filter(t -> name.equals(categoryOf(t))).toList();
		}

		int daysWithCategory(String name) {
			return (int)days.stream()
				.filter(d -> discByDay.get(d).stream().anyMatch(t -> name.equals(categoryOf(t))))
				.count();
		}

		/** 참조 구현의 med(): 오름차순 정렬 후 가운데(짝수면 위쪽) 원소. 평균 아님 — 대조 일치를 위해 유지. */
		static long median(List<Long> sortedAsc) {
			return sortedAsc.get(sortedAsc.size() / 2);
		}

		static String dayLabel(LocalDate d) {
			return String.format("%02d-%02d(%s)", d.getMonthValue(), d.getDayOfMonth(),
				DOW_KO[d.getDayOfWeek().getValue() - 1]);
		}
	}

	private static String won(long n) {
		return String.format("%,d", n);
	}

	private static int pct(double v) {
		return (int)Math.round(v * 100);
	}

	// =====================================================================
	// 사실 47종 — 이름·조건·임계값은 참조 구현과 1:1. 바꾸려면 골든 파일도 재생성할 것.
	// =====================================================================
	private static List<FactDef> buildDefinitions() {
		List<FactDef> defs = new ArrayList<>();

		// ── 축1. 절대 ──
		defs.add(new FactDef("절대", "무결제일", 3, c -> {
			List<String> zero = c.days.stream()
				.filter(d -> c.expenseCountByDay.get(d) == 0).map(Ctx::dayLabel).toList();
			return zero.isEmpty() ? null : String.join(", ", zero) + " 하루 종일 결제가 한 건도 없었어요";
		}));
		defs.add(new FactDef("절대", "원거리", 3, c -> {
			TransactionHistory far = c.disc.stream()
				.filter(t -> t.getCoordinate() != null)
				.max((a, b) -> Double.compare(c.homeMeters(a), c.homeMeters(b))).orElse(null);
			if (far == null || c.homeMeters(far) <= FAR_TRIP_KM * 1000
				|| c.homeMeters(far) == Double.POSITIVE_INFINITY) {
				return null;
			}
			String region = far.getRegion2DepthName() != null ? far.getRegion2DepthName()
				: (far.getRegion1DepthName() != null ? far.getRegion1DepthName() : "먼 곳");
			return String.format("집에서 %.0fkm 떨어진 %s까지 다녀오셨네요", c.homeMeters(far) / 1000, region);
		}));
		defs.add(new FactDef("절대", "교통비만 연속", 3, c -> {
			int run = 0, best = 0;
			for (LocalDate d : c.days) {
				List<TransactionHistory> g = c.discByDay.get(d);
				boolean transitOnly = !g.isEmpty()
					&& g.stream().allMatch(t -> CAT_TRANSPORT.equals(Ctx.categoryOf(t)));
				run = transitOnly ? run + 1 : 0;
				best = Math.max(best, run);
			}
			return best >= 3 ? best + "일 연속으로 출퇴근 버스비 말고는 결제가 없었어요" : null;
		}));

		// ── 축2. 요일 ──
		defs.add(new FactDef("요일", "하루 몰림", 2, c -> {
			LocalDate peak = c.days.stream().max((a, b) -> Long.compare(c.dayAmount(a), c.dayAmount(b))).orElseThrow();
			long amt = c.dayAmount(peak);
			return c.dTot > 0 && (double)amt / c.dTot >= 0.4 && amt >= 80_000
				? String.format("%s 하루에 %s원 — 이번 주 지출의 %d%%가 그날이에요",
				Ctx.dayLabel(peak), won(amt), pct((double)amt / c.dTot)) : null;
		}));
		defs.add(new FactDef("요일", "평일 하루 급증", 2, c -> {
			List<Long> wd = c.weekdayAmounts();
			if (wd.isEmpty()) {
				return null;
			}
			long m = Ctx.median(wd.stream().sorted().toList());
			long peak = wd.stream().mapToLong(Long::longValue).max().orElse(0);
			return m > 0 && peak >= 50_000 && (double)peak / m >= 3
				? String.format("평일은 하루 %s원 선인데 하루만 %s원, %.1f배예요", won(m), won(peak), (double)peak / m)
				: null;
		}));
		defs.add(new FactDef("요일", "주말 몰림", 2, c -> {
			long we = c.weekendAmounts().stream().mapToLong(Long::longValue).sum();
			long wd = c.weekdayAmounts().stream().mapToLong(Long::longValue).sum();
			return we >= wd * 1.4 && we >= 100_000
				? String.format("주말 이틀에 %s원 — 평일 닷새(%s원)보다 많아요", won(we), won(wd)) : null;
		}));
		defs.add(new FactDef("요일", "평일 균일", 2, c -> {
			List<Long> wd = c.weekdayAmounts();
			if (wd.isEmpty()) {
				return null;
			}
			long m = Ctx.median(wd.stream().sorted().toList());
			long max = wd.stream().mapToLong(Long::longValue).max().orElse(0);
			return m > 10_000 && (double)max / m <= 1.10
				? String.format("월~금이 하루 %s원 선으로 거의 똑같았어요 (편차 %.2f배)", won(m), (double)max / m) : null;
		}));
		defs.add(new FactDef("요일", "주말 조용", 2, c -> {
			long we = c.weekendAmounts().stream().mapToLong(Long::longValue).sum();
			double wdDaily = c.weekdayAmounts().stream().mapToLong(Long::longValue).sum() / 5.0;
			return wdDaily > 0 && we <= wdDaily * 1.2
				? String.format("주말 이틀에 %s원 — 평일 하루치(%s원)와 비슷해요", won(we), won(Math.round(wdDaily))) : null;
		}));

		// ── 축3. 집중 ──
		defs.add(new FactDef("집중", "한 건 집중", 2, c -> {
			TransactionHistory big = c.disc.stream()
				.max((a, b) -> Long.compare(a.getAmount(), b.getAmount())).orElse(null);
			return big != null && big.getAmount() >= 50_000 && (double)big.getAmount() / c.dTot >= 0.25
				? String.format("%s %s원 한 건이 이번 주 지출의 %d%%예요", big.getTransactionName(),
				won(big.getAmount()), pct((double)big.getAmount() / c.dTot)) : null;
		}));
		defs.add(new FactDef("집중", "세 곳 집중", 2, c -> {
			long top3 = c.place.values().stream().map(v -> v[0]).sorted((a, b) -> Long.compare(b, a))
				.limit(3).mapToLong(Long::longValue).sum();
			return c.dTot > 0 && (double)top3 / c.dTot >= 0.5
				? String.format("상위 세 곳이 이번 주 지출의 %d%%를 차지했어요", pct((double)top3 / c.dTot)) : null;
		}));
		defs.add(new FactDef("집중", "단골 반복", 1, c -> {
			PlaceKey best = null;
			long bestN = 0;
			for (Map.Entry<PlaceKey, long[]> e : c.place.entrySet()) {
				if (e.getValue()[1] >= 5 && !CAT_TRANSPORT.equals(c.placeCategory.get(e.getKey()))
					&& e.getValue()[1] > bestN) {
					best = e.getKey();
					bestN = e.getValue()[1];
				}
			}
			return best == null ? null : String.format("%s에만 %d번 가셨어요", best.name(), bestN);
		}));
		defs.add(new FactDef("집중", "좁은 반경", 1,
			c -> c.place.size() <= 13 ? String.format("이번 주 들른 곳은 %d곳뿐이에요", c.place.size()) : null));
		defs.add(new FactDef("집중", "넓은 반경", 1,
			c -> c.place.size() >= 20 ? String.format("이번 주 %d곳에 들르셨어요", c.place.size()) : null));

		// ── 축4. 카테고리 ──
		defs.add(new FactDef("카테고리", "1위 편중", 2, c -> {
			Map.Entry<String, long[]> top = null;
			for (Map.Entry<String, long[]> e : c.cat.entrySet()) {
				if (top == null || e.getValue()[0] > top.getValue()[0]) {
					top = e;
				}
			}
			return top != null && c.dTot > 0 && (double)top.getValue()[0] / c.dTot >= 0.58
				? String.format("%s에만 지출의 %d%%를 쓰셨어요", top.getKey(), pct((double)top.getValue()[0] / c.dTot))
				: null;
		}));
		defs.add(new FactDef("카테고리", "교통비 비중", 2, c -> {
			double share = c.dTot == 0 ? 0 : (double)c.catAgg(CAT_TRANSPORT)[0] / c.dTot;
			return share >= 0.18 ? String.format("이번 주 지출의 %d%%가 출퇴근 교통비였어요", pct(share)) : null;
		}));
		defs.add(new FactDef("카테고리", "배달 편중", 2, c -> {
			List<TransactionHistory> food = c.ofCategory(CAT_FOOD);
			long delivered = food.stream().filter(t -> c.homeMeters(t) < HOME_DELIVERY_METERS).count();
			return food.size() >= 5 && (double)delivered / food.size() >= 0.86
				? String.format("음식점 결제 %d건 중 %d건이 집에서 시킨 배달이었어요", food.size(), delivered) : null;
		}));
		defs.add(new FactDef("카테고리", "카페 육박", 2, c -> {
			long foodAmt = c.catAgg(CAT_FOOD)[0];
			double r = foodAmt == 0 ? 0 : (double)c.catAgg(CAT_CAFE)[0] / foodAmt;
			return r >= 0.52 ? String.format("카페·간식에 %s원 — 음식점 지출(%s원)의 %d%%예요",
				won(c.catAgg(CAT_CAFE)[0]), won(foodAmt), pct(r)) : null;
		}));
		defs.add(new FactDef("카테고리", "편의점 잦음", 1, c -> c.catAgg(CAT_CONVENIENCE)[1] >= 7
			? String.format("편의점·마트에 %d번 들르셨어요", c.catAgg(CAT_CONVENIENCE)[1]) : null));
		defs.add(new FactDef("카테고리", "편의점 뜸함", 1, c -> c.catAgg(CAT_CONVENIENCE)[1] <= 2
			? String.format("편의점·마트는 %d번뿐이었어요", c.catAgg(CAT_CONVENIENCE)[1]) : null));
		defs.add(new FactDef("카테고리", "단조로움", 1, c -> c.cat.size() <= 4
			? String.format("쓴 곳이 %d가지 종류뿐이었어요", c.cat.size()) : null));
		defs.add(new FactDef("카테고리", "다양함", 1, c -> c.cat.size() >= 7
			? String.format("%d가지 종류에 두루 쓰셨네요", c.cat.size()) : null));
		defs.add(new FactDef("카테고리", "쇼핑 지출", 1, c -> c.catAgg(CAT_SHOPPING)[0] >= 75_000
			? String.format("쇼핑에 %s원 쓰셨어요", won(c.catAgg(CAT_SHOPPING)[0])) : null));
		defs.add(new FactDef("카테고리", "외식일 적음", 1, c -> c.daysWithCategory(CAT_FOOD) <= 4
			? String.format("음식점 결제가 있었던 날은 %d일이에요", c.daysWithCategory(CAT_FOOD)) : null));

		// ── 축5. 시간 ──
		defs.add(new FactDef("시간", "아침커피 적음", 1, c -> {
			long n = c.days.stream().filter(d -> c.discByDay.get(d).stream()
				.anyMatch(t -> CAT_CAFE.equals(Ctx.categoryOf(t))
					&& Ctx.hourOf(t) >= 6 && Ctx.hourOf(t) < 10)).count();
			return n <= 2 ? String.format("아침 커피를 산 날이 %d일뿐이에요", n) : null;
		}));
		defs.add(new FactDef("시간", "늦은 결제", 1, c -> {
			long n = c.disc.stream().filter(t -> Ctx.hourOf(t) >= 22).count();
			return n >= 3 ? String.format("밤 10시 이후 결제가 %d건 있었어요", n) : null;
		}));
		defs.add(new FactDef("시간", "오전 무결제", 1, c -> {
			long n = c.days.stream().filter(d -> !c.discByDay.get(d).isEmpty()
				&& c.discByDay.get(d).stream().noneMatch(t -> Ctx.hourOf(t) < 12)).count();
			return n >= 3 ? String.format("%d일은 오후가 되어서야 첫 결제를 하셨어요", n) : null;
		}));
		defs.add(new FactDef("시간", "점심 결제 잦음", 1, c -> {
			long n = c.disc.stream().filter(t -> Ctx.hourOf(t) >= 11 && Ctx.hourOf(t) < 14).count();
			return n >= 4 ? String.format("점심시간(11~14시) 결제가 %d건이에요", n) : null;
		}));
		defs.add(new FactDef("시간", "저녁 편중", 2, c -> {
			long n = c.disc.stream().filter(t -> Ctx.hourOf(t) >= 18).count();
			return !c.disc.isEmpty() && (double)n / c.disc.size() >= 0.55
				? String.format("결제 %d건 중 %d건이 저녁 6시 이후였어요", c.disc.size(), n) : null;
		}));

		// ── 축6. 시퀀스 (관찰 09의 n-gram 을 기간 안에서만 센다) ──
		defs.add(new FactDef("시퀀스", "같은 하루 반복", 2, c -> {
			Map.Entry<String, Integer> best = null;
			for (Map.Entry<String, Integer> e : c.seqCount.entrySet()) {
				boolean hasNonTransit = !List.of(e.getKey().split(">")).stream()
					.allMatch(CAT_TRANSPORT::equals);
				if (hasNonTransit && (best == null || e.getValue() > best.getValue())) {
					best = e;
				}
			}
			return best != null && best.getValue() >= 4
				? String.format("\"%s\" 순서로 보낸 날이 %d일이나 돼요",
				best.getKey().replace(">", " → "), best.getValue()) : null;
		}));
		defs.add(new FactDef("시퀀스", "하루 흐름 단조", 1, c -> c.seqCount.size() <= 4 && !c.seqCount.isEmpty()
			? String.format("일주일 동안 하루 흐름이 %d가지밖에 없었어요", c.seqCount.size()) : null));
		defs.add(new FactDef("시퀀스", "퇴근후 편의점", 1, c -> {
			long n = c.seqs.stream().filter(s -> {
				int i = s.lastIndexOf(CAT_TRANSPORT);
				return i >= 0 && i + 1 < s.size() && CAT_CONVENIENCE.equals(s.get(i + 1));
			}).count();
			return n >= 1 ? String.format("퇴근길에 바로 편의점에 들른 날이 %d일 있어요", n) : null;
		}));
		defs.add(new FactDef("시퀀스", "카페 두 번", 1, c -> {
			long n = cafeDoubleDays(c);
			return n >= 5 ? String.format("하루에 카페를 두 번 간 날이 %d일이에요", n) : null;
		}));
		defs.add(new FactDef("시퀀스", "카페 한 번씩", 1,
			c -> cafeDoubleDays(c) == 0 ? "이번 주는 하루에 카페를 두 번 간 날이 하루도 없었어요" : null));
		defs.add(new FactDef("시퀀스", "반복 2연속", 1, c -> {
			Map.Entry<String, Integer> best = null;
			for (Map.Entry<String, Integer> e : c.bigram.entrySet()) {
				if (best == null || e.getValue() > best.getValue()) {
					best = e;
				}
			}
			return best != null && best.getValue() >= 6
				? String.format("\"%s\"로 이어진 결제가 %d번 있었어요",
				best.getKey().replace(">", " → "), best.getValue()) : null;
		}));

		// ── 축7. 금액 ──
		defs.add(new FactDef("금액", "큰 결제 없음", 2, c -> c.disc.stream().noneMatch(t -> t.getAmount() > 30_000)
			? "이번 주엔 3만 원 넘는 결제가 한 건도 없었어요" : null));
		defs.add(new FactDef("금액", "큰 결제 많음", 1, c -> {
			long n = c.disc.stream().filter(t -> t.getAmount() > 30_000).count();
			return n >= 3 ? String.format("3만 원 넘는 결제가 %d건 있었어요", n) : null;
		}));
		defs.add(new FactDef("금액", "소액 위주", 1, c -> {
			long n = c.disc.stream().filter(t -> t.getAmount() < 5_000).count();
			return n >= 18 ? String.format("5천 원 미만 결제가 %d건이에요 — 전체의 %d%%",
				n, pct((double)n / c.disc.size())) : null;
		}));
		defs.add(new FactDef("금액", "만원대 적음", 1, c -> {
			long n = c.disc.stream().filter(t -> t.getAmount() > 10_000).count();
			return n <= 8 ? String.format("1만 원 넘는 결제는 %d건뿐이었어요", n) : null;
		}));
		defs.add(new FactDef("금액", "금액 편차 큼", 2, c -> {
			Double r = amountSpread(c);
			return r != null && r >= 12.5
				? String.format("가장 큰 결제가 보통 결제(%s원)의 %.0f배예요",
				won(Ctx.median(c.amtsSorted)), r) : null;
		}));
		defs.add(new FactDef("금액", "금액 고른 편", 2, c -> {
			Double r = amountSpread(c);
			return r != null && r <= 3.5
				? String.format("결제 금액이 다 고만고만했어요 — 제일 큰 게 보통의 %.1f배", r) : null;
		}));
		defs.add(new FactDef("금액", "객단가 낮음", 1, c -> !c.amtsSorted.isEmpty() && Ctx.median(c.amtsSorted) <= 3_800
			? String.format("결제 한 번에 보통 %s원 쓰셨어요", won(Ctx.median(c.amtsSorted))) : null));
		defs.add(new FactDef("금액", "객단가 높음", 1, c -> !c.amtsSorted.isEmpty() && Ctx.median(c.amtsSorted) >= 7_000
			? String.format("결제 한 번에 보통 %s원 쓰셨어요", won(Ctx.median(c.amtsSorted))) : null));

		// ── 축8. 공간 (my_place 일반화 — 클래스 javadoc 참조) ──
		defs.add(new FactDef("공간", "생활권 밖 잦음", 1, c -> {
			Long n = outsideLifeZoneCount(c);
			return n != null && n >= 8 ? String.format("집·회사 근처가 아닌 곳에서 %d번 결제하셨어요", n) : null;
		}));
		defs.add(new FactDef("공간", "생활권 밖 없음", 1, c -> {
			Long n = outsideLifeZoneCount(c);
			return n != null && n <= 2
				? String.format("이번 주는 등록한 장소 근처를 거의 벗어나지 않으셨네요 (그 밖 %d건)", n) : null;
		}));
		defs.add(new FactDef("공간", "회사 근처 편중", 2, c -> {
			if (c.dTot == 0) {
				return null;
			}
			MyPlace bestPlace = null;
			double bestShare = 0;
			for (MyPlace p : c.otherPlaces) {
				long amt = c.disc.stream()
					.filter(t -> GeometryUtils.distanceMeters(p.getCoordinate(), t.getCoordinate())
						<= MY_PLACE_RADIUS_METERS)
					.mapToLong(TransactionHistory::getAmount).sum();
				double share = (double)amt / c.dTot;
				if (share > bestShare) {
					bestShare = share;
					bestPlace = p;
				}
			}
			return bestPlace != null && bestShare >= 0.21
				? String.format("지출의 %d%%를 %s 근처에서 쓰셨어요", pct(bestShare), bestPlace.getMyPlaceName()) : null;
		}));
		defs.add(new FactDef("공간", "집 근처 편중", 2, c -> {
			if (c.home.isEmpty() || c.disc.isEmpty()) {
				return null;
			}
			long n = c.disc.stream().filter(t -> c.homeMeters(t) < HOME_NEAR_METERS).count();
			return (double)n / c.disc.size() >= 0.62
				? String.format("결제 %d건 중 %d건이 집에서 300m 안이었어요", c.disc.size(), n) : null;
		}));
		defs.add(new FactDef("공간", "카페 뜸함", 1, c -> c.daysWithCategory(CAT_CAFE) <= 4
			? String.format("카페에 간 날은 %d일이에요", c.daysWithCategory(CAT_CAFE)) : null));

		return List.copyOf(defs);
	}

	private static long cafeDoubleDays(Ctx c) {
		return c.seqs.stream()
			.filter(s -> s.stream().filter(CAT_CAFE::equals).count() >= 2).count();
	}

	/** 최대 결제 / 중앙 결제 배수. 거래가 없으면 null. */
	private static Double amountSpread(Ctx c) {
		if (c.amtsSorted.isEmpty()) {
			return null;
		}
		long med = Ctx.median(c.amtsSorted);
		return (double)c.amtsSorted.get(c.amtsSorted.size() - 1) / (med == 0 ? 1 : med);
	}

	/** 생활권(집 300m ∪ 비-집 my_place 2km) 밖 재량 결제 건수. 등록 장소가 없으면 null(판정 불가). */
	private static Long outsideLifeZoneCount(Ctx c) {
		if (c.home.isEmpty() && c.otherPlaces.isEmpty()) {
			return null;
		}
		return c.disc.stream().filter(t -> {
			if (t.getCoordinate() == null) {
				return false;
			}
			if (c.home.isPresent() && c.homeMeters(t) <= HOME_NEAR_METERS) {
				return false;
			}
			return c.otherPlaces.stream().noneMatch(
				p -> GeometryUtils.distanceMeters(p.getCoordinate(), t.getCoordinate())
					<= MY_PLACE_RADIUS_METERS);
		}).count();
	}
}
