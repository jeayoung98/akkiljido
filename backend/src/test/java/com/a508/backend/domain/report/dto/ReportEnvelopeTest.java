package com.a508.backend.domain.report.dto;

import static org.assertj.core.api.Assertions.*;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

/**
 * 봉투 직렬화 계약 검증. 봉투는 report.ai_answer 컬럼에 문자열로 저장되므로,
 * 스키마를 진화시켜도 이미 저장된 리포트를 계속 읽을 수 있어야 한다.
 */
class ReportEnvelopeTest {

	private final ObjectMapper objectMapper = JsonMapper.builder().build();

	@Test
	@DisplayName("필드를 제거한 뒤에도 그 키가 남아 있는 과거 봉투를 읽을 수 있다")
	void deserializesEnvelopeWithRemovedFields() {
		// day 는 알림에서 요일 지정을 걷어내면서 제거한 필드다. 그 이전에 저장된 리포트를 재현한다.
		String storedBeforeRemoval = """
			{
			  "period": {"start": "2026-10-12", "end": "2026-10-18"},
			  "headline": "전주 다녀오셨네요",
			  "body": ["집에서 166km 떨어진 전주까지 다녀오셨어요."],
			  "summary": {"count": 36, "placeCount": 20},
			  "recommendations": [{
			    "placeName": "스타벅스",
			    "address": "경기 수원시 팔달구 덕영대로",
			    "latitude": 37.2659,
			    "longitude": 126.9999,
			    "startTime": "14:00",
			    "endTime": "17:00",
			    "day": null,
			    "reasonShort": "오후 14~17시에 3번, 모두 23,700원",
			    "reasonMessage": "오후 14~17시쯤 스타벅스에 자주 들르시네요."
			  }]
			}
			""";

		ReportEnvelope envelope = objectMapper.readValue(storedBeforeRemoval, ReportEnvelope.class);

		assertThat(envelope.period().start()).isEqualTo(LocalDate.of(2026, 10, 12));
		assertThat(envelope.headline()).isEqualTo("전주 다녀오셨네요");
		assertThat(envelope.summary().count()).isEqualTo(36);
		assertThat(envelope.recommendations()).singleElement()
			.satisfies(item -> {
				assertThat(item.placeName()).isEqualTo("스타벅스");
				assertThat(item.startTime()).isEqualTo("14:00");
				assertThat(item.reasonShort()).contains("3번");
			});
	}

	@Test
	@DisplayName("직렬화 → 역직렬화 왕복에서 값이 보존된다")
	void roundTripPreservesValues() {
		ReportEnvelope original = new ReportEnvelope(
			new ReportEnvelope.Period(LocalDate.of(2026, 8, 3), LocalDate.of(2026, 8, 9)),
			"조용한 한 주였어요",
			List.of("첫 문단이에요.", "둘째 문단이에요."),
			new ReportEnvelope.Summary(18, 9),
			List.of(new RecommendationItem("수원역초밥", "경기 수원시", 37.2662, 127.0002,
				"19:00", "22:00", "저녁 19~22시에 31,500원", "수원역초밥에서 31,500원을 쓰셨어요.")));

		ReportEnvelope restored = objectMapper.readValue(
			objectMapper.writeValueAsString(original), ReportEnvelope.class);

		assertThat(restored).isEqualTo(original);
	}

	@Test
	@DisplayName("추천이 빈 목록인 봉투도 정상 왕복한다 — 빈 목록은 정상 상태다")
	void roundTripWithEmptyRecommendations() {
		ReportEnvelope original = new ReportEnvelope(
			new ReportEnvelope.Period(LocalDate.of(2026, 4, 6), LocalDate.of(2026, 4, 12)),
			"특별한 일 없이 지나갔어요",
			List.of("총지출은 374,800원이에요."),
			new ReportEnvelope.Summary(37, 17),
			List.of());

		ReportEnvelope restored = objectMapper.readValue(
			objectMapper.writeValueAsString(original), ReportEnvelope.class);

		assertThat(restored.recommendations()).isEmpty();
		assertThat(restored).isEqualTo(original);
	}
}
