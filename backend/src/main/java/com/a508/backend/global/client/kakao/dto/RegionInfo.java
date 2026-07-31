package com.a508.backend.global.client.kakao.dto;

/**
 * 좌표 -> 법정동 변환 결과. 카카오 coord2regioncode 의 region_type "B"(법정동) 문서에서 추출한다.
 */
public record RegionInfo(
	String bCode,
	String region1DepthName,
	String region2DepthName,
	String region3DepthName
) {
	private static final RegionInfo EMPTY = new RegionInfo(null, null, null, null);

	/** 변환 실패/미조회 시 사용하는 빈 결과. */
	public static RegionInfo empty() {
		return EMPTY;
	}
}
