package com.a508.backend.global.client.llm;

import com.a508.backend.global.client.llm.dto.LlmReportContent;

/**
 * LLM 호출 + 구조 검증의 결과 객체. 예외를 던지지 않고 성공/실패를 값으로 표현한다.
 * <p>
 * 재시도(= LLM 재호출) 여부는 호출부(배치)가 결정한다 — 이 클래스는 판단하지 않는다.
 * 실패 시 LLM 원문은 이 객체에 싣지 않고 로그로 남긴다(설계 문서 §1 실패 계약).
 */
public record LlmResult(
	boolean success,
	LlmReportContent content,
	ErrorCode errorCode
) {

	public enum ErrorCode {
		/** HTTP 에러 응답(4xx/5xx) 또는 연결 실패. */
		HTTP_ERROR,
		/** 응답에 본문(choices[0].message.content)이 없음. */
		EMPTY_RESPONSE,
		/** 본문이 JSON 으로 파싱되지 않음. */
		PARSE_FAILED,
		/** JSON 은 맞지만 구조가 계약과 다름(headline 누락, body 0개 또는 5개 이상 등). */
		INVALID_STRUCTURE
	}

	public static LlmResult success(LlmReportContent content) {
		return new LlmResult(true, content, null);
	}

	public static LlmResult failure(ErrorCode errorCode) {
		return new LlmResult(false, null, errorCode);
	}
}
