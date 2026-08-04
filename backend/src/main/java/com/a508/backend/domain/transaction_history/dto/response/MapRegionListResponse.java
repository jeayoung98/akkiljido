package com.a508.backend.domain.transaction_history.dto.response;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.a508.backend.domain.transaction_history.entity.MapDepth;
import com.a508.backend.domain.transaction_history.entity.TransactionHistory;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 거래내역 지도 조회(시도/시군구/읍면동) 응답.
 * 법정동 변환 결과가 없는 거래(region_*depth_name 이 null)는 묶을 구역이 없으므로 제외한다.
 */
@Schema(description = "거래내역 지도 조회(행정구역별) 응답")
public record MapRegionListResponse(

	@Schema(description = "행정구역별 거래 목록")
	List<MapRegionResponse> transactionList
) {
	public static MapRegionListResponse of(MapDepth depth, List<TransactionHistory> transactions) {
		Map<String, List<TransactionHistory>> grouped = new LinkedHashMap<>();
		for (TransactionHistory transaction : transactions) {
			if (depth.nameOf(transaction) == null) {
				continue;
			}
			grouped.computeIfAbsent(depth.regionPathOf(transaction), key -> new ArrayList<>()).add(transaction);
		}

		List<MapRegionResponse> transactionList = grouped.values().stream()
			.map(group -> MapRegionResponse.of(depth, group))
			.toList();

		return new MapRegionListResponse(transactionList);
	}
}
