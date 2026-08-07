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
 * 실호출 수동 러너 — 로컬 시드 DB + 실제 GMS 로 리포트를 생성한다.
 * LLM 입력(사실 문장)과 출력(봉투)을 나란히 덤프해 수치 보존·금지어를 기계 검사할 수 있게 한다.
 * <p>
 * CI 대상이 아니다. 전제:
 * <ul>
 *   <li>로컬 DB 에 {@code seed.sql} 적재 — 이제 <b>기존 계정에 붙이는 방식</b>이라 먼저 앱에 로그인해
 *       계정을 만든 뒤 {@code -v TARGET_USER_ID=<id>} 로 넣어야 한다. 그 id 를 아래 {@link #TARGET_USER_ID}
 *       에도 같은 값으로 맞출 것</li>
 *   <li>환경변수 JWT_SECRET(Base64)·GOOGLE_CLIENT_ID·KAKAO_API_KEY·GMS_KEY</li>
 * </ul>
 * <p>
 * ⚠ 재생성 전에는 report·recommendation_log 를 비울 것. 멱등 검사({@code findExisting})가
 * <b>해당 타입의 가장 최근 1건만</b> 비교하므로, 과거 기간을 소급 생성하면 중복 행이 쌓인다
 * (운영 배치는 늘 직전 기간만 만들어서 정상 경로에서는 문제가 없다).
 * <p>
 * 평소에는 @org.junit.jupiter.api.Disabled 를 붙여 둔다 — 실행할 때만 잠시 해제.
 */
@org.junit.jupiter.api.Disabled("수동 실행 전용 — 실행 시 이 어노테이션만 잠시 제거")
@SpringBootTest
class ReportGenerationManualRunner {

	/** 리포트를 생성할 대상 사용자. seed.sql 을 적재한 TARGET_USER_ID 와 같아야 한다. */
	private static final long TARGET_USER_ID = 1L;

	/** 대표 주(월요일 baseDate = 대상 주 다음 월요일): 사건 2 · 패턴 2 · 무난 2. */
	private static final List<LocalDate> BASE_DATES = List.of(
		LocalDate.of(2026, 10, 19),  // 사건: 전주 여행 주 (10-12~18)
		LocalDate.of(2026, 9, 28),   // 사건: 추석 주 (09-21~27, 무결제일 포함)
		LocalDate.of(2026, 6, 22),   // 패턴: 큰 결제 없음·회사 근처 (06-15~21)
		LocalDate.of(2026, 11, 16),  // 패턴: 무신사 한 건 집중 (11-09~15)
		LocalDate.of(2026, 4, 13),   // 무난: 사실 0개 (04-06~12)
		LocalDate.of(2026, 6, 8));   // 무난: 사실 0개 (06-01~07)

	/**
	 * 시연 시드용 생성 목록 — 주간 8건(2026-06-08 ~ 07-26) + 월간 2건(6월·7월).
	 * <p>
	 * <b>배열 순서 = 배치가 실제로 돌았을 순서(baseDate 오름차순)</b>이며, 두 가지 이유로 중요하다.
	 * ① 추천 쿨다운({@code notification_place_recommendation_log})이 누적되므로 생성 순서가 결과를 바꾼다.
	 * ② report 테이블에 기간 컬럼이 없어 목록 조회가 id 역순이다 — 시간순으로 넣어야 최신이 위로 온다.
	 * <p>
	 * 6월 첫 주(06-01~07)는 사실이 0건이라 제외했다.
	 */
	private static final List<Target> DEMO_TARGETS = List.of(
		new Target(ReportType.WEEKLY, LocalDate.of(2026, 6, 15)),   // 주 06-08~14
		new Target(ReportType.WEEKLY, LocalDate.of(2026, 6, 22)),   // 주 06-15~21
		new Target(ReportType.WEEKLY, LocalDate.of(2026, 6, 29)),   // 주 06-22~28
		new Target(ReportType.MONTHLY, LocalDate.of(2026, 7, 1)),   // 월간 6월
		new Target(ReportType.WEEKLY, LocalDate.of(2026, 7, 6)),    // 주 06-29~07-05
		new Target(ReportType.WEEKLY, LocalDate.of(2026, 7, 13)),   // 주 07-06~12
		new Target(ReportType.WEEKLY, LocalDate.of(2026, 7, 20)),   // 주 07-13~19
		new Target(ReportType.WEEKLY, LocalDate.of(2026, 7, 27)),   // 주 07-20~26
		new Target(ReportType.MONTHLY, LocalDate.of(2026, 8, 1)),   // 월간 7월
		new Target(ReportType.WEEKLY, LocalDate.of(2026, 8, 3)));   // 주 07-27~08-02

	private record Target(ReportType type, LocalDate baseDate) {
	}

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
			out.append(generateOne(ReportType.WEEKLY, baseDate));
		}
		Files.writeString(Path.of("build/manual-reports.txt"), out.toString(), StandardCharsets.UTF_8);
		System.out.println(out);
	}

	/** 시연 시드 생성 — DEMO_TARGETS 를 순서대로 돌려 DB 에 적재하고 덤프를 남긴다. */
	@Test
	void generateDemoSeed() throws Exception {
		StringBuilder out = new StringBuilder();
		for (Target target : DEMO_TARGETS) {
			out.append(generateOne(target.type(), target.baseDate()));
		}
		Files.writeString(Path.of("build/demo-seed-reports.txt"), out.toString(), StandardCharsets.UTF_8);
		System.out.println(out);
	}

	private String generateOne(ReportType type, LocalDate baseDate) {
		ReportPeriod period = type == ReportType.WEEKLY
			? ReportPeriod.previousWeek(baseDate)
			: ReportPeriod.previousMonth(baseDate);
		ReportSource source = sourceLoader.load(TARGET_USER_ID, period);
		ReportStatistics statistics = ReportStatistics.from(source);
		List<Fact> facts = factExtractor.selectTop(factExtractor.extractAll(source));

		StringBuilder out = new StringBuilder();
		out.append("═══════════ ").append(type == ReportType.WEEKLY ? "주 " : "월 ")
			.append(period.start()).append(" ~ ").append(period.end()).append(" ═══════════\n");
		out.append("[사실 후보 ").append(factExtractor.extractAll(source).size()).append("건 중 선택 ")
			.append(facts.size()).append("건]\n");
		out.append("[LLM 입력]\n").append(ReportPrompt.userMessage(type, period, statistics, facts));

		Report report = reportBatchService.generate(TARGET_USER_ID, type, baseDate);
		out.append("[산출 봉투]\n")
			.append(objectMapper.writerWithDefaultPrettyPrinter()
				.writeValueAsString(objectMapper.readTree(report.getAiAnswer())))
			.append("\n[컬럼] totalCost=").append(report.getTotalCost())
			.append(" highest=").append(report.getHighestSpendingPlace())
			.append(" mostFrequent=").append(report.getMostFrequentPlace())
			.append("\n\n");
		return out.toString();
	}
}
