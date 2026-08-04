package com.a508.backend.global.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * GMS(SSAFY LLM 프록시) 설정. application yml 의 gms.* 프로퍼티와 바인딩된다.
 * api-key 는 GMS_KEY 환경변수로 주입한다(기본값 없음 — 빈 값이면 호출 시점에 실패한다).
 */
@ConfigurationProperties(prefix = "gms")
public record GmsProperties(
	String baseUrl,
	String apiKey,
	String model
) {
	public GmsProperties {
		if (baseUrl == null || baseUrl.isBlank()) {
			baseUrl = "https://gms.ssafy.io/gmsapi/api.openai.com/v1";
		}
		if (model == null || model.isBlank()) {
			model = "gpt-5.4-mini";
		}
	}
}
