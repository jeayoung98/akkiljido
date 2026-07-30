package com.a508.backend.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;

/**
 * springdoc-openapi(Swagger UI) 문서 메타데이터 설정.
 * UI: /swagger-ui.html, 스펙: /v3/api-docs (WebSecurityConfig 에서 permitAll 처리됨)
 */
@Configuration
public class OpenApiConfig {

	@Bean
	public OpenAPI openAPI() {
		return new OpenAPI().info(new Info().title("아낄맵 API").description("아낄맵 백엔드 API 문서").version("v1"));
	}
}
