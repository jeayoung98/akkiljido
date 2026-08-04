package com.a508.backend.global.client.llm;

import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import com.a508.backend.global.client.llm.dto.ChatCompletionRequest;
import com.a508.backend.global.client.llm.dto.ChatCompletionResponse;
import com.a508.backend.global.client.llm.dto.LlmReportContent;
import com.a508.backend.global.config.GmsProperties;
import com.fasterxml.jackson.core.JacksonException;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.extern.slf4j.Slf4j;

/**
 * GMS(SSAFY 프록시) 경유 LLM 클라이언트. 리포트 본문(headline/body) 생성 전용이다.
 * <p>
 * 역할 경계(설계 문서 §1 실패 계약):
 * 호출 → 파싱 → <b>구조 검증</b>까지가 이 클래스의 몫이고, 결과를 {@link LlmResult} 로 반환한다.
 * 내용 검증(금지어·수치 대조)은 하지 않는다 — 품질은 프롬프트 수준에서 관리한다.
 * 재시도는 호출부(배치) 책임이며, 실패 시 LLM 원문은 로그로만 남긴다.
 */
@Slf4j
@Component
public class LlmClient {

	private static final String CHAT_COMPLETIONS_PATH = "/chat/completions";
	private static final int MAX_BODY_PARAGRAPHS = 4;

	private final RestClient restClient;
	private final GmsProperties properties;
	private final ObjectMapper objectMapper;

	public LlmClient(GmsProperties properties, ObjectMapper objectMapper) {
		this.properties = properties;
		this.objectMapper = objectMapper;
		this.restClient = RestClient.builder()
			.baseUrl(properties.baseUrl())
			.defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + properties.apiKey())
			.defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
			.build();
	}

	/**
	 * 리포트 본문을 생성한다. developer 메시지에 문체·금지어·분량 규칙을, user 메시지에
	 * 사실 카드와 요약 수치를 담는다. response_format=json_object 로 JSON 응답을 강제하므로
	 * developer 메시지에 "JSON" 언급이 반드시 포함되어야 한다.
	 */
	public LlmResult generateReport(String developerMessage, String userMessage) {
		ChatCompletionResponse response;
		try {
			response = restClient.post()
				.uri(CHAT_COMPLETIONS_PATH)
				.body(ChatCompletionRequest.of(properties.model(), developerMessage, userMessage))
				.retrieve()
				.body(ChatCompletionResponse.class);
		} catch (RestClientResponseException e) {
			log.warn("LLM 호출 실패 status={} body={}", e.getStatusCode(), e.getResponseBodyAsString());
			return LlmResult.failure(LlmResult.ErrorCode.HTTP_ERROR);
		} catch (RestClientException e) {
			log.warn("LLM 호출 실패(연결/역직렬화): {}", e.toString());
			return LlmResult.failure(LlmResult.ErrorCode.HTTP_ERROR);
		}

		String content = response == null ? null : response.firstContent();
		if (content == null || content.isBlank()) {
			log.warn("LLM 응답에 본문이 없음");
			return LlmResult.failure(LlmResult.ErrorCode.EMPTY_RESPONSE);
		}

		LlmReportContent parsed;
		try {
			parsed = objectMapper.readValue(content, LlmReportContent.class);
		} catch (JacksonException e) {
			log.warn("LLM 응답 JSON 파싱 실패: {} / 원문={}", e.getOriginalMessage(), content);
			return LlmResult.failure(LlmResult.ErrorCode.PARSE_FAILED);
		}

		if (!isValidStructure(parsed)) {
			log.warn("LLM 응답 구조 검증 실패: 원문={}", content);
			return LlmResult.failure(LlmResult.ErrorCode.INVALID_STRUCTURE);
		}

		return LlmResult.success(parsed);
	}

	/** 구조 검증: headline 비어 있지 않음 + body 1~4개 문단, 각 문단 비어 있지 않음. */
	private boolean isValidStructure(LlmReportContent content) {
		if (content.headline() == null || content.headline().isBlank()) {
			return false;
		}
		List<String> body = content.body();
		if (body == null || body.isEmpty() || body.size() > MAX_BODY_PARAGRAPHS) {
			return false;
		}
		return body.stream().allMatch(paragraph -> paragraph != null && !paragraph.isBlank());
	}
}
