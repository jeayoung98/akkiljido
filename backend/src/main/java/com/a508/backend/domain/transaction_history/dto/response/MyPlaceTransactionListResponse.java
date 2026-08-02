package com.a508.backend.domain.transaction_history.dto.response;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 거래내역 내 장소 상세 조회 응답.
 * 같은 좌표·항목명·카테고리의 결제를 하나의 항목으로 묶고, 개별 결제는 dateList 로 내려준다.
 */
@Schema(description = "거래내역 내 장소 상세 조회 응답")
public record MyPlaceTransactionListResponse(

	@Schema(description = "장소 반경 내 거래 목록")
	List<MyPlaceTransactionResponse> transactionList
) {
	public static MyPlaceTransactionListResponse of(List<TransactionHistory> transactions) {
		Map<PlaceItemKey, List<TransactionHistory>> grouped = new LinkedHashMap<>();
		for (TransactionHistory transaction : transactions) {
			grouped.computeIfAbsent(PlaceItemKey.of(transaction), key -> new ArrayList<>()).add(transaction);
		}

		List<MyPlaceTransactionResponse> transactionList = grouped.values().stream()
			.map(MyPlaceTransactionResponse::of)
			.toList();

		return new MyPlaceTransactionListResponse(transactionList);
	}

	/** 좌표 + 항목명 + 카테고리로 동일 장소·동일 항목을 식별하는 그룹핑 키. */
	private record PlaceItemKey(CoordinateKey coordinate, String name, Long categoryId) {

		private static PlaceItemKey of(TransactionHistory transaction) {
			return new PlaceItemKey(
				CoordinateKey.of(transaction.getCoordinate()),
				transaction.getTransactionName(),
				transaction.getCategory().getId());
		}
	}
}
