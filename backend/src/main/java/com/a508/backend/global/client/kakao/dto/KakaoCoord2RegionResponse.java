package com.a508.backend.global.client.kakao.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * 카카오 coord2regioncode API 응답 매핑.
 * 참고: https://developers.kakao.com/docs/ko/local/dev-guide#coord-to-district
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record KakaoCoord2RegionResponse(
	List<Document> documents
) {
	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Document(
		@JsonProperty("region_type") String regionType,   // "B": 법정동, "H": 행정동
		String code,                                       // 법정동 코드(b_code)
		@JsonProperty("region_1depth_name") String region1DepthName,
		@JsonProperty("region_2depth_name") String region2DepthName,
		@JsonProperty("region_3depth_name") String region3DepthName
	) {
	}
}
