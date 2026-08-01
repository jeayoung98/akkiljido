package com.a508.backend.domain.mypage.dto;

import com.a508.backend.domain.mypage.domain.MyPlace;

public record MyPlaceResult(
	Long placeId,
	String myPlaceName,
	String address,
	Double latitude,
	Double longitude
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
