package com.a508.backend.domain.report.manual;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.a508.backend.domain.report.entity.Report;
import com.a508.backend.domain.report.entity.ReportPeriod;
import com.a508.backend.domain.report.entity.ReportType;
import com.a508.backend.domain.report.service.Fact;
import com.a508.backend.domain.report.service.FactExtractor;
import com.a508.backend.domain.report.service.ReportBatchService;
import com.a508.backend.domain.report.service.ReportPrompt;
import com.a508.backend.domain.report.service.ReportSource;
import com.a508.backend.domain.report.service.ReportSourceLoader;
import com.a508.backend.domain.report.service.ReportStatistics;

import tools.jackson.databind.ObjectMapper;

/**
 * 실호출 수동 러너 — 로컬 시드 DB + 실제 GMS 로 대표 주들을 생성해 품질 라운드(설계 3단계)에 쓴다.
 * LLM 입력(사실 문장)과 출력(봉투)을 나란히 덤프해 수치 보존·금지어를 기계 검사할 수 있게 한다.
 * <p>
 * CI 대상이 아니다. 전제: 로컬 DB 에 seed.sql 적재 + JWT_SECRET(Base64)·GOOGLE_CLIENT_ID·GMS_KEY.
 * 같은 기간이 이미 있으면 멱등 반환되므로, 재생성 라운드 전에는 report·recommendation_log 를 비울 것.
 * 결과: build/manual-reports.txt
 * <p>
 * 평소에는 @org.junit.jupiter.api.Disabled 를 붙여 둔다 — 실행할 때만 잠시 해제.
 */
@org.junit.jupiter.api.Disabled("수동 실행 전용 — 실행 시 이 어노테이션만 잠시 제거")
@SpringBootTest
class ReportGenerationManualRunner {

	/** 대표 주(월요일 baseDate = 대상 주 다음 월요일): 사건 2 · 패턴 2 · 무난 2. */
	private static final List<LocalDate> BASE_DATES = List.of(
		LocalDate.of(2026, 10, 19),  // 사건: 전주 여행 주 (10-12~18)
		LocalDate.of(2026, 9, 28),   // 사건: 추석 주 (09-21~27, 무결제일 포함)
		LocalDate.of(2026, 6, 22),   // 패턴: 큰 결제 없음·회사 근처 (06-15~21)
		LocalDate.of(2026, 11, 16),  // 패턴: 무신사 한 건 집중 (11-09~15)
		LocalDate.of(2026, 4, 13),   // 무난: 사실 0개 (04-06~12)
		LocalDate.of(2026, 6, 8));   // 무난: 사실 0개 (06-01~07)

	@Autowired
	private ReportBatchService reportBatchService;
	@Autowired
	private ReportSourceLoader sourceLoader;
	@Autowired
	private FactExtractor factExtractor;
	@Autowired
	private ObjectMapper objectMapper;

	@Test
	void generateRepresentativeWeeks() throws Exception {
		StringBuilder out = new StringBuilder();
		for (LocalDate baseDate : BASE_DATES) {
			ReportPeriod period = ReportPeriod.previousWeek(baseDate);
			ReportSource source = sourceLoader.load(1L, period);
			ReportStatistics statistics = ReportStatistics.from(source);
			List<Fact> facts = factExtractor.selectTop(factExtractor.extractAll(source));

			out.append("═══════════ 주 ").append(period.start()).append(" ~ ").append(period.end())
				.append(" ═══════════\n");
			out.append("[LLM 입력]\n")
				.append(ReportPrompt.userMessage(ReportType.WEEKLY, period, statistics, facts));

			Report report = reportBatchService.generate(1L, ReportType.WEEKLY, baseDate);
			out.append("[산출 봉투]\n")
				.append(objectMapper.writerWithDefaultPrettyPrinter()
					.writeValueAsString(objectMapper.readTree(report.getAiAnswer())))
				.append("\n[컬럼] totalCost=").append(report.getTotalCost())
				.append(" highest=").append(report.getHighestSpendingPlace())
				.append(" mostFrequent=").append(report.getMostFrequentPlace())
				.append("\n\n");
		}
		Files.writeString(Path.of("build/manual-reports.txt"), out.toString(), StandardCharsets.UTF_8);
		System.out.println(out);
	}
}
