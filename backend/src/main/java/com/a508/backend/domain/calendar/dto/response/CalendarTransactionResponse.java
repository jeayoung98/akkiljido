package com.a508.backend.domain.calendar.dto.response;

import com.a508.backend.domain.category.entity.Category;
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
        TransactionType type,

        @Schema(description = "카테고리 ID", example = "3")
        Long categoryId,

        @Schema(description = "카테고리명", example = "카페")
        String categoryName
) {

    /** 거래내역 엔티티를 캘린더 거래내역 응답으로 변환한다. */
    public static CalendarTransactionResponse from(TransactionHistory transaction) {
        // 소득 거래는 카테고리가 없으므로 null 을 그대로 내려준다.
        Category category = transaction.getCategory();

        return new CalendarTransactionResponse(
                transaction.getId(),
                transaction.getTransactionName(),
                transaction.getAmount(),
                transaction.getType(),
                category == null ? null : category.getId(),
                category == null ? null : category.getName()
        );
    }
}
