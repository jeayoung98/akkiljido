package com.a508.backend.domain.transaction_history.dto.response;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 거래내역 지도 조회(가계별) 응답. 동일 좌표의 거래를 하나의 마커로 묶어 내려준다.
 */
@Schema(description = "거래내역 지도 조회(가계별) 응답")
public record MapPlaceListResponse(

	@Schema(description = "좌표별 장소 목록")
	List<MapPlaceResponse> placeList
) {
	public static MapPlaceListResponse of(List<TransactionHistory> transactions) {
		Map<CoordinateKey, List<TransactionHistory>> grouped = new LinkedHashMap<>();
		for (TransactionHistory transaction : transactions) {
			grouped.computeIfAbsent(CoordinateKey.of(transaction.getCoordinate()), key -> new ArrayList<>())
				.add(transaction);
		}

		List<MapPlaceResponse> placeList = grouped.values().stream()
			.map(MapPlaceResponse::of)
			.toList();

		return new MapPlaceListResponse(placeList);
	}
}
