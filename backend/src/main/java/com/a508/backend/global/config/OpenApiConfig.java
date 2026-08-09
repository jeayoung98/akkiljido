package com.a508.backend.global.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;

/**
 * springdoc-openapi(Swagger UI) 문서 메타데이터 설정.
 * UI: /swagger-ui.html, 스펙: /v3/api-docs (SecurityConfig 에서 permitAll 처리됨)
 */
@Configuration
public class OpenApiConfig {

	/**
	 * Swagger UI 의 "Try it out" 이 요청을 보낼 서버 URL.
	 * <p>
	 * 기본값 "/" 는 상대 경로라 Swagger UI 가 현재 페이지의 origin 을 그대로 사용한다.
	 * springdoc 이 요청 정보로 서버 URL 을 추론하면 nginx(HTTPS) 뒤에서 http 스킴이 박혀
	 * 혼합 콘텐츠로 차단되는데, 상대 경로를 명시하면 그 문제가 원천 차단된다.
	 * 별도 도메인으로 노출해야 하면 app.server-url 프로퍼티로 절대 URL 을 주입한다.
	 */
	@Value("${app.server-url:/}")
	private String serverUrl;

	@Bean
	public OpenAPI openAPI() {
		return new OpenAPI().servers(List.of(new Server().url(serverUrl)))
			.info(new Info().title("아낄맵 API").description("아낄맵 백엔드 API 문서").version("v1"));
	}
}
