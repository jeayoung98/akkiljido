package com.a508.backend.domain.report.service;

/**
 * 리포트 사실 카드 1장. 추출기 템플릿이 만든 완성 문장이며, LLM 은 이것을 엮기만 한다(설계 문서 §4.4).
 *
 * @param axis 계산 근거 축(절대/요일/집중/카테고리/시간/시퀀스/금액/공간). 같은 축 사실은 같은 얘기의
 *             다른 표현이기 쉬워 선택 단계에서 축당 1개로 제한한다(§4.3)
 * @param tier 3=비교 없이 자명한 절대 사실, 2=자명한 내부 비율, 1=개수 서술(약함)
 */
public record Fact(String axis, String name, int tier, String text) {
}
