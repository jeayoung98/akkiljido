package com.a508.backend.domain.transaction_history.controller;

import static org.assertj.core.api.Assertions.*;
import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.LocalDateTime;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.a508.backend.domain.transaction_history.dto.request.TransactionHistoryCreateRequest;
import com.a508.backend.domain.transaction_history.dto.response.TransactionHistoryResponse;
import com.a508.backend.domain.transaction_history.entity.TransactionType;
import com.a508.backend.domain.transaction_history.service.TransactionHistoryService;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.global.exception.GlobalExceptionHandler;
import com.a508.backend.global.security.AuthenticatedUser;

/**
 * standalone MockMvc 기반 컨트롤러 단위 테스트. Spring 컨텍스트/DB(Docker) 없이 HTTP 매핑과 JSON 계약을 검증한다.
 * 특히 payment_method(snake_case), type(enum name), datetime("yyyy-MM-dd HH:mm:ss") 형식을 고정한다.
 */
class TransactionHistoryControllerTest {

	private static final Long MOCK_USER_ID = 1L;

	private final TransactionHistoryService service = mock(TransactionHistoryService.class);
	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		// 프로덕션과 동일한 Jackson 3 기반 컨버터로 JSON 계약을 검증한다.
		mockMvc = MockMvcBuilders.standaloneSetup(new TransactionHistoryController(service))
			.setControllerAdvice(new GlobalExceptionHandler())
			.setMessageConverters(new JacksonJsonHttpMessageConverter())
			.setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
			.build();

