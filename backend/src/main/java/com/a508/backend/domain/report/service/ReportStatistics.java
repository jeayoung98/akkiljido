package com.a508.backend.domain.report.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;

/**
 * report 테이블의 구조화 컬럼 3종 + 봉투 summary 수치의 결정적 계산.
 * <p>
 * 기준(설계 문서 §6, 실험 근거는 관찰 19 수정1):
 * <ul>
 *   <li>totalCost — 기간 내 <b>지출 전체</b> 합계(고정비 포함). 목록 화면의 "이 기간 총지출".</li>
 *   <li>highest/mostFrequent — <b>재량지출 기준</b>. 고정비를 포함하면 최다 지출 장소가 매달
 *       '임대인'으로 고정되고, 교통을 포함하면 최빈 장소가 매주 출퇴근 정류장이 되어 정보가 죽는다.
 *       따라서 최빈 장소는 교통 카테고리도 제외한다.</li>
 *   <li>count/placeCount — 재량지출 건수와 장소 수(거래명+좌표 기준, 교통 포함).</li>
 * </ul>
 */
public record ReportStatistics(
	long totalCost,
	String highestSpendingPlace,
	String mostFrequentPlace,
	int count,
	int placeCount
) {

	private static final String TRANSPORT_CATEGORY = "교통";
	/** 기간 내 해당 거래가 없을 때의 표시값. 컬럼이 NOT NULL 이라 빈 문자열 대신 사용한다. */
	private static final String NONE = "-";

	public static ReportStatistics from(ReportSource source) {
		List<TransactionHistory> expenses = source.expenses();
		List<TransactionHistory> discretionary = source.discretionary();

		long totalCost = expenses.stream().mapToLong(TransactionHistory::getAmount).sum();

		// 장소별 합계·건수 (재량지출, 순서 보존 — 동률이면 먼저 등장한 장소)
		Map<PlaceKey, long[]> byPlace = new LinkedHashMap<>();
		for (TransactionHistory transaction : discretionary) {
			long[] agg = byPlace.computeIfAbsent(PlaceKey.of(transaction), key -> new long[2]);
			agg[0] += transaction.getAmount();
			agg[1]++;
		}

		String highest = pick(byPlace, discretionary, true);
		String mostFrequent = pick(byPlace, discretionary, false);

		return new ReportStatistics(totalCost, highest, mostFrequent,
			discretionary.size(), byPlace.size());
	}

	/**
	 * 장소 하나를 고른다. byAmount=true 면 합계 최대, false 면 건수 최대(교통 제외).
	 */
	private static String pick(Map<PlaceKey, long[]> byPlace, List<TransactionHistory> discretionary,
		boolean byAmount) {
		PlaceKey best = null;
		long bestValue = -1;
		for (Map.Entry<PlaceKey, long[]> entry : byPlace.entrySet()) {
			if (!byAmount && isTransport(entry.getKey(), discretionary)) {
				continue;
			}
			long value = byAmount ? entry.getValue()[0] : entry.getValue()[1];
			if (value > bestValue) {
				bestValue = value;
				best = entry.getKey();
			}
		}
		return best == null ? NONE : best.name();
	}

	private static boolean isTransport(PlaceKey key, List<TransactionHistory> discretionary) {
		return discretionary.stream()
			.filter(transaction -> PlaceKey.of(transaction).equals(key))
			.anyMatch(transaction -> TRANSPORT_CATEGORY.equals(transaction.getCategory().getName()));
	}
}
