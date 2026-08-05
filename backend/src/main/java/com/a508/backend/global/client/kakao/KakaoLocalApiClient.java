package com.a508.backend.global.client.kakao;

import java.util.Optional;

import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import com.a508.backend.global.client.kakao.dto.KakaoCoord2RegionResponse;
import com.a508.backend.global.client.kakao.dto.RegionInfo;
import com.a508.backend.global.config.KakaoProperties;

import lombok.extern.slf4j.Slf4j;

/**
 * 카카오 로컬 API 클라이언트. 좌표(위/경도)를 법정동 정보로 변환한다.
 * 변환은 부가 정보 보강 용도이므로, 실패 시 예외를 전파하지 않고 빈 결과를 반환한다(best-effort).
 */
@Slf4j
@Component
public class KakaoLocalApiClient {
	private static final String COORD2REGION_PATH = "/v2/local/geo/coord2regioncode.json";
	private static final String LEGAL_DISTRICT = "B"; // 법정동

	private final RestClient restClient;

	public KakaoLocalApiClient(KakaoProperties properties) {
		this.restClient = RestClient.builder()
			.baseUrl(properties.baseUrl())
			.defaultHeader(
				HttpHeaders.AUTHORIZATION,
				"KakaoAK " + properties.restApiKey()
			)
			.build();
	}

	/**
	 * 좌표를 법정동(region_type "B") 정보로 변환한다. 실패하거나 결과가 없으면 Optional.empty() 를 반환한다.
	 * 카카오 API 는 좌표를 x=경도(longitude), y=위도(latitude) 로 받는다.
	 */
	public Optional<RegionInfo> coordToRegion(double latitude, double longitude) {
		try {
			KakaoCoord2RegionResponse response = restClient.get()
				.uri(uriBuilder -> uriBuilder.path(COORD2REGION_PATH)
					.queryParam("x", longitude)
					.queryParam("y", latitude)
					.build())
				.retrieve()
				.body(KakaoCoord2RegionResponse.class);

			if (response == null || response.documents() == null) {
				return Optional.empty();
			}

			return response.documents().stream()
				.filter(document -> LEGAL_DISTRICT.equals(document.regionType()))
				.findFirst()
				.map(document -> new RegionInfo(
					document.code(),
					document.region1DepthName(),
					document.region2DepthName(),
					document.region3DepthName()));
		} catch (RestClientResponseException e) {
			// HTTP 에러 응답(401/403/4xx/5xx 등): 상태코드와 응답 본문까지 남겨 원인 파악을 돕는다.
			log.warn("카카오 좌표->법정동 변환 실패 (lat={}, lng={}) status={} body={}",
				latitude, longitude, e.getStatusCode(), e.getResponseBodyAsString());
			return Optional.empty();
		} catch (RestClientException e) {
			// 연결 실패/타임아웃/역직렬화 실패 등
			log.warn("카카오 좌표->법정동 변환 실패 (lat={}, lng={}): {}", latitude, longitude, e.toString());
			return Optional.empty();
		} // TODO: 실패 시 처리 방식 추가
	}
}
