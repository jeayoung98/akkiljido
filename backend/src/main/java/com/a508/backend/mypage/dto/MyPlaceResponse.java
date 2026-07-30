package com.a508.backend.mypage.dto;

import java.math.BigDecimal;

public record MyPlaceResponse(
	Long placeId,
	String myPlaceName,
	String address,
	BigDecimal latitude,
	BigDecimal longitude
) {

	public static MyPlaceResponse from(MyPlaceResult result) {
		return new MyPlaceResponse(
			result.placeId(),
			result.myPlaceName(),
			result.address(),
			result.latitude(),
			result.longitude()
		);
	}
}
