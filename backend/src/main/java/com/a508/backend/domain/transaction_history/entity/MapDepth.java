package com.a508.backend.domain.transaction_history.entity;

import java.util.stream.Collectors;
import java.util.stream.Stream;

import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;

/**
 * 지도 조회 행정구역 단위. path variable(1/2/3)과 매핑되며, 카카오 법정동 변환 결과인
 * transaction_history.region_*depth_name 컬럼을 어느 깊이까지 사용할지 결정한다.
 */
public enum MapDepth {

	SIDO(1),
	SIGUNGU(2),
	EUPMYEONDONG(3);

	private final int value;

	MapDepth(int value) {
		this.value = value;
	}

	/** path variable 을 파싱한다. 1/2/3 이 아니면 예외를 던진다. */
	public static MapDepth from(Integer depth) {
		if (depth == null) {
			throw new BusinessException(ExceptionType.INVALID_MAP_DEPTH);
		}
		return Stream.of(values())
			.filter(mapDepth -> mapDepth.value == depth)
			.findFirst()
			.orElseThrow(() -> new BusinessException(ExceptionType.INVALID_MAP_DEPTH));
	}

	/**
	 * 해당 단위의 행정구역 이름. 법정동 변환이 되지 않은 거래(null)는 그룹에서 제외하기 위해 null 을 반환한다.
	 */
	public String nameOf(TransactionHistory transaction) {
		return switch (this) {
			case SIDO -> transaction.getRegion1DepthName();
			case SIGUNGU -> transaction.getRegion2DepthName();
			case EUPMYEONDONG -> transaction.getRegion3DepthName();
		};
	}

	/**
	 * 그룹핑에 사용할 행정구역 전체 경로(예: depth 2 이면 "서울특별시 마포구").
	 * 이름만으로 묶으면 서울 중구와 부산 중구가 한 그룹이 되므로 상위 단위까지 포함한다.
	 * 응답에는 내려가지 않는 내부 키다.
	 */
	public String regionPathOf(TransactionHistory transaction) {
		Stream<String> names = switch (this) {
			case SIDO -> Stream.of(transaction.getRegion1DepthName());
			case SIGUNGU -> Stream.of(transaction.getRegion1DepthName(), transaction.getRegion2DepthName());
			case EUPMYEONDONG -> Stream.of(transaction.getRegion1DepthName(), transaction.getRegion2DepthName(),
				transaction.getRegion3DepthName());
		};

		return names.filter(name -> name != null && !name.isBlank())
			.collect(Collectors.joining(" "));
	}
}
