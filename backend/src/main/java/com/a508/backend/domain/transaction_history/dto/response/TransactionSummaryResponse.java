package com.a508.backend.domain.transaction_history.dto.response;

import java.util.Locale;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 거래내역 목록의 개별 거래 항목. type 은 프론트 규약에 맞춰 소문자(expense/income)로 내려준다.
 */
@Schema(description = "거래내역 목록 항목")
public record TransactionSummaryResponse(

	@Schema(description = "거래내역 ID", example = "101")
	Long transactionId,

	@Schema(description = "거래명", example = "점심 식사")
	String name,

	@Schema(description = "거래 금액", example = "12000")
	Long amount,

	@Schema(description = "거래 유형(소비/소득)", example = "expense")
	String type,

	@Schema(description = "카테고리 ID", example = "3")
	Long categoryId,

	@Schema(description = "카테고리명", example = "음식점")
	String categoryName
) {
	public static TransactionSummaryResponse of(TransactionHistory entity) {
		return new TransactionSummaryResponse(
			entity.getId(),
			entity.getTransactionName(),
			entity.getAmount(),
			entity.getType().name().toLowerCase(Locale.ROOT),
			entity.getCategory().getId(),
			entity.getCategory().getName()
		);
	}
}
