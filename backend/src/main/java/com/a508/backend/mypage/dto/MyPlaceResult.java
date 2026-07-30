package com.a508.backend.mypage.dto;

import java.math.BigDecimal;

import com.a508.backend.mypage.domain.MyPlace;

public record MyPlaceResult(
	Long placeId,
	String myPlaceName,
	String address,
	BigDecimal latitude,
	BigDecimal longitude
) {

	public static MyPlaceResult from(MyPlace myPlace) {
		return new MyPlaceResult(
			myPlace.getId(),
			myPlace.getMyPlaceName(),
			myPlace.getAddress(),
			myPlace.getLatitude(),
			myPlace.getLongitude()
		);
	}
}
