package com.a508.backend.domain.transaction_history.dto.response;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.global.util.GeometryUtils;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 같은 좌표에 묶인 가계(장소) 단위 지도 항목.
 * 한 좌표에 여러 상호가 있을 수 있으므로 name 은 중복 제거한 거래명을 ", " 로 이어 붙인다.
 */
@Schema(description = "지도 가계별 조회 항목")
public record MapPlaceResponse(

	@Schema(description = "주소", example = "서울 마포구 서교동 123-4")
	String address,

	@Schema(description = "위도", example = "37.5563")
	Double latitude,

	@Schema(description = "경도", example = "126.9236")
	Double longitude,

	@Schema(description = "항목명. 같은 좌표에 여러 장소가 있으면 ', ' 로 이어 붙인다.", example = "스타벅스, 김밥천국")
	String name,

	@Schema(description = "지출 합산 금액", example = "36500")
	Long amount,

	@Schema(description = "거래 수", example = "3")
	int transactionCount,

	@Schema(description = "해당 좌표의 거래 목록")
	List<MapTransactionResponse> transactionList
) {
	private static final String NAME_DELIMITER = ", ";

	static MapPlaceResponse of(List<TransactionHistory> transactions) {
		TransactionHistory representative = transactions.get(0);

		Set<String> names = transactions.stream()
			.map(TransactionHistory::getTransactionName)
			.collect(Collectors.toCollection(LinkedHashSet::new));

		long amount = transactions.stream()
			.mapToLong(TransactionHistory::getAmount)
			.sum();

		List<MapTransactionResponse> transactionList = transactions.stream()
			.map(MapTransactionResponse::of)
			.toList();

		return new MapPlaceResponse(
			representative.getAddress(),
			GeometryUtils.latitudeOf(representative.getCoordinate()),
			GeometryUtils.longitudeOf(representative.getCoordinate()),
			String.join(NAME_DELIMITER, names),
			amount,
			transactions.size(),
			transactionList
		);
	}
}
