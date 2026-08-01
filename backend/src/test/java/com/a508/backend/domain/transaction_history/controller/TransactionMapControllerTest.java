package com.a508.backend.domain.transaction_history.controller;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.a508.backend.domain.transaction_history.dto.response.MapPlaceListResponse;
import com.a508.backend.domain.transaction_history.dto.response.MapPlaceResponse;
import com.a508.backend.domain.transaction_history.dto.response.MapRegionListResponse;
import com.a508.backend.domain.transaction_history.dto.response.MapRegionResponse;
import com.a508.backend.domain.transaction_history.dto.response.MapTransactionResponse;
import com.a508.backend.domain.transaction_history.dto.response.MyPlaceMapResponse;
import com.a508.backend.domain.transaction_history.dto.response.MyPlaceTransactionDateResponse;
import com.a508.backend.domain.transaction_history.dto.response.MyPlaceTransactionListResponse;
import com.a508.backend.domain.transaction_history.dto.response.MyPlaceTransactionResponse;
import com.a508.backend.domain.transaction_history.service.TransactionMapService;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.global.exception.GlobalExceptionHandler;
import com.a508.backend.global.security.AuthenticatedUser;

/**
 * standalone MockMvc 기반 지도 조회 컨트롤러 단위 테스트.
 * Spring 컨텍스트/DB(PostGIS) 없이 HTTP 매핑, 쿼리 파라미터 위임, JSON 계약을 검증한다.
 */
class TransactionMapControllerTest {

	private static final Long MOCK_USER_ID = 1L;

