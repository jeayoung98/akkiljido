package com.a508.backend.domain.transaction_history.dto.response;

import java.util.Comparator;
import java.util.List;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.global.util.GeometryUtils;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 내 장소 상세 조회의 항목. 같은 장소(좌표)에서 같은 이름·카테고리로 결제한 건들을 하나로 묶는다.
 */
@Schema(description = "내 장소 상세 조회 항목")
public record MyPlaceTransactionResponse(

	@Schema(description = "항목명", example = "스타벅스")
	String name,

	@Schema(description = "카테고리 ID", example = "3")
	Long categoryId,

	@Schema(description = "카테고리명", example = "음식점")
	String categoryName,

	@Schema(description = "위도", example = "37.5563")
	Double latitude,

	@Schema(description = "경도", example = "126.9236")
	Double longitude,

	@Schema(description = "지출 합산 금액", example = "4100")
	Long amount,

	@Schema(description = "결제 건 목록(오래된 순)")
	List<MyPlaceTransactionDateResponse> dateList
) {
	static MyPlaceTransactionResponse of(List<TransactionHistory> transactions) {
		TransactionHistory representative = transactions.get(0);

		long amount = transactions.stream()
			.mapToLong(TransactionHistory::getAmount)
			.sum();

		List<MyPlaceTransactionDateResponse> dateList = transactions.stream()
			.sorted(Comparator.comparing(TransactionHistory::getDatetime))
			.map(MyPlaceTransactionDateResponse::of)
			.toList();

		return new MyPlaceTransactionResponse(
			representative.getTransactionName(),
			representative.getCategory().getId(),
			representative.getCategory().getName(),
			GeometryUtils.latitudeOf(representative.getCoordinate()),
			GeometryUtils.longitudeOf(representative.getCoordinate()),
			amount,
			dateList
		);
	}
}
