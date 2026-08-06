package com.a508.backend.domain.transaction_history.dto.response;

import java.time.LocalDateTime;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.global.util.DateTimeUtils;
import com.fasterxml.jackson.annotation.JsonFormat;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 지도 조회 결과에 포함되는 개별 거래 항목. 가계별/행정구역별 응답이 공통으로 사용한다.
 */
@Schema(description = "지도 조회 거래 항목")
public record MapTransactionResponse(

	@Schema(description = "거래내역 ID", example = "101")
	Long transactionId,

	@Schema(description = "거래명", example = "스타벅스")
	String name,

	@Schema(description = "거래 금액", example = "4100")
	Long amount,

	@Schema(description = "카테고리 ID", example = "3")
	Long categoryId,

	@Schema(description = "카테고리명", example = "음식점")
	String categoryName,

	@Schema(description = "거래 일시", example = "2026-07-27 15:30:00")
	@JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
	LocalDateTime datetime
) {
	static MapTransactionResponse of(TransactionHistory entity) {
		return new MapTransactionResponse(
			entity.getId(),
			entity.getTransactionName(),
			entity.getAmount(),
			entity.getCategory().getId(),
			entity.getCategory().getName(),
			DateTimeUtils.toServiceLocal(entity.getDatetime())
		);
	}
}
