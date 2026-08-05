package com.a508.backend.domain.transaction_history.dto.response;

import java.time.LocalDate;
import java.util.Locale;

import com.a508.backend.domain.category.entity.Category;
import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.global.util.DateTimeUtils;
import com.fasterxml.jackson.annotation.JsonFormat;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 거래내역 검색 결과의 개별 항목. type 은 프론트 규약에 맞춰 소문자(expense/income)로 내려준다.
 */
@Schema(description = "거래내역 검색 항목")
public record TransactionSearchItem(

        @Schema(description = "거래내역 ID", example = "101")
        Long transactionId,

        @Schema(description = "거래명", example = "점심 식사")
        String transactionName,

        @Schema(description = "거래 금액", example = "12000")
        Long amount,

        @Schema(description = "거래 유형(소비/소득)", example = "expense")
        String type,

        @Schema(description = "거래 일자", example = "2026-07-27")
        @JsonFormat(pattern = "yyyy-MM-dd")
        LocalDate transactionDate,

        @Schema(description = "카테고리 ID. 소득(income) 거래는 null.", example = "1")
        Long categoryId,

        @Schema(description = "카테고리명. 소득(income) 거래는 null.", example = "음식점")
        String categoryName
) {
    public static TransactionSearchItem of(TransactionHistory entity) {
        Category category = entity.getCategory();
        return new TransactionSearchItem(
                entity.getId(),
                entity.getTransactionName(),
                entity.getAmount(),
                entity.getType().name().toLowerCase(Locale.ROOT),
                DateTimeUtils.toServiceLocal(entity.getDatetime()).toLocalDate(),
                category == null ? null : category.getId(),
                category == null ? null : category.getName()
        );
    }
}
