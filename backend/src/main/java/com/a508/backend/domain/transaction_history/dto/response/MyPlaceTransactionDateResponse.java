package com.a508.backend.domain.transaction_history.dto.response;

import java.time.LocalDateTime;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.global.util.DateTimeUtils;
import com.fasterxml.jackson.annotation.JsonFormat;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 내 장소 상세 조회에서 같은 항목이 여러 번 결제된 경우의 개별 결제 건.
 */
@Schema(description = "내 장소 상세 조회 개별 결제 건")
public record MyPlaceTransactionDateResponse(

	@Schema(description = "거래내역 ID", example = "1")
	Long transactionId,

	@Schema(description = "거래 일시", example = "2024-07-17 09:20:10")
	@JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
	LocalDateTime datetime,

	@Schema(description = "거래 금액", example = "2460")
	Long amount
) {
	static MyPlaceTransactionDateResponse of(TransactionHistory entity) {
		return new MyPlaceTransactionDateResponse(
			entity.getId(),
			DateTimeUtils.toServiceLocal(entity.getDatetime()),
			entity.getAmount()
		);
	}
}
