package com.a508.backend.domain.calendar.dto.response;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.domain.transaction_history.entity.TransactionType;

import io.swagger.v3.oas.annotations.media.Schema;

/** 일 단위 캘린더 조회에 포함되는 개별 거래내역 응답. */
@Schema(description = "캘린더 거래내역")
public record CalendarTransactionResponse(

        @Schema(description = "거래내역 ID", example = "1")
        Long transactionId,

        @Schema(description = "거래명", example = "스타벅스")
        String name,

        @Schema(description = "거래 금액", example = "15000")
        Long amount,

        @Schema(description = "거래 유형", example = "EXPENSE")
        TransactionType type
) {

    /** 거래내역 엔티티를 캘린더 거래내역 응답으로 변환한다. */
    public static CalendarTransactionResponse from(TransactionHistory transaction) {
        return new CalendarTransactionResponse(
                transaction.getId(),
                transaction.getTransactionName(),
                transaction.getAmount(),
                transaction.getType()
        );
    }
}
