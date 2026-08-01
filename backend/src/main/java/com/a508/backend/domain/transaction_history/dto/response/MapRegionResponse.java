package com.a508.backend.domain.transaction_history.dto.response;

import java.util.List;

import com.a508.backend.domain.transaction_history.entity.MapDepth;
import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.global.util.GeometryUtils;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 행정구역(시도/시군구/읍면동) 단위로 묶인 지도 항목.
 * 마커 위치는 해당 구역에 속한 거래 좌표의 평균(무게중심)을 사용한다.
 */
@Schema(description = "지도 행정구역별 조회 항목")
public record MapRegionResponse(

	@Schema(description = "구역 내 거래 좌표의 평균 위도", example = "37.5563")
	Double latitude,

	@Schema(description = "구역 내 거래 좌표의 평균 경도", example = "126.9236")
	Double longitude,

	@Schema(description = "시도 or 시군구 or 읍면동 이름", example = "마포구")
	String depthName,

	@Schema(description = "지출 합산 금액", example = "180000")
	Long amount,

	@Schema(description = "거래 수", example = "12")
	int transactionCount,

	@Schema(description = "구역 내 거래 목록")
	List<MapTransactionResponse> placeList
) {
	static MapRegionResponse of(MapDepth depth, List<TransactionHistory> transactions) {
		TransactionHistory representative = transactions.getFirst();

		double latitude = transactions.stream()
			.mapToDouble(transaction -> GeometryUtils.latitudeOf(transaction.getCoordinate()))
			.average()
			.orElseThrow();

		double longitude = transactions.stream()
			.mapToDouble(transaction -> GeometryUtils.longitudeOf(transaction.getCoordinate()))
			.average()
			.orElseThrow();

		long amount = transactions.stream()
			.mapToLong(TransactionHistory::getAmount)
			.sum();

		List<MapTransactionResponse> placeList = transactions.stream()
			.map(MapTransactionResponse::of)
			.toList();

		return new MapRegionResponse(
			latitude,
			longitude,
			depth.nameOf(representative),
			amount,
			transactions.size(),
			placeList
		);
	}
}
