package com.a508.backend.domain.report.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.a508.backend.domain.category.entity.Category;
import com.a508.backend.domain.mypage.domain.MyPlace;
import com.a508.backend.domain.report.dto.ReportEnvelope;
import com.a508.backend.domain.report.entity.ReportPeriod;
import com.a508.backend.domain.report.entity.ReportType;
import com.a508.backend.domain.report.repository.NotificationPlaceRecommendationLogRepository;
import com.a508.backend.domain.report.repository.ReportRepository;
import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.domain.transaction_history.entity.TransactionType;
import com.a508.backend.domain.user.domain.User;
import com.a508.backend.domain.user.repository.UserRepository;
import com.a508.backend.global.client.llm.LlmClient;
import com.a508.backend.global.client.llm.LlmResult;
import com.a508.backend.global.client.llm.dto.LlmReportContent;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.global.util.DateTimeUtils;
import com.a508.backend.global.util.GeometryUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import org.mockito.ArgumentCaptor;

/** 배치 오케스트레이션 검증 — LLM 성공/재시도 소진/거래 없음/멱등 경로. */
class ReportBatchServiceTest {

	private static final Long USER_ID = 1L;
	private static final LocalDate MONDAY = LocalDate.of(2026, 10, 19); // 직전 주 = 10-12 ~ 10-18

	private final UserRepository userRepository = mock(UserRepository.class);
	private final ReportSourceLoader sourceLoader = mock(ReportSourceLoader.class);
	private final NotificationPlaceRecommendationLogRepository logRepository =
		mock(NotificationPlaceRecommendationLogRepository.class);
	private final ReportRepository reportRepository = mock(ReportRepository.class);
	private final LlmClient llmClient = mock(LlmClient.class);
	private final ReportWriter reportWriter = mock(ReportWriter.class);
	private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

	private final ReportBatchService service = new ReportBatchService(
		userRepository, sourceLoader, new FactExtractor(), new RecommendationExtractor(),
		logRepository, reportRepository, llmClient, reportWriter, objectMapper);

	private final User user = User.createGoogleGuest("test-sub");
	private final Category food = Category.builder().user(user).name("음식점").build();

	@BeforeEach
	void setUp() {
		when(reportRepository.findAllByUser_IdAndTypeOrderByIdDesc(eq(USER_ID), any()))
			.thenReturn(List.of());
		when(logRepository.findRecommendedPlaceNamesSince(eq(USER_ID), any()))
			.thenReturn(List.of());
	}

	private ReportSource sourceWithOneTransaction() {
		ReportPeriod period = ReportPeriod.previousWeek(MONDAY);
		TransactionHistory tx = TransactionHistory.builder()
			.user(user).category(food)
			.datetime(DateTimeUtils.toServiceOffset(LocalDateTime.of(2026, 10, 13, 12, 0)))
			.amount(12_000L).type(TransactionType.EXPENSE)
			.transactionName("수원역초밥").paymentMethod("카드")
			.coordinate(GeometryUtils.toPoint(37.2662, 127.0002))
			.build();
		return new ReportSource(USER_ID, period,
			List.of(tx), List.of(MyPlace.create(user, "집", "수원", 37.2975, 126.9730)));
	}

	@Test
	@DisplayName("LLM 성공 시 봉투(기간·본문·요약)를 조립해 저장한다")
	void savesEnvelopeOnLlmSuccess() {
		when(sourceLoader.load(eq(USER_ID), any())).thenReturn(sourceWithOneTransaction());
		when(llmClient.generateReport(anyString(), anyString())).thenReturn(
			LlmResult.success(new LlmReportContent("조용한 한 주였어요", List.of("본문 문단입니다."))));

		service.generate(USER_ID, ReportType.WEEKLY, MONDAY);

		ArgumentCaptor<ReportEnvelope> captor = ArgumentCaptor.forClass(ReportEnvelope.class);
		verify(reportWriter).save(eq(USER_ID), eq(ReportType.WEEKLY), any(), captor.capture());
		ReportEnvelope envelope = captor.getValue();
		assertThat(envelope.period().start()).isEqualTo(LocalDate.of(2026, 10, 12));
		assertThat(envelope.period().end()).isEqualTo(LocalDate.of(2026, 10, 18));
		assertThat(envelope.headline()).isEqualTo("조용한 한 주였어요");
		assertThat(envelope.summary().count()).isEqualTo(1);
	}

	@Test
	@DisplayName("LLM 이 3회 연속 실패하면 저장 없이 REPORT_GENERATION_FAILED — row 미생성이 실패의 표현")
	void doesNotSaveWhenLlmExhausted() {
		when(sourceLoader.load(eq(USER_ID), any())).thenReturn(sourceWithOneTransaction());
		when(llmClient.generateReport(anyString(), anyString()))
			.thenReturn(LlmResult.failure(LlmResult.ErrorCode.INVALID_STRUCTURE));

		assertThatThrownBy(() -> service.generate(USER_ID, ReportType.WEEKLY, MONDAY))
			.isInstanceOf(BusinessException.class)
			.extracting(e -> ((BusinessException)e).getExceptionType())
			.isEqualTo(ExceptionType.REPORT_GENERATION_FAILED);

		verify(llmClient, times(3)).generateReport(anyString(), anyString());
		verify(reportWriter, never()).save(any(), any(), any(), any());
	}

	@Test
	@DisplayName("기간 내 거래가 없으면 LLM 을 호출하지 않고 REPORT_NO_TRANSACTIONS")
	void skipsWhenNoTransactions() {
		ReportPeriod period = ReportPeriod.previousWeek(MONDAY);
		when(sourceLoader.load(eq(USER_ID), any()))
			.thenReturn(new ReportSource(USER_ID, period, List.of(), List.of()));

		assertThatThrownBy(() -> service.generate(USER_ID, ReportType.WEEKLY, MONDAY))
			.isInstanceOf(BusinessException.class)
			.extracting(e -> ((BusinessException)e).getExceptionType())
			.isEqualTo(ExceptionType.REPORT_NO_TRANSACTIONS);

		verifyNoInteractions(llmClient);
	}
}
