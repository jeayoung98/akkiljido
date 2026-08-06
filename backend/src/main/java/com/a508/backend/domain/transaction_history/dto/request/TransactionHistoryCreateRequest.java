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
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 거래내역 등록 요청. JSON 키는 API 스펙을 그대로 따른다(payment_method 는 snake_case).
 * <p>
 * 결제 수단(payment_method)과 카테고리(categoryId)는 거래 유형에 따라 필수 여부가 달라지므로
 * Bean Validation 으로 단독 검증하지 않고 서비스 계층에서 type 과 함께 검증한다.
 * 지출(EXPENSE)이면 둘 다 필수, 소득(INCOME)이면 둘 다 보낼 수 없다.
 */
@Schema(description = "거래내역 등록 요청")
public record TransactionHistoryCreateRequest(

	@Schema(description = "거래명", example = "스타벅스")
	@NotBlank(message = "거래명은 필수입니다.")
	@Size(max = 10, message = "거래명은 10자 이하여야 합니다.")
	String name,

	@Schema(description = "거래 금액", example = "15000")
	@NotNull(message = "거래 금액은 필수입니다.")
	Long amount,

	@Schema(description = "거래 유형(수입/지출)", example = "EXPENSE")
	@NotNull(message = "거래 유형은 필수입니다.")
	TransactionType type,

	@Schema(description = "결제 수단. 지출(EXPENSE)은 필수, 소득(INCOME)은 보낼 수 없다.", example = "카드")
	@JsonProperty("payment_method")
	@Pattern(regexp = ".*\\S.*", flags = Pattern.Flag.DOTALL, message = "결제 수단은 공백일 수 없습니다.")
	@Size(max = 10, message = "결제 수단은 10자 이하여야 합니다.")
	String paymentMethod,

	@Schema(description = "카테고리 ID. 지출(EXPENSE)은 필수, 소득(INCOME)은 보낼 수 없다.", example = "3")
	Long categoryId,

	@Schema(description = "거래 일시", example = "2026-07-27 15:30:00")
	@NotNull(message = "거래 일시는 필수입니다.")
	@JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
	LocalDateTime datetime,

	@Schema(description = "주소", example = "서울 강남구 테헤란로")
	@Size(max = 50, message = "주소는 50자 이하여야 합니다.")
	String address,

	@Schema(description = "위도", example = "37.5006")
	@DecimalMin(value = "-90.0", message = "위도는 -90 이상이어야 합니다.")
	@DecimalMax(value = "90.0", message = "위도는 90 이하여야 합니다.")
	Double latitude,

	@Schema(description = "경도", example = "127.0366")
	@DecimalMin(value = "-180.0", message = "경도는 -180 이상이어야 합니다.")
	@DecimalMax(value = "180.0", message = "경도는 180 이하여야 합니다.")
	Double longitude,

	@Schema(description = "메모", example = "아메리카노")
	@Size(max = 30, message = "메모는 30자 이하여야 합니다.")
	String memo
) {
}
