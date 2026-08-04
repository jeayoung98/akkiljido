package com.a508.backend.domain.mypage.dto;

public record MyPlaceResponse(
	Long placeId,
	String myPlaceName,
	String address,
	Double latitude,
	Double longitude
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
