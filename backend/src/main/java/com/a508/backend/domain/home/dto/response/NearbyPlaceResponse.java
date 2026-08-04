package com.a508.backend.domain.home.dto.response;

import java.util.Comparator;
import java.util.List;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.global.util.GeometryUtils;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 내 주변 최근 일주일 지출의 개별 장소 항목.
 * 같은 항목명(거래명)의 지출을 하나로 합치고, 주소/좌표는 그중 가장 최근 거래의 값을 대표로 사용한다.
 */
@Schema(description = "내 주변 지출 장소 항목")
public record NearbyPlaceResponse(

	@Schema(description = "주소", example = "서울 강남구 테헤란로 212")
	String address,

	@Schema(description = "위도", example = "37.5006")
	Double latitude,

	@Schema(description = "경도", example = "127.0366")
	Double longitude,

	@Schema(description = "항목명(거래명)", example = "스타벅스")
	String name,

	@Schema(description = "해당 항목명의 지출 합계", example = "23000")
	Long amount
) {
	/** 같은 항목명으로 묶인 거래들을 한 항목으로 합친다. 호출부가 빈 목록을 넘기지 않는다. */
	static NearbyPlaceResponse of(List<TransactionHistory> transactions) {
		TransactionHistory representative = transactions.stream()
			.max(Comparator.comparing(TransactionHistory::getDatetime))
			.orElseThrow();

		long amount = transactions.stream()
			.mapToLong(TransactionHistory::getAmount)
			.sum();

		return new NearbyPlaceResponse(
			representative.getAddress(),
			GeometryUtils.latitudeOf(representative.getCoordinate()),
			GeometryUtils.longitudeOf(representative.getCoordinate()),
			representative.getTransactionName(),
			amount
		);
	}
}
