package com.a508.backend.domain.transaction_history.dto.response;

import java.time.LocalDate;
import java.util.List;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.domain.transaction_history.entity.TransactionType;
import com.fasterxml.jackson.annotation.JsonFormat;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 특정 일자의 거래내역 묶음. amount 는 해당 일자의 순합계(소득 +, 소비 -)다.
 */
@Schema(description = "일자별 거래내역")
public record DailyTransactionResponse(

	@Schema(description = "거래 일자", example = "2024-07-17")
	@JsonFormat(pattern = "yyyy-MM-dd")
	LocalDate date,

	@Schema(description = "해당 일자 순합계(소득 +, 소비 -)", example = "-36500")
	Long amount,

	@Schema(description = "해당 일자 거래 목록")
	List<TransactionSummaryResponse> transactionList
) {
	public static DailyTransactionResponse of(LocalDate date, List<TransactionHistory> transactions) {
		long amount = transactions.stream()
			.mapToLong(transaction ->
				transaction.getType() == TransactionType.INCOME ? transaction.getAmount() : -transaction.getAmount())
			.sum();

		List<TransactionSummaryResponse> transactionList = transactions.stream()
			.map(TransactionSummaryResponse::of)
			.toList();

		return new DailyTransactionResponse(date, amount, transactionList);
	}
}
