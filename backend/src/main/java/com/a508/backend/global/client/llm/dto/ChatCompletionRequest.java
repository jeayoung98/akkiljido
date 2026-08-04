package com.a508.backend.global.client.llm.dto;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * OpenAI 호환 chat completions 요청(GMS 프록시 경유).
 * response_format 을 json_object 로 고정해 JSON 응답을 강제한다 —
 * 이 모드는 프롬프트에 "JSON" 언급이 있어야 하므로 developer 메시지에 반드시 포함할 것.
 */
public record ChatCompletionRequest(
	String model,
	List<Message> messages,
	@JsonProperty("response_format") Map<String, String> responseFormat
) {
	public record Message(String role, String content) {
	}

	public static ChatCompletionRequest of(String model, String developerMessage, String userMessage) {
		return new ChatCompletionRequest(
			model,
			List.of(
				new Message("developer", developerMessage),
				new Message("user", userMessage)),
			Map.of("type", "json_object"));
	}
}
