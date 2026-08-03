package com.a508.backend.domain.report.service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.a508.backend.domain.report.dto.RecommendationItem;
import com.a508.backend.domain.report.dto.ReportEnvelope;
import com.a508.backend.domain.report.entity.Report;
import com.a508.backend.domain.report.entity.ReportPeriod;
import com.a508.backend.domain.report.entity.ReportType;
import com.a508.backend.domain.report.repository.NotificationPlaceRecommendationLogRepository;
import com.a508.backend.domain.report.repository.ReportRepository;
import com.a508.backend.domain.user.domain.User;
import com.a508.backend.domain.user.repository.UserRepository;
import com.a508.backend.global.client.llm.LlmClient;
import com.a508.backend.global.client.llm.LlmResult;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.global.util.DateTimeUtils;
import tools.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 리포트 생성 배치 — 주간은 매주 월요일 새벽(직전 월~일), 월간은 매달 1일 새벽(직전 달).
 * <p>
 * 파이프라인: 적재 → 통계 → 사실 추출·선택 → 추천 → LLM(headline/body) → 봉투 저장.
 * LLM 을 제외한 모든 산출물은 결정적이다(설계 문서 §4.4 분업표).
 * <p>
 * 실패 계약(§1): LLM 구조 검증 실패는 재호출로 {@value #MAX_LLM_ATTEMPTS}회까지 재시도하고
 * (temperature 덕에 다음 응답은 달라진다), 소진되면 <b>report row 를 만들지 않는다</b> —
 * "리포트 없음"이 실패의 표현이다. 한 사용자의 실패가 다른 사용자 생성을 막지 않는다.
 * 같은 기간 재실행은 멱등하다 — 기존 리포트를 그대로 돌려준다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReportBatchService {

	private static final int MAX_LLM_ATTEMPTS = 3;

	private final UserRepository userRepository;
	private final ReportSourceLoader sourceLoader;
	private final FactExtractor factExtractor;
	private final RecommendationExtractor recommendationExtractor;
	private final NotificationPlaceRecommendationLogRepository recommendationLogRepository;
	private final ReportRepository reportRepository;
	private final LlmClient llmClient;
	private final ReportWriter reportWriter;
	private final ObjectMapper objectMapper;

	@Scheduled(cron = "0 10 5 * * MON", zone = "Asia/Seoul")
	public void generateWeeklyReports() {
		generateForAllUsers(ReportType.WEEKLY, DateTimeUtils.today());
	}

	@Scheduled(cron = "0 30 5 1 * *", zone = "Asia/Seoul")
	public void generateMonthlyReports() {
		generateForAllUsers(ReportType.MONTHLY, DateTimeUtils.today());
	}

	private void generateForAllUsers(ReportType type, LocalDate baseDate) {
		List<User> users = userRepository.findAll();
		log.info("{} 리포트 배치 시작 — 대상 {}명", type, users.size());
		int success = 0;
		for (User user : users) {
			try {
				generate(user.getId(), type, baseDate);
				success++;
			} catch (BusinessException e) {
				// 거래 없음(R003)·LLM 실패(R002)는 그 사용자만 건너뛴다.
				log.info("리포트 생성 건너뜀 (userId={}, type={}, 사유={})",
					user.getId(), type, e.getExceptionType());
			} catch (Exception e) {
				// 예상 밖 예외도 배치 전체를 죽이지 않는다.
				log.error("리포트 생성 중 예외 (userId={}, type={})", user.getId(), type, e);
			}
		}
		log.info("{} 리포트 배치 종료 — 성공 {}/{}", type, success, users.size());
	}

	/**
	 * 사용자 1명의 직전 기간 리포트를 생성한다. 시연용 수동 트리거(컨트롤러)도 이 메서드를 쓴다.
	 * 이미 생성된 기간이면 기존 리포트를 반환한다(멱등).
	 *
	 * @throws BusinessException REPORT_NO_TRANSACTIONS(기간 내 거래 없음),
	 *                           REPORT_GENERATION_FAILED(LLM 재시도 소진)
	 */
	public Report generate(Long userId, ReportType type, LocalDate baseDate) {
		ReportPeriod period = type == ReportType.WEEKLY
			? ReportPeriod.previousWeek(baseDate)
			: ReportPeriod.previousMonth(baseDate);

		Optional<Report> existing = findExisting(userId, type, period);
		if (existing.isPresent()) {
			log.info("이미 생성된 리포트 — 기존 반환 (userId={}, {} {})", userId, type, period.start());
			return existing.get();
		}

		ReportSource source = sourceLoader.load(userId, period);
		if (source.transactions().isEmpty()) {
			throw new BusinessException(ExceptionType.REPORT_NO_TRANSACTIONS);
		}

		ReportStatistics statistics = ReportStatistics.from(source);
		List<Fact> facts = factExtractor.selectTop(factExtractor.extractAll(source));

		OffsetDateTime cooldownSince = OffsetDateTime.now(DateTimeUtils.SERVICE_ZONE)
			.minusWeeks(RecommendationExtractor.COOLDOWN_WEEKS);
		Set<String> excluded = Set.copyOf(
			recommendationLogRepository.findRecommendedPlaceNamesSince(userId, cooldownSince));
		List<RecommendationItem> recommendations = recommendationExtractor.extract(source, excluded);

		LlmResult result = callLlmWithRetry(type, period, statistics, facts, userId);
		if (!result.success()) {
			throw new BusinessException(ExceptionType.REPORT_GENERATION_FAILED);
		}

		ReportEnvelope envelope = new ReportEnvelope(
			new ReportEnvelope.Period(period.start(), period.end()),
			result.content().headline(),
			result.content().body(),
			new ReportEnvelope.Summary(statistics.count(), statistics.placeCount()),
			recommendations);

		return reportWriter.save(userId, type, statistics, envelope);
	}

	private LlmResult callLlmWithRetry(ReportType type, ReportPeriod period,
		ReportStatistics statistics, List<Fact> facts, Long userId) {
		String developerMessage = ReportPrompt.developerMessage();
		String userMessage = ReportPrompt.userMessage(type, period, statistics, facts);
		LlmResult result = LlmResult.failure(LlmResult.ErrorCode.EMPTY_RESPONSE);
		for (int attempt = 1; attempt <= MAX_LLM_ATTEMPTS; attempt++) {
			result = llmClient.generateReport(developerMessage, userMessage);
			if (result.success()) {
				return result;
			}
			log.warn("LLM 시도 {}/{} 실패 ({}) — userId={}, {} {}",
				attempt, MAX_LLM_ATTEMPTS, result.errorCode(), userId, type, period.start());
		}
		return result;
	}

	/**
	 * 같은 기간 리포트 존재 검사(멱등성). report 테이블에 기간 컬럼이 없어(발견 #145 미반영)
	 * 최신 리포트의 봉투를 역직렬화해 기간을 비교한다 — 컬럼이 추가되면 쿼리 한 줄로 바뀔 코드다.
	 */
	private Optional<Report> findExisting(Long userId, ReportType type, ReportPeriod period) {
		List<Report> recent = reportRepository.findAllByUser_IdAndTypeOrderByIdDesc(userId, type);
		if (recent.isEmpty()) {
			return Optional.empty();
		}
		Report latest = recent.get(0);
		try {
			ReportEnvelope envelope = objectMapper.readValue(latest.getAiAnswer(), ReportEnvelope.class);
			if (envelope.period() != null && period.start().equals(envelope.period().start())) {
				return Optional.of(latest);
			}
		} catch (Exception e) {
			log.warn("봉투 역직렬화 실패 — 중복 검사 생략 (reportId={})", latest.getId());
		}
		return Optional.empty();
	}
}
