package com.a508.backend.domain.home.controller;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

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

import com.a508.backend.domain.home.dto.response.CategorySummaryItem;
import com.a508.backend.domain.home.dto.response.CategorySummaryResponse;
import com.a508.backend.domain.home.dto.response.NearbyPlaceResponse;
import com.a508.backend.domain.home.dto.response.RecentExpenseResponse;
import com.a508.backend.domain.home.service.HomeService;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.global.exception.GlobalExceptionHandler;
import com.a508.backend.global.security.AuthenticatedUser;

/**
 * standalone MockMvc 기반 홈 API 컨트롤러 단위 테스트.
 * Spring 컨텍스트/DB 없이 HTTP 매핑과 JSON 계약(필드명/타입)을 고정한다.
 */
class HomeControllerTest {

	private static final Long MOCK_USER_ID = 1L;

	private final HomeService homeService = mock(HomeService.class);
	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		mockMvc = MockMvcBuilders.standaloneSetup(new HomeController(homeService))
			.setControllerAdvice(new GlobalExceptionHandler())
			.setMessageConverters(new JacksonJsonHttpMessageConverter())
			.setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
			.build();

		SecurityContextHolder.getContext().setAuthentication(
			UsernamePasswordAuthenticationToken.authenticated(new AuthenticatedUser(MOCK_USER_ID), null, List.of()));
	}

	@AfterEach
	void tearDown() {
		SecurityContextHolder.clearContext();
	}

	@Test
	@DisplayName("카테고리별 지출 조회 성공 시 categories 배열을 스펙대로 내려준다")
	void getCategorySummary_success() throws Exception {
		when(homeService.getCategorySummary(eq(MOCK_USER_ID), isNull())).thenReturn(sampleCategorySummary());

		mockMvc.perform(get("/api/v1/home/category-summary"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.categories.length()").value(2))
			.andExpect(jsonPath("$.data.categories[0].categoryId").value(3))
			.andExpect(jsonPath("$.data.categories[0].categoryName").value("음식점"))
			.andExpect(jsonPath("$.data.categories[0].amount").value(182000))
			.andExpect(jsonPath("$.data.categories[0].percent").value(37))
			.andExpect(jsonPath("$.data.categories[1].categoryId").value(11));

		verify(homeService).getCategorySummary(MOCK_USER_ID, null);
	}

	@Test
	@DisplayName("limit 파라미터를 주면 서비스로 그대로 전달된다")
	void getCategorySummary_passesLimit() throws Exception {
		when(homeService.getCategorySummary(anyLong(), any())).thenReturn(sampleCategorySummary());

		mockMvc.perform(get("/api/v1/home/category-summary").param("limit", "6"))
			.andExpect(status().isOk());

		verify(homeService).getCategorySummary(MOCK_USER_ID, 6);
	}

	@Test
	@DisplayName("limit 이 1 미만이면 400(H002)을 반환한다")
	void getCategorySummary_invalidLimit() throws Exception {
		when(homeService.getCategorySummary(anyLong(), any()))
			.thenThrow(new BusinessException(ExceptionType.INVALID_CATEGORY_LIMIT));

		mockMvc.perform(get("/api/v1/home/category-summary").param("limit", "0"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("H002"));
	}

	@Test
	@DisplayName("내 주변 지출 조회 성공 시 totalAmount 와 placeList 를 스펙대로 내려준다")
	void getRecentExpenses_success() throws Exception {
		when(homeService.getRecentNearbyExpenses(eq(MOCK_USER_ID), eq(37.5006), eq(127.0366), isNull()))
			.thenReturn(new RecentExpenseResponse(32000L, List.of(
				new NearbyPlaceResponse("서울 강남구 테헤란로 212", 37.5006, 127.0366, "스타벅스", 23000L),
				new NearbyPlaceResponse("서울 강남구 역삼로 1", 37.5010, 127.0370, "김밥천국", 9000L))));

		mockMvc.perform(get("/api/v1/home/recent-expenses")
				.param("latitude", "37.5006")
				.param("longitude", "127.0366"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.totalAmount").value(32000))
			.andExpect(jsonPath("$.data.placeList.length()").value(2))
			.andExpect(jsonPath("$.data.placeList[0].address").value("서울 강남구 테헤란로 212"))
			.andExpect(jsonPath("$.data.placeList[0].latitude").value(closeTo(37.5006, 1e-9)))
			.andExpect(jsonPath("$.data.placeList[0].longitude").value(closeTo(127.0366, 1e-9)))
			.andExpect(jsonPath("$.data.placeList[0].name").value("스타벅스"))
			.andExpect(jsonPath("$.data.placeList[0].amount").value(23000));

		// 위도/경도 인자가 뒤바뀌어 전달되는 실수를 잡는다.
		verify(homeService).getRecentNearbyExpenses(MOCK_USER_ID, 37.5006, 127.0366, null);
	}

	@Test
	@DisplayName("radius 파라미터를 주면 서비스로 그대로 전달된다")
	void getRecentExpenses_passesRadius() throws Exception {
		when(homeService.getRecentNearbyExpenses(anyLong(), anyDouble(), anyDouble(), any()))
			.thenReturn(new RecentExpenseResponse(0L, List.of()));

		mockMvc.perform(get("/api/v1/home/recent-expenses")
				.param("latitude", "37.5006")
				.param("longitude", "127.0366")
				.param("radius", "500"))
			.andExpect(status().isOk());

		verify(homeService).getRecentNearbyExpenses(MOCK_USER_ID, 37.5006, 127.0366, 500);
	}

	@Test
	@DisplayName("위도/경도가 없으면 400(C003)을 반환한다")
	void getRecentExpenses_missingCoordinate() throws Exception {
		mockMvc.perform(get("/api/v1/home/recent-expenses"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("C003"));

		verifyNoInteractions(homeService);
	}

	@Test
	@DisplayName("반경이 허용 범위를 벗어나면 400(H001)을 반환한다")
	void getRecentExpenses_invalidRadius() throws Exception {
		when(homeService.getRecentNearbyExpenses(anyLong(), anyDouble(), anyDouble(), any()))
			.thenThrow(new BusinessException(ExceptionType.INVALID_RADIUS));

		mockMvc.perform(get("/api/v1/home/recent-expenses")
				.param("latitude", "37.5006")
				.param("longitude", "127.0366")
				.param("radius", "0"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.code").value("H001"));
	}

	private CategorySummaryResponse sampleCategorySummary() {
		return CategorySummaryResponse.from(List.of(
			CategorySummaryItem.of(3L, "음식점", 182000L, 37),
			CategorySummaryItem.of(11L, "기타", 54000L, 11)));
	}
}
