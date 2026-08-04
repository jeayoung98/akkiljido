package com.a508.backend.global.client.kakao;

import static org.assertj.core.api.Assertions.*;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.a508.backend.global.client.kakao.dto.RegionInfo;
import com.a508.backend.global.config.KakaoProperties;
import com.sun.net.httpserver.HttpServer;

/**
 * KakaoLocalApiClient 단위 테스트.
 * <p>
 * 클라이언트가 내부에서 {@link KakaoProperties#baseUrl()} 로 직접 {@code RestClient} 를 생성하므로,
 * (외부에서 주입한 RestClient 를 가로채는 방식 대신) 로컬에 임시 HTTP 서버를 띄우고
 * baseUrl 을 그 주소로 지정해 실제 HTTP 왕복을 검증한다. (추가 의존성 없이 JDK 내장 HttpServer 사용)
 */
class KakaoLocalApiClientTest {

	private static final String COORD2REGION_PATH = "/v2/local/geo/coord2regioncode.json";

	private HttpServer server;
	private final AtomicReference<String> capturedQuery = new AtomicReference<>();

	private KakaoLocalApiClient clientResponding(int status, String body) throws IOException {
		server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
		server.createContext(COORD2REGION_PATH, exchange -> {
			capturedQuery.set(exchange.getRequestURI().getQuery());
			byte[] bytes = body == null ? new byte[0] : body.getBytes(StandardCharsets.UTF_8);
			exchange.getResponseHeaders().add("Content-Type", "application/json");
			// 본문이 없으면 length -1 (No Content)
			exchange.sendResponseHeaders(status, bytes.length == 0 ? -1 : bytes.length);
			try (OutputStream os = exchange.getResponseBody()) {
				os.write(bytes);
			}
		});
		server.start();

		String baseUrl = "http://localhost:" + server.getAddress().getPort();
		return new KakaoLocalApiClient(new KakaoProperties(baseUrl, "test-key"));
	}

	@AfterEach
	void tearDown() {
		if (server != null) {
			server.stop(0);
		}
	}

	@Test
	@DisplayName("coordToRegion 은 응답에서 region_type 'B'(법정동) 문서를 골라 RegionInfo 로 반환한다")
	void coordToRegionReturnsLegalDistrict() throws IOException {
		String body = """
			{
			  "meta": { "total_count": 2 },
			  "documents": [
			    {
			      "region_type": "H",
			      "code": "1168064000",
			      "region_1depth_name": "서울특별시",
			      "region_2depth_name": "강남구",
			      "region_3depth_name": "역삼1동"
			    },
			    {
			      "region_type": "B",
			      "code": "1168010100",
			      "region_1depth_name": "서울특별시",
			      "region_2depth_name": "강남구",
			      "region_3depth_name": "역삼동"
			    }
			  ]
			}
			""";
		KakaoLocalApiClient client = clientResponding(200, body);

		Optional<RegionInfo> result = client.coordToRegion(37.5006, 127.0366);

		assertThat(result).isPresent();
		RegionInfo region = result.get();
		assertThat(region.bCode()).isEqualTo("1168010100");
		assertThat(region.region1DepthName()).isEqualTo("서울특별시");
		assertThat(region.region2DepthName()).isEqualTo("강남구");
		assertThat(region.region3DepthName()).isEqualTo("역삼동");

		// 카카오 API 는 x=경도, y=위도 로 받는다.
		assertThat(capturedQuery.get()).contains("x=127.0366").contains("y=37.5006");
	}

	@Test
	@DisplayName("coordToRegion 은 법정동('B') 문서가 없으면 빈 결과를 반환한다")
	void coordToRegionReturnsEmptyWhenNoLegalDistrict() throws IOException {
		String body = """
			{
			  "meta": { "total_count": 1 },
			  "documents": [
			    { "region_type": "H", "code": "1168064000", "region_1depth_name": "서울특별시" }
			  ]
			}
			""";
		KakaoLocalApiClient client = clientResponding(200, body);

		assertThat(client.coordToRegion(37.5006, 127.0366)).isEmpty();
	}

	@Test
	@DisplayName("coordToRegion 은 API 호출이 실패해도 예외를 전파하지 않고 빈 결과를 반환한다")
	void coordToRegionReturnsEmptyOnError() throws IOException {
		KakaoLocalApiClient client = clientResponding(500, null);

		assertThat(client.coordToRegion(37.5006, 127.0366)).isEmpty();
	}
}
