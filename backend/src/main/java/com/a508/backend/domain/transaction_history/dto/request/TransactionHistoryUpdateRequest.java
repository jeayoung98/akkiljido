package com.a508.backend.domain.transaction_history.dto.request;

import java.time.LocalDateTime;

import com.a508.backend.domain.transaction_history.entity.TransactionType;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 거래내역 부분 수정(PATCH) 요청.
 * PATCH 의미에 맞게 모든 필드는 선택값이다. null(미전송) 필드는 기존 값을 그대로 유지한다.
 * 문자열 필드는 @Pattern 으로 "값을 보냈다면 공백만으로 채우지 못하도록" 검증한다(null 은 통과).
 * <p>
 * 카테고리(categoryId)와 결제 수단(payment_method)은 수정 후의 거래 유형에 따라 허용 여부가 달라진다.
 * 수정 결과가 소득(INCOME)이면 둘 다 보낼 수 없고(기존 값도 비워진다), 지출(EXPENSE)이면 둘 다 채워져 있어야 한다.
 * 기존 값과 요청을 합친 상태로 판단해야 하는 규칙이라 서비스 계층에서 검증한다.
 */
@Schema(description = "거래내역 부분 수정(PATCH) 요청. 보내지 않은 필드는 기존 값을 유지한다.")
public record TransactionHistoryUpdateRequest(

	@Schema(description = "거래명", example = "김밥천국")
	@Pattern(regexp = ".*\\S.*", flags = Pattern.Flag.DOTALL, message = "거래명은 공백일 수 없습니다.")
	@Size(max = 10, message = "거래명은 10자 이하여야 합니다.")
	String name,

	@Schema(description = "거래 금액", example = "20000")
	Long amount,

	@Schema(description = "거래 유형(수입/지출)", example = "EXPENSE")
	TransactionType type,

	@Schema(description = "결제 수단. 수정 결과가 소득(INCOME)이면 보낼 수 없다.", example = "현금")
	@JsonProperty("payment_method")
	@Pattern(regexp = ".*\\S.*", flags = Pattern.Flag.DOTALL, message = "결제 수단은 공백일 수 없습니다.")
	@Size(max = 10, message = "결제 수단은 10자 이하여야 합니다.")
	String paymentMethod,

	@Schema(description = "카테고리 ID. 수정 결과가 소득(INCOME)이면 보낼 수 없다.", example = "5")
	Long categoryId,

	@Schema(description = "거래 일시", example = "2026-07-24 09:00:00")
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
