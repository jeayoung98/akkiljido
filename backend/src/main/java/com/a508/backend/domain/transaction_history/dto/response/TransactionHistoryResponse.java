package com.a508.backend.domain.transaction_history.dto.response;

import java.time.LocalDateTime;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.domain.transaction_history.entity.TransactionType;
import com.a508.backend.global.util.DateTimeUtils;
import com.a508.backend.global.util.GeometryUtils;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 거래내역 상세/수정 응답. JSON 키는 API 스펙을 그대로 따른다.
 */
@Schema(description = "거래내역 응답")
public record TransactionHistoryResponse(

        @Schema(description = "거래내역 ID", example = "1")
        Long transactionId,

        @Schema(description = "거래명", example = "스타벅스")
        String name,

        @Schema(description = "거래 금액", example = "15000")
        Long amount,

        @Schema(description = "거래 유형(수입/지출)", example = "EXPENSE")
        TransactionType type,

        @Schema(description = "결제 수단", example = "카드")
        @JsonProperty("payment_method")
        String paymentMethod,

        @Schema(description = "카테고리 ID", example = "3")
        Long categoryId,

        @Schema(description = "카테고리명", example = "음식점")
        String categoryName,

        @Schema(description = "거래 일시", example = "2026-07-27 15:30:00")
        @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
        LocalDateTime datetime,

        @Schema(description = "주소", example = "서울 강남구 테헤란로")
        String address,

        @Schema(description = "위도", example = "37.5006")
        Double latitude,

        @Schema(description = "경도", example = "127.0366")
        Double longitude,

        @Schema(description = "메모", example = "아메리카노")
        String memo
) {
    public static TransactionHistoryResponse from(TransactionHistory entity) {
        return new TransactionHistoryResponse(
                entity.getId(),
                entity.getTransactionName(),
                entity.getAmount(),
                entity.getType(),
                entity.getPaymentMethod(),
                entity.getCategory().getId(),
                entity.getCategory().getName(),
                DateTimeUtils.toServiceLocal(entity.getDatetime()),
                entity.getAddress(),
                GeometryUtils.latitudeOf(entity.getCoordinate()),
                GeometryUtils.longitudeOf(entity.getCoordinate()),
                entity.getMemo()
        );
    }
}
