package com.a508.backend.global.client.llm.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * OpenAI 호환 chat completions 응답 매핑. 본문 텍스트(choices[0].message.content)만 사용한다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ChatCompletionResponse(
	List<Choice> choices
) {
	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Choice(Message message) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Message(String content) {
	}

	/** 첫 번째 응답 본문. 없으면 null. */
	public String firstContent() {
		if (choices == null || choices.isEmpty()) {
			return null;
		}
		Choice first = choices.get(0);
		if (first == null || first.message() == null) {
			return null;
		}
		return first.message().content();
	}
}
