package com.a508.backend.domain.transaction_history.dto.response;

import java.util.List;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 거래내역 검색 응답. 페이지네이션 메타데이터를 함께 내려준다.
 */
@Schema(description = "거래내역 검색 응답")
public record TransactionSearchResponse(

	@Schema(description = "거래내역 목록")
	List<TransactionSearchItem> transactionList
) {
	public static TransactionSearchResponse of(List<TransactionHistory> transactions) {
		List<TransactionSearchItem> transactionList = transactions.stream()
			.map(TransactionSearchItem::of)
			.toList();

		return new TransactionSearchResponse(transactionList);
	}
}
