package com.a508.backend.global.client.llm.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * LLM 이 생성하는 유일한 산출물 — 헤드라인과 본문 문단.
 * 이 두 필드 외의 리포트 내용(수치·추천·요약)은 전부 추출기가 결정적으로 계산한다(설계 문서 §4.4).
 * 숫자를 LLM 에 다시 받으면 왜곡 통로만 생기므로 필드를 늘리지 말 것.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record LlmReportContent(
	String headline,
	List<String> body
) {
}
