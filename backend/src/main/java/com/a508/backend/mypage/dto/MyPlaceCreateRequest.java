package com.a508.backend.mypage.dto;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record MyPlaceCreateRequest(

	@JsonProperty("my_place_name")
	@NotBlank(message = "필수 입력값을 확인해 주세요.")
	String myPlaceName,

	@NotBlank(message = "필수 입력값을 확인해 주세요.")
	String address,

	@NotNull(message = "필수 입력값을 확인해 주세요.")
	BigDecimal latitude,

	@NotNull(message = "필수 입력값을 확인해 주세요.")
	BigDecimal longitude
) {
}