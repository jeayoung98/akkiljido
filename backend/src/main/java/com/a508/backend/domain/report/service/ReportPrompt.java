package com.a508.backend.domain.report.service;

import java.util.List;

import com.a508.backend.domain.report.entity.ReportPeriod;
import com.a508.backend.domain.report.entity.ReportType;

/**
 * LLM 프롬프트 조립 — 실호출 튜닝의 대상이 되는 유일한 파일.
 * <p>
 * 원칙(설계 문서 §4.4): LLM 은 편집자다. 사실 문장은 이미 완성문으로 주어지며, LLM 의 일은
 * 그것을 잇고 다듬는 것뿐이다. 숫자·추천·요약을 LLM 에 다시 받지 않는다.
 * 금지어 목록은 콜드 스타트 제약(§2)에서 나온다 — 과거 비교 표현은 데이터에 근거가 없다.
 * <p>
 * ⚠ developer 메시지의 "JSON" 언급은 장식이 아니다 — response_format=json_object 모드의
 * 요구사항이라 지우면 호출이 실패한다.
 */
public final class ReportPrompt {

	private ReportPrompt() {
	}

	private static final String DEVELOPER = """
		너는 가계부 앱의 소비 리포트를 쓰는 에디터다. 반드시 아래 형식의 JSON 객체로만 응답한다.
		{"headline": "한 줄 헤드라인", "body": ["문단1", "문단2"]}

		작성 규칙:
		- headline: 이번 기간을 대표하는 한 줄. 25자 이내, 마침표 없이.
		- body: 1~4개 문단. 각 문단은 1~2문장. 모바일 한 화면 분량을 넘기지 않는다.
		- 입력의 '사실 문장'에 있는 내용만 쓴다. 새로운 수치·사건·장소를 만들지 않는다.
		- 숫자·금액·횟수·지명은 입력 그대로 옮긴다. 반올림하거나 다시 계산하지 않는다.
		- 과거와 비교하는 표현을 절대 쓰지 않는다: "평소", "지난주", "지난달", "평균적으로",
		  "늘", "여느 때", "전보다", "원래". 이 기간의 데이터만 존재한다.
		- 존댓말(-요)로, 관찰한 것을 담백하게 짚어주는 톤. 과장·훈계·조언·이모지 금지.
		- 사실 문장이 없으면: 특별한 일 없이 지나간 기간이라는 것을 요약 수치로 짧게(2문단 이내) 쓴다.
		""";

	public static String developerMessage() {
		return DEVELOPER;
	}

	/** user 메시지 — 기간·요약 수치·사실 문장(추출기 산출, 완성문)을 담는다. */
	public static String userMessage(ReportType type, ReportPeriod period,
		ReportStatistics statistics, List<Fact> facts) {
		StringBuilder sb = new StringBuilder();
		sb.append(type == ReportType.WEEKLY ? "[주간 리포트]" : "[월간 리포트]")
			.append(" 기간: ").append(period.start()).append(" ~ ").append(period.end()).append('\n');
		sb.append(String.format("요약: 총지출 %,d원 · 재량 결제 %d건 · 방문 장소 %d곳%n",
			statistics.totalCost(), statistics.count(), statistics.placeCount()));

		if (facts.isEmpty()) {
			sb.append("사실 문장: 없음 (특별히 튀는 일이 없었던 기간)\n");
		} else {
			sb.append("사실 문장:\n");
			for (Fact fact : facts) {
				sb.append("- ").append(fact.text()).append('\n');
			}
		}
		return sb.toString();
	}
}
