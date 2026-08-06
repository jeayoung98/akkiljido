package com.a508.backend.domain.transaction_history.dto.response;

import com.a508.backend.domain.mypage.domain.MyPlace;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 지도에 표시할 내 장소 항목. totalAmount 는 해당 장소 반경 필터 결과에 해당하는 지출 합계다.
 */
@Schema(description = "지도 내 장소 조회 항목")
public record MyPlaceMapResponse(

	@Schema(description = "내 장소 ID", example = "1")
	Long placeId,

	@Schema(description = "내 장소 이름", example = "집")
	String myPlaceName,

	@Schema(description = "주소", example = "서울 마포구 서교동 123-4")
	String address,

	@Schema(description = "위도", example = "37.5563")
	Double latitude,

	@Schema(description = "경도", example = "126.9236")
	Double longitude,

	@Schema(description = "반경 필터 결과에 해당하는 지출 합계", example = "180000")
	Long totalAmount
) {
	public static MyPlaceMapResponse of(MyPlace myPlace, long totalAmount) {
		return new MyPlaceMapResponse(
			myPlace.getId(),
			myPlace.getMyPlaceName(),
			myPlace.getAddress(),
			myPlace.getLatitude().doubleValue(),
			myPlace.getLongitude().doubleValue(),
			totalAmount
		);
	}
}
