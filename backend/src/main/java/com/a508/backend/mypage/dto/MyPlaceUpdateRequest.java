package com.a508.backend.mypage.dto;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Schema(description = "내 장소 수정 요청")
public record MyPlaceUpdateRequest(

	@Schema(description = "변경할 내 장소 이름", example = "우리 집")
	@JsonProperty("my_place_name")
	@Pattern(regexp = ".*\\S.*", flags = Pattern.Flag.DOTALL, message = "장소 이름은 공백일 수 없습니다.")
	@Size(max = 20, message = "장소 이름은 20자 이하여야 합니다.")
	String myPlaceName,

	@Schema(description = "변경할 장소 주소", example = "서울 마포구 서교동 123-4")
	@Pattern(regexp = ".*\\S.*", flags = Pattern.Flag.DOTALL, message = "주소는 공백일 수 없습니다.")
	@Size(max = 50, message = "주소는 50자 이하여야 합니다.")
	String address,

	@Schema(description = "변경할 위도", example = "37.5563")
	@DecimalMin(value = "-90.0", message = "위도는 -90 이상이어야 합니다.")
	@DecimalMax(value = "90.0", message = "위도는 90 이하여야 합니다.")
	BigDecimal latitude,

	@Schema(description = "변경할 경도", example = "126.9236")
	@DecimalMin(value = "-180.0", message = "경도는 -180 이상이어야 합니다.")
	@DecimalMax(value = "180.0", message = "경도는 180 이하여야 합니다.")
	BigDecimal longitude
) {

	@JsonIgnore
	@AssertTrue(message = "수정할 정보를 하나 이상 입력해 주세요.")
	public boolean isAnyFieldProvided() {
		return myPlaceName != null || address != null || latitude != null || longitude != null;
	}

	@JsonIgnore
	@AssertTrue(message = "주소, 위도, 경도는 함께 입력해야 합니다.")
	public boolean isLocationComplete() {
		boolean noLocationProvided = address == null && latitude == null && longitude == null;
		boolean allLocationProvided = address != null && latitude != null && longitude != null;

		return noLocationProvided || allLocationProvided;
	}
}
