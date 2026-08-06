package com.a508.backend.domain.transaction_history.dto.response;

import java.util.Locale;

import com.a508.backend.domain.category.entity.Category;
import com.a508.backend.domain.transaction_history.entity.TransactionHistory;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 거래내역 목록의 개별 거래 항목. type 은 프론트 규약에 맞춰 소문자(expense/income)로 내려준다.
 * 소득(income) 거래는 카테고리를 갖지 않으므로 categoryId/categoryName 이 null 로 내려간다.
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

	@Schema(description = "카테고리 ID. 소득(income) 거래는 null.", example = "3")
	Long categoryId,

	@Schema(description = "카테고리명. 소득(income) 거래는 null.", example = "음식점")
	String categoryName
) {
	public static TransactionSummaryResponse of(TransactionHistory entity) {
		Category category = entity.getCategory();
		return new TransactionSummaryResponse(
			entity.getId(),
			entity.getTransactionName(),
			entity.getAmount(),
			entity.getType().name().toLowerCase(Locale.ROOT),
			category == null ? null : category.getId(),
			category == null ? null : category.getName()
		);
	}
}
