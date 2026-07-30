package com.a508.backend.mypage.dto;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonProperty;

public record MyPlaceUpdateRequest(

	@JsonProperty("my_place_name")
	String myPlaceName,

	String address,

	BigDecimal latitude,

	BigDecimal longitude
) {
}