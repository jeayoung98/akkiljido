package com.a508.backend.global.client.kakao;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * 카카오 API 호출이 실패하는 원인을 눈으로 확인하기 위한 진단용 테스트.
 * 실제 HTTP 상태코드와 응답 본문(에러 메시지 포함)을 그대로 출력한다. (성공/실패 단정 없이 출력만)
 *
 * 실행:
 * <pre>
 *   # PowerShell
 *   $env:KAKAO_REST_API_KEY="발급받은키"; ./gradlew test --tests "*KakaoLocalApiClientDebugTest" -i
 * </pre>
 */
@EnabledIfEnvironmentVariable(named = "KAKAO_REST_API_KEY", matches = ".+")
class KakaoLocalApiClientDebugTest {

	private static final double LATITUDE = 37.4979;
	private static final double LONGITUDE = 127.0276;

	@Test
	@DisplayName("[debug] 카카오 coord2regioncode 원본 응답(상태코드/본문)을 출력한다")
	void printRawResponse() {
		String apiKey = System.getenv("KAKAO_REST_API_KEY");

		// 키에 공백/따옴표/개행이 섞이면 401 의 흔한 원인 → 값은 노출하지 않고 특성만 점검
		System.out.println("=== KAKAO KEY 점검 ===");
		System.out.println("key length          = " + apiKey.length());
		System.out.println("has leading/trailing space? = " + (!apiKey.equals(apiKey.strip())));
		System.out.println("contains quote/newline?     = "
			+ (apiKey.contains("\"") || apiKey.contains("'") || apiKey.contains("\n") || apiKey.contains("\r")));

		RestClient restClient = RestClient.builder()
			.baseUrl("https://dapi.kakao.com")
			.defaultHeader(HttpHeaders.AUTHORIZATION, "KakaoAK " + apiKey.strip())
			.build();

		System.out.println("=== 요청 ===");
		System.out.println(
			"GET https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=" + LONGITUDE + "&y=" + LATITUDE);

		try {
			ResponseEntity<String> response = restClient.get()
				.uri(uriBuilder -> uriBuilder.path("/v2/local/geo/coord2regioncode.json")
					.queryParam("x", LONGITUDE)
					.queryParam("y", LATITUDE)
					.build())
				.retrieve()
				.toEntity(String.class);

			System.out.println("=== 응답 (성공) ===");
			System.out.println("STATUS = " + response.getStatusCode());
			System.out.println("BODY   = " + response.getBody());
		} catch (RestClientResponseException e) {
			System.out.println("=== 응답 (HTTP 에러) ===");
			System.out.println("STATUS = " + e.getStatusCode());
			System.out.println("BODY   = " + e.getResponseBodyAsString());
		} catch (Exception e) {
			System.out.println("=== 호출 자체 실패(네트워크/SSL 등) ===");
			System.out.println(e);
		}
	}
}
