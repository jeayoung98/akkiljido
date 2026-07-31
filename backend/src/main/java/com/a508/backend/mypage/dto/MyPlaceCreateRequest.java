package com.a508.backend.mypage.dto;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonProperty;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "내 장소 등록 요청")
public record MyPlaceCreateRequest(

	@Schema(description = "내 장소 이름", example = "집")
	@JsonProperty("my_place_name")
	@NotBlank(message = "장소 이름은 필수입니다.")
	@Size(max = 20, message = "장소 이름은 20자 이하여야 합니다.")
	String myPlaceName,

	@Schema(description = "장소 주소", example = "서울 마포구 서교동 123-4")
	@NotBlank(message = "주소는 필수입니다.")
	@Size(max = 50, message = "주소는 50자 이하여야 합니다.")
	String address,

	@Schema(description = "위도", example = "37.5563")
	@NotNull(message = "위도는 필수입니다.")
	@DecimalMin(value = "-90.0", message = "위도는 -90 이상이어야 합니다.")
	@DecimalMax(value = "90.0", message = "위도는 90 이하여야 합니다.")
	BigDecimal latitude,

	@Schema(description = "경도", example = "126.9236")
	@NotNull(message = "경도는 필수입니다.")
	@DecimalMin(value = "-180.0", message = "경도는 -180 이상이어야 합니다.")
	@DecimalMax(value = "180.0", message = "경도는 180 이하여야 합니다.")
	BigDecimal longitude
) {
}
