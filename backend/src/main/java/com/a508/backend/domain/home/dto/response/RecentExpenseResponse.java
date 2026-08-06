package com.a508.backend.domain.home.dto.response;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 내 주변 최근 일주일 지출 응답. 같은 항목명(거래명)의 지출을 하나로 묶고,
 * totalAmount 는 placeList 금액의 총합이다.
 */
@Schema(description = "내 주변 최근 일주일 지출 응답")
public record RecentExpenseResponse(

	@Schema(description = "조회된 지출 합계", example = "128000")
	Long totalAmount,

	@Schema(description = "항목명으로 합산된 지출 장소 목록(금액 내림차순)")
	List<NearbyPlaceResponse> placeList
) {
	public static RecentExpenseResponse of(List<TransactionHistory> transactions) {
		Map<String, List<TransactionHistory>> grouped = new LinkedHashMap<>();
		for (TransactionHistory transaction : transactions) {
			grouped.computeIfAbsent(transaction.getTransactionName(), name -> new ArrayList<>()).add(transaction);
		}

		Comparator<NearbyPlaceResponse> byAmountDescThenName =
			Comparator.comparing(NearbyPlaceResponse::amount).reversed()
				.thenComparing(NearbyPlaceResponse::name);

		List<NearbyPlaceResponse> placeList = grouped.values().stream()
			.map(NearbyPlaceResponse::of)
			.sorted(byAmountDescThenName)
			.toList();

		long totalAmount = placeList.stream()
			.mapToLong(NearbyPlaceResponse::amount)
			.sum();

		return new RecentExpenseResponse(totalAmount, placeList);
	}
}
