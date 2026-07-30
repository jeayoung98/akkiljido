package com.a508.backend.domain.transaction_history.dto.request;

import java.time.LocalDateTime;

import com.a508.backend.domain.transaction_history.entity.TransactionType;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 거래내역 수정 요청. 전체 필드를 교체하는 방식으로 등록 요청과 동일한 형태를 가진다.
 */
@Schema(description = "거래내역 수정 요청")
public record TransactionHistoryUpdateRequest(

        @Schema(description = "거래명", example = "김밥천국")
        @NotBlank(message = "거래명은 필수입니다.")
        @Size(max = 10, message = "거래명은 10자 이하여야 합니다.")
        String name,

        @Schema(description = "거래 금액", example = "20000")
        @NotNull(message = "거래 금액은 필수입니다.")
        Long amount,

        @Schema(description = "거래 유형(수입/지출)", example = "EXPENSE")
        @NotNull(message = "거래 유형은 필수입니다.")
        TransactionType type,

        @Schema(description = "결제 수단", example = "현금")
        @JsonProperty("payment_method")
        @NotBlank(message = "결제 수단은 필수입니다.")
        @Size(max = 10, message = "결제 수단은 10자 이하여야 합니다.")
        String paymentMethod,

        @Schema(description = "카테고리 ID", example = "5")
        @NotNull(message = "카테고리는 필수입니다.")
        Long category,

        @Schema(description = "거래 일시", example = "2026-07-24 09:00:00")
        @NotNull(message = "거래 일시는 필수입니다.")
        @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
        LocalDateTime datetime,

        @Schema(description = "주소", example = "서울 강남구 역삼동")
        @Size(max = 50, message = "주소는 50자 이하여야 합니다.")
        String address,

        @Schema(description = "위도", example = "35.1796")
        @DecimalMin(value = "-90.0", message = "위도는 -90 이상이어야 합니다.")
        @DecimalMax(value = "90.0", message = "위도는 90 이하여야 합니다.")
        Double latitude,

        @Schema(description = "경도", example = "129.0756")
        @DecimalMin(value = "-180.0", message = "경도는 -180 이상이어야 합니다.")
        @DecimalMax(value = "180.0", message = "경도는 180 이하여야 합니다.")
        Double longitude,

        @Schema(description = "메모", example = "제육덮밥")
        @Size(max = 30, message = "메모는 30자 이하여야 합니다.")
        String memo
) {
}