	private final TransactionMapService service = mock(TransactionMapService.class);
	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		mockMvc = MockMvcBuilders.standaloneSetup(new TransactionMapController(service))
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
			new AuthenticatedUser(userId), null, List.of());

		SecurityContextHolder.getContext().setAuthentication(authentication);
	}

	private MapTransactionResponse sampleMapTransaction() {
		return new MapTransactionResponse(101L, "스타벅스", 4100L, 3L, "음식점",
			LocalDateTime.of(2024, 7, 17, 9, 20, 10));
	}

	@Test
	@DisplayName("GET /map 은 좌표별 placeList 를 반환하고 쿼리 파라미터를 그대로 서비스에 위임한다")
	void getPlaceMap() throws Exception {
		MapPlaceListResponse response = new MapPlaceListResponse(List.of(
			new MapPlaceResponse("서울 마포구 서교동 123-4", 37.5563, 126.9236, "스타벅스, 김밥천국", 4100L, 1,
				List.of(sampleMapTransaction()))));
		when(service.getPlaceMap(eq(MOCK_USER_ID), anyDouble(), anyDouble(), anyDouble(), anyDouble(),
			any(), any(), any())).thenReturn(response);

		mockMvc.perform(get("/api/v1/transaction/map")
				.param("south", "37.4900")
				.param("west", "126.9100")
				.param("north", "37.5700")
				.param("east", "127.0500")
				.param("startDate", "2024-07-15")
				.param("endDate", "2024-07-21")
				.param("categoryId", "3"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.placeList[0].address").value("서울 마포구 서교동 123-4"))
			.andExpect(jsonPath("$.data.placeList[0].latitude").value(closeTo(37.5563, 1e-9)))
			.andExpect(jsonPath("$.data.placeList[0].longitude").value(closeTo(126.9236, 1e-9)))
			.andExpect(jsonPath("$.data.placeList[0].name").value("스타벅스, 김밥천국"))
			.andExpect(jsonPath("$.data.placeList[0].amount").value(4100))
			.andExpect(jsonPath("$.data.placeList[0].transactionCount").value(1))
			.andExpect(jsonPath("$.data.placeList[0].transactionList[0].transactionId").value(101))
			.andExpect(jsonPath("$.data.placeList[0].transactionList[0].categoryName").value("음식점"))
			.andExpect(jsonPath("$.data.placeList[0].transactionList[0].datetime").value("2024-07-17 09:20:10"));

		verify(service).getPlaceMap(MOCK_USER_ID, 37.49, 126.91, 37.57, 127.05, "2024-07-15", "2024-07-21", 3L);
	}

	@Test
	@DisplayName("GET /map 에서 좌표를 누락하면 컨트롤러 진입 전에 400 과 코드 C003 을 반환한다")
	void getPlaceMapWithoutBounds() throws Exception {
		mockMvc.perform(get("/api/v1/transaction/map"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("C003"));

		verifyNoInteractions(service);
	}

	@Test
	@DisplayName("GET /map 에서 좌표 범위가 뒤집혀 있으면 400 과 코드 T006 을 반환한다")
	void getPlaceMapWithInvalidBounds() throws Exception {
		when(service.getPlaceMap(eq(MOCK_USER_ID), anyDouble(), anyDouble(), anyDouble(), anyDouble(),
			any(), any(), any())).thenThrow(new BusinessException(ExceptionType.INVALID_MAP_BOUNDS));

		mockMvc.perform(get("/api/v1/transaction/map")
				.param("south", "37.5700")
				.param("west", "126.9100")
				.param("north", "37.4900")
				.param("east", "127.0500"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("T006"));
	}

	@Test
	@DisplayName("GET /map/{depth} 는 행정구역별 transactionList 를 반환한다")
	void getRegionMap() throws Exception {
		MapRegionListResponse response = new MapRegionListResponse(List.of(
			new MapRegionResponse(37.5563, 126.9236, "마포구", 180000L, 2,
				List.of(sampleMapTransaction()))));
		when(service.getRegionMap(eq(MOCK_USER_ID), eq(2), anyDouble(), anyDouble(), anyDouble(), anyDouble(),
			any(), any(), any())).thenReturn(response);

		mockMvc.perform(get("/api/v1/transaction/map/{depth}", 2)
				.param("south", "37.4900")
				.param("west", "126.9100")
				.param("north", "37.5700")
				.param("east", "127.0500"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.transactionList[0].address").doesNotExist())
			.andExpect(jsonPath("$.data.transactionList[0].depthName").value("마포구"))
			.andExpect(jsonPath("$.data.transactionList[0].amount").value(180000))
			.andExpect(jsonPath("$.data.transactionList[0].transactionCount").value(2))
			.andExpect(jsonPath("$.data.transactionList[0].placeList[0].name").value("스타벅스"));
	}

	@Test
	@DisplayName("GET /map/{depth} 에서 지원하지 않는 depth 면 400 과 코드 T007 을 반환한다")
	void getRegionMapWithInvalidDepth() throws Exception {
		when(service.getRegionMap(eq(MOCK_USER_ID), eq(4), anyDouble(), anyDouble(), anyDouble(), anyDouble(),
			any(), any(), any())).thenThrow(new BusinessException(ExceptionType.INVALID_MAP_DEPTH));

		mockMvc.perform(get("/api/v1/transaction/map/{depth}", 4)
				.param("south", "37.4900")
				.param("west", "126.9100")
				.param("north", "37.5700")
				.param("east", "127.0500"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("T007"));
	}

	@Test
	@DisplayName("GET /map/my-place 는 depth 매핑에 걸리지 않고 내 장소 배열을 그대로 data 로 반환한다")
	void getMyPlaceMap() throws Exception {
		when(service.getMyPlaceMap(MOCK_USER_ID, null, null)).thenReturn(List.of(
			new MyPlaceMapResponse(1L, "집", "서울 마포구 서교동 123-4", 37.5563, 126.9236, 0L),
			new MyPlaceMapResponse(2L, "회사", "서울 강남구 역삼동 456-7", 37.5007, 127.0365, 180000L)));

		mockMvc.perform(get("/api/v1/transaction/map/my-place"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data", hasSize(2)))
			.andExpect(jsonPath("$.data[0].placeId").value(1))
			.andExpect(jsonPath("$.data[0].myPlaceName").value("집"))
			.andExpect(jsonPath("$.data[0].totalAmount").value(0))
			.andExpect(jsonPath("$.data[1].myPlaceName").value("회사"))
			.andExpect(jsonPath("$.data[1].totalAmount").value(180000));
	}

	@Test
	@DisplayName("GET /map/my-place/{placeId} 는 항목별로 묶인 dateList 를 반환한다")
	void getMyPlaceDetail() throws Exception {
		MyPlaceTransactionListResponse response = new MyPlaceTransactionListResponse(List.of(
			new MyPlaceTransactionResponse("스타벅스", 3L, "음식점", 37.5563, 126.9236, 4100L, List.of(
				new MyPlaceTransactionDateResponse(1L, LocalDateTime.of(2024, 7, 17, 9, 20, 10), 2460L),
				new MyPlaceTransactionDateResponse(2L, LocalDateTime.of(2024, 7, 18, 11, 20, 10), 1640L)))));
		when(service.getMyPlaceDetail(MOCK_USER_ID, 1L, "2024-07-15", "2024-07-21")).thenReturn(response);

		mockMvc.perform(get("/api/v1/transaction/map/my-place/{placeId}", 1L)
				.param("startDate", "2024-07-15")
				.param("endDate", "2024-07-21"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.transactionList[0].name").value("스타벅스"))
			.andExpect(jsonPath("$.data.transactionList[0].categoryId").value(3))
			.andExpect(jsonPath("$.data.transactionList[0].categoryName").value("음식점"))
			.andExpect(jsonPath("$.data.transactionList[0].amount").value(4100))
			.andExpect(jsonPath("$.data.transactionList[0].dateList", hasSize(2)))
			.andExpect(jsonPath("$.data.transactionList[0].dateList[0].transactionId").value(1))
			.andExpect(jsonPath("$.data.transactionList[0].dateList[0].datetime").value("2024-07-17 09:20:10"))
			.andExpect(jsonPath("$.data.transactionList[0].dateList[0].amount").value(2460))
			.andExpect(jsonPath("$.data.transactionList[0].dateList[1].amount").value(1640));
	}

	@Test
	@DisplayName("GET /map/my-place/{placeId} 에서 없는 장소면 404 와 코드 P002 를 반환한다")
	void getMyPlaceDetailNotFound() throws Exception {
		when(service.getMyPlaceDetail(eq(MOCK_USER_ID), eq(999L), any(), any()))
			.thenThrow(new BusinessException(ExceptionType.MY_PLACE_NOT_FOUND));

		mockMvc.perform(get("/api/v1/transaction/map/my-place/{placeId}", 999L))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("P002"));
	}
}
