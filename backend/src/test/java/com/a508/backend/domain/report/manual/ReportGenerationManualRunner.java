package com.a508.backend.domain.report.manual;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.a508.backend.domain.report.entity.Report;
import com.a508.backend.domain.report.entity.ReportType;
import com.a508.backend.domain.report.service.ReportBatchService;
import tools.jackson.databind.ObjectMapper;

/**
 * 실호출 수동 러너 — 로컬 시드 DB + 실제 GMS 로 파이프라인 전 구간을 돌려 리포트 실물을 뽑는다.
 * <p>
 * CI 대상이 아니다. 실행 전제: docker compose 로컬 DB 에 seed.sql 적재, 환경변수
 * JWT_SECRET(Base64)·GOOGLE_CLIENT_ID·GMS_KEY. 프롬프트 튜닝(설계 문서 3단계) 라운드에서
 * baseDate 를 바꿔가며 대표 주를 생성하는 데 쓴다. 결과는 build/manual-report.json.
 * <p>
 * 평소에는 @org.junit.jupiter.api.Disabled 를 붙여 둔다 — 실행할 때만 잠시 해제.
 */
@org.junit.jupiter.api.Disabled("수동 실행 전용 — 실행 시 이 어노테이션만 잠시 제거")
@SpringBootTest
class ReportGenerationManualRunner {

	@Autowired
	private ReportBatchService reportBatchService;

	@Autowired
	private ObjectMapper objectMapper;

	@Test
	void generateWeeklyReport() throws Exception {
		LocalDate baseDate = LocalDate.of(2026, 8, 3); // 직전 완결 주 = 2026-07-27 ~ 08-02

		Report report = reportBatchService.generate(1L, ReportType.WEEKLY, baseDate);

		String pretty = objectMapper.writerWithDefaultPrettyPrinter()
			.writeValueAsString(objectMapper.readTree(report.getAiAnswer()));
		String out = String.format("reportId=%d%ntype=%s%ntotalCost=%d%nhighest=%s%nmostFrequent=%s%n%s%n",
			report.getId(), report.getType(), report.getTotalCost(),
			report.getHighestSpendingPlace(), report.getMostFrequentPlace(), pretty);

		Files.writeString(Path.of("build/manual-report.json"), out, StandardCharsets.UTF_8);
		System.out.println(out);
	}
}
