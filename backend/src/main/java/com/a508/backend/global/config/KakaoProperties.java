package com.a508.backend.global.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 카카오 로컬 API 설정. application yml 의 kakao.* 프로퍼티와 바인딩된다.
 */
@ConfigurationProperties(prefix = "kakao")
public record KakaoProperties(
	String baseUrl,
	String restApiKey
) {
	public KakaoProperties {
		if (baseUrl == null || baseUrl.isBlank()) {
			baseUrl = "https://dapi.kakao.com";
		}
	}
}
