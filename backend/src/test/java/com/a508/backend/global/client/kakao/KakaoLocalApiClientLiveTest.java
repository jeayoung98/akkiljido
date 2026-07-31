package com.a508.backend.global.client.kakao;

import static org.assertj.core.api.Assertions.*;

import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import com.a508.backend.global.client.kakao.dto.RegionInfo;
import com.a508.backend.global.config.KakaoProperties;

/**
 * 실제 카카오 coord2regioncode API 를 호출해 응답이 제대로 오는지 확인하는 라이브 테스트.
 * <p>
 * 네트워크와 실제 REST 키가 필요하므로, 환경변수 {@code KAKAO_REST_API_KEY} 가 설정된 경우에만 실행된다.
 * (키가 없으면 자동으로 skip 되어 일반 {@code ./gradlew test} 는 영향받지 않는다.)
 * <p>
 * 실행 예시:
 * <pre>
 *   # bash
 *   KAKAO_REST_API_KEY=발급받은키 ./gradlew test --tests "*KakaoLocalApiClientLiveTest"
 *
 *   # PowerShell
 *   $env:KAKAO_REST_API_KEY="발급받은키"; ./gradlew test --tests "*KakaoLocalApiClientLiveTest"
 * </pre>
 */
@EnabledIfEnvironmentVariable(named = "KAKAO_REST_API_KEY", matches = ".+")
class KakaoLocalApiClientLiveTest {

	// 강남역 부근 좌표 (위도 y, 경도 x)
	private static final double LATITUDE = 37.4979;

	private static final double LONGITUDE = 127.0276;

	private KakaoLocalApiClient newClient() {
		String baseUri = "https://dapi.kakao.com";
		String apiKey = System.getenv("KAKAO_REST_API_KEY");
		KakaoProperties properties = new KakaoProperties(baseUri, apiKey);
		return new KakaoLocalApiClient(properties);
	}

	@Test
	@DisplayName("[live] 실제 카카오 API 를 호출하면 좌표에 대한 법정동 정보가 돌아온다")
	void coordToRegionCallsRealApi() {
		Optional<RegionInfo> result = newClient().coordToRegion(LATITUDE, LONGITUDE);

		// 응답 내용 눈으로 확인용 출력
		System.out.println("카카오 coord2regioncode 응답: " + result);

		assertThat(result)
			.withFailMessage(
				"카카오 응답이 비었습니다. REST 키/네트워크/좌표를 확인하세요. (키 오류면 KakaoLocalApiClient 가 예외를 삼키고 empty 를 반환합니다)")
			.isPresent();

		RegionInfo region = result.get();
		assertThat(region.bCode()).isNotBlank();
		assertThat(region.region1DepthName()).isEqualTo("서울특별시");
		assertThat(region.region2DepthName()).isEqualTo("서초구");
		assertThat(region.region3DepthName()).isEqualTo("서초동");
	}
}