		setAuthentication(MOCK_USER_ID);
	}

	@AfterEach
	void tearDown() {
		SecurityContextHolder.clearContext();
	}

	private void setAuthentication(Long userId) {
		UsernamePasswordAuthenticationToken authentication = UsernamePasswordAuthenticationToken.authenticated(
			new AuthenticatedUser(userId), null, java.util.List.of());

		SecurityContextHolder.getContext().setAuthentication(authentication);
	}

	private TransactionHistoryResponse sampleResponse() {
		return new TransactionHistoryResponse(
			1L,
			"스타벅스",
			15000L,
			TransactionType.EXPENSE,
			"카드",
			3L,
			LocalDateTime.of(2026, 7, 27, 15, 30, 0),
			"서울 강남구 테헤란로",
			37.5006,
			127.0366,
			"아메리카노");
	}

	private String validCreateBody() {
		return """
			{
			  "name": "스타벅스",
			  "amount": 15000,
			  "type": "EXPENSE",
			  "payment_method": "카드",
			  "category": 3,
			  "datetime": "2026-07-27 15:30:00",
			  "address": "서울 강남구 테헤란로",
			  "latitude": 37.5006,
			  "longitude": 127.0366,
			  "memo": "아메리카노"
			}
			""";
	}

	@Test
	@DisplayName("POST 등록은 200 과 { success: true } 만 반환하고 요청 필드가 올바르게 역직렬화된다")
	void create() throws Exception {
		mockMvc.perform(post("/api/v1/transaction")
				.contentType(MediaType.APPLICATION_JSON)
				.content(validCreateBody()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data").doesNotExist());

		ArgumentCaptor<TransactionHistoryCreateRequest> captor =
			ArgumentCaptor.forClass(TransactionHistoryCreateRequest.class);
		verify(service).createTransactionHistory(eq(MOCK_USER_ID), captor.capture());
		TransactionHistoryCreateRequest request = captor.getValue();

		assertThat(request.name()).isEqualTo("스타벅스");
		assertThat(request.amount()).isEqualTo(15000L);
		assertThat(request.type()).isEqualTo(TransactionType.EXPENSE);
		assertThat(request.paymentMethod()).isEqualTo("카드"); // payment_method -> paymentMethod
		assertThat(request.category()).isEqualTo(3L);
		assertThat(request.datetime()).isEqualTo(LocalDateTime.of(2026, 7, 27, 15, 30, 0));
		assertThat(request.latitude()).isEqualTo(37.5006);
		assertThat(request.longitude()).isEqualTo(127.0366);
	}

	@Test
	@DisplayName("POST 등록 시 필수 필드(name) 누락이면 400 과 코드 C002 를 반환한다")
	void createValidationFail() throws Exception {
		String invalidBody = """
			{
			  "amount": 15000,
			  "type": "EXPENSE",
			  "payment_method": "카드",
			  "category": 3,
			  "datetime": "2026-07-27 15:30:00"
			}
			""";

		mockMvc.perform(post("/api/v1/transaction")
				.contentType(MediaType.APPLICATION_JSON)
				.content(invalidBody))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("C002"));
	}

	@Test
	@DisplayName("GET 상세 조회는 API 스펙 그대로의 JSON 계약을 반환한다")
	void findOne() throws Exception {
		when(service.findOneTransactionHistoryResponse(MOCK_USER_ID, 1L)).thenReturn(sampleResponse());

		mockMvc.perform(get("/api/v1/transaction/{transactionId}", 1L))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.transactionId").value(1))
			.andExpect(jsonPath("$.data.name").value("스타벅스"))
			.andExpect(jsonPath("$.data.amount").value(15000))
			.andExpect(jsonPath("$.data.type").value("EXPENSE"))
			.andExpect(jsonPath("$.data.payment_method").value("카드"))
			.andExpect(jsonPath("$.data.category").value(3))
			.andExpect(jsonPath("$.data.datetime").value("2026-07-27 15:30:00"))
			.andExpect(jsonPath("$.data.address").value("서울 강남구 테헤란로"))
			.andExpect(jsonPath("$.data.latitude").value(closeTo(37.5006, 1e-9)))
			.andExpect(jsonPath("$.data.longitude").value(closeTo(127.0366, 1e-9)))
			.andExpect(jsonPath("$.data.memo").value("아메리카노"));
	}

	@Test
	@DisplayName("GET 상세 조회에서 없는 내역이면 404 와 코드 T001 을 반환한다")
	void findOneNotFound() throws Exception {
		when(service.findOneTransactionHistoryResponse(MOCK_USER_ID, 999L))
			.thenThrow(new BusinessException(ExceptionType.TRANSACTION_HISTORY_NOT_FOUND));

		mockMvc.perform(get("/api/v1/transaction/{transactionId}", 999L))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("T001"));
	}

	@Test
	@DisplayName("PATCH 수정은 200 과 갱신된 data 를 반환한다")
	void update() throws Exception {
		TransactionHistoryResponse updated = new TransactionHistoryResponse(
			1L, "김밥천국", 20000L, TransactionType.EXPENSE, "현금", 5L,
			LocalDateTime.of(2026, 7, 24, 9, 0, 0), "서울 강남구 역삼동", 35.1796, 129.0756, "제육덮밥");
		when(service.updateTransactionHistory(eq(MOCK_USER_ID), eq(1L), any())).thenReturn(updated);

		String updateBody = """
			{
			  "name": "김밥천국",
			  "amount": 20000,
			  "type": "EXPENSE",
			  "payment_method": "현금",
			  "category": 5,
			  "datetime": "2026-07-24 09:00:00",
			  "address": "서울 강남구 역삼동",
			  "latitude": 35.1796,
			  "longitude": 129.0756,
			  "memo": "제육덮밥"
			}
			""";

		mockMvc.perform(patch("/api/v1/transaction/{transactionId}", 1L)
				.contentType(MediaType.APPLICATION_JSON)
				.content(updateBody))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.name").value("김밥천국"))
			.andExpect(jsonPath("$.data.payment_method").value("현금"))
			.andExpect(jsonPath("$.data.category").value(5))
			.andExpect(jsonPath("$.data.datetime").value("2026-07-24 09:00:00"));
	}

	@Test
	@DisplayName("DELETE 삭제는 200 과 { success: true } 를 반환하고 서비스에 위임한다")
	void delete_() throws Exception {
		mockMvc.perform(delete("/api/v1/transaction/{transactionId}", 1L))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data").doesNotExist());

		verify(service).deleteTransactionHistory(MOCK_USER_ID, 1L);
	}
}
