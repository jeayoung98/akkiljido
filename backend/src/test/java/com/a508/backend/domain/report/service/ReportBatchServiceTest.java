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
import com.a508.backend.domain.report.dto.RecommendationItem;
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
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

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
	private final ObjectMapper objectMapper = JsonMapper.builder().build();

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

	/** 집(37.2975, 126.9730)에서 3~6km 떨어진 재량 지출. 추천 후보 조건(my_place 300m 밖·비교통·50km 내)을 만족한다. */
	private TransactionHistory expense(String name, long amount, double latitude, double longitude) {
		return TransactionHistory.builder()
			.user(user).category(food)
			.datetime(DateTimeUtils.toServiceOffset(LocalDateTime.of(2026, 10, 13, 19, 0)))
			.amount(amount).type(TransactionType.EXPENSE)
			.transactionName(name).paymentMethod("카드")
			.address("경기 수원시")
			.coordinate(GeometryUtils.toPoint(latitude, longitude))
			.build();
	}

	private ReportSource sourceWith(TransactionHistory... transactions) {
		return new ReportSource(USER_ID, ReportPeriod.previousWeek(MONDAY),
			List.of(transactions), List.of(MyPlace.create(user, "집", "수원", 37.2975, 126.9730)));
	}

	/** 거래는 있지만 금액·횟수 하한에 걸려 추천 후보가 되지 못하는 기간(1회 12,000원). */
	private ReportSource sourceWithOneTransaction() {
		return sourceWith(expense("수원역초밥", 12_000L, 37.2662, 127.0002));
	}

	/** 추천 후보 두 곳(금액 하한 3만 원을 넘는 1회 결제). 총액 순으로 인계동막창 > 수원역초밥. */
	private ReportSource sourceWithTwoCandidates() {
		return sourceWith(
			expense("인계동막창", 35_000L, 37.2875, 127.0350),
			expense("수원역초밥", 31_500L, 37.2662, 127.0002));
	}

	private void stubLlmSuccess() {
		when(llmClient.generateReport(anyString(), anyString())).thenReturn(
			LlmResult.success(new LlmReportContent("헤드라인", List.of("본문 문단입니다."))));
	}

	private List<RecommendationItem> capturedRecommendations() {
		ArgumentCaptor<ReportEnvelope> captor = ArgumentCaptor.forClass(ReportEnvelope.class);
		verify(reportWriter).save(eq(USER_ID), eq(ReportType.WEEKLY), any(), captor.capture());
		return captor.getValue().recommendations();
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
	@DisplayName("쿨다운으로 추천이 0건이면 폴백이 쿨다운을 무시하고 1건을 낸다 — 총액 1위")
	void fallbackRescuesWhenCooldownEmptiesRecommendations() {
		when(sourceLoader.load(eq(USER_ID), any())).thenReturn(sourceWithTwoCandidates());
		when(logRepository.findRecommendedPlaceNamesSince(eq(USER_ID), any()))
			.thenReturn(List.of("인계동막창", "수원역초밥"));
		stubLlmSuccess();

		service.generate(USER_ID, ReportType.WEEKLY, MONDAY);

		assertThat(capturedRecommendations())
			.extracting(RecommendationItem::placeName)
			.containsExactly("인계동막창");
	}

	@Test
	@DisplayName("쿨다운에 걸린 곳이 없으면 기본 경로로 여러 건이 나가고 폴백은 발동하지 않는다")
	void keepsNormalPathWhenNothingExcluded() {
		when(sourceLoader.load(eq(USER_ID), any())).thenReturn(sourceWithTwoCandidates());
		stubLlmSuccess();

		service.generate(USER_ID, ReportType.WEEKLY, MONDAY);

		// 폴백은 1건만 내므로, 2건이 나왔다는 것 자체가 기본 경로를 탔다는 증거다.
		assertThat(capturedRecommendations())
			.extracting(RecommendationItem::placeName)
			.containsExactly("인계동막창", "수원역초밥");
	}

	@Test
	@DisplayName("후보 자체가 없어서 0건이면 폴백도 0건 — 빈 목록은 정상 응답이다")
	void fallbackCannotRescueWhenNoCandidateExists() {
		when(sourceLoader.load(eq(USER_ID), any())).thenReturn(sourceWithOneTransaction());
		when(logRepository.findRecommendedPlaceNamesSince(eq(USER_ID), any()))
			.thenReturn(List.of("수원역초밥"));
		stubLlmSuccess();

		service.generate(USER_ID, ReportType.WEEKLY, MONDAY);

		assertThat(capturedRecommendations()).isEmpty();
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
