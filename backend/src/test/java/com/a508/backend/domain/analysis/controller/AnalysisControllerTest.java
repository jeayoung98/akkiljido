package com.a508.backend.domain.analysis.controller;

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

import com.a508.backend.domain.analysis.dto.response.CategoryAnalysisResponse;
import com.a508.backend.domain.analysis.dto.response.CategoryExpenseResponse;
import com.a508.backend.domain.analysis.service.AnalysisService;
import com.a508.backend.global.exception.GlobalExceptionHandler;
import com.a508.backend.global.security.AuthenticatedUser;

/** 월별 카테고리 지출 분석 API의 매핑, 응답 형식과 요청값 검증을 확인한다. */
class AnalysisControllerTest {

    private static final Long USER_ID = 1L;

    private final AnalysisService analysisService = mock(AnalysisService.class);
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new AnalysisController(analysisService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new JacksonJsonHttpMessageConverter())
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();

        setAuthentication(USER_ID);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("GET 카테고리 분석은 총지출과 카테고리별 금액 및 비율을 공통 성공 응답으로 반환한다")
    void getCategoryAnalysis() throws Exception {
        CategoryAnalysisResponse response = new CategoryAnalysisResponse(
                490000L,
                List.of(
                        new CategoryExpenseResponse(3L, "음식점", 182000L, 37),
                        new CategoryExpenseResponse(5L, "쇼핑", 254000L, 52),
                        new CategoryExpenseResponse(11L, "기타", 54000L, 11)));

        when(analysisService.getCategoryAnalysis(USER_ID, 2024, 7)).thenReturn(response);

        mockMvc.perform(get("/api/v1/analysis/category")
                        .param("year", "2024")
                        .param("month", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalAmount").value(490000))
                .andExpect(jsonPath("$.data.categories[0].categoryId").value(3))
                .andExpect(jsonPath("$.data.categories[0].categoryName").value("음식점"))
                .andExpect(jsonPath("$.data.categories[0].amount").value(182000))
                .andExpect(jsonPath("$.data.categories[0].percent").value(37))
                .andExpect(jsonPath("$.data.categories[1].categoryId").value(5))
                .andExpect(jsonPath("$.data.categories[1].categoryName").value("쇼핑"))
                .andExpect(jsonPath("$.data.categories[1].amount").value(254000))
                .andExpect(jsonPath("$.data.categories[1].percent").value(52))
                .andExpect(jsonPath("$.data.categories[2].categoryId").value(11))
                .andExpect(jsonPath("$.data.categories[2].categoryName").value("기타"))
                .andExpect(jsonPath("$.data.categories[2].amount").value(54000))
                .andExpect(jsonPath("$.data.categories[2].percent").value(11));

        verify(analysisService).getCategoryAnalysis(USER_ID, 2024, 7);
    }

    @Test
    @DisplayName("카테고리 지출이 없으면 총지출 0과 빈 카테고리 목록을 반환한다")
    void getCategoryAnalysisWithNoExpenses() throws Exception {
        CategoryAnalysisResponse response = new CategoryAnalysisResponse(0L, List.of());

        when(analysisService.getCategoryAnalysis(USER_ID, 2024, 7)).thenReturn(response);

        mockMvc.perform(get("/api/v1/analysis/category")
                        .param("year", "2024")
                        .param("month", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalAmount").value(0))
                .andExpect(jsonPath("$.data.categories").isEmpty());

        verify(analysisService).getCategoryAnalysis(USER_ID, 2024, 7);
    }

    @Test
    @DisplayName("월이 12보다 크면 400과 공통 바인딩 오류를 반환한다")
    void rejectMonthGreaterThanTwelve() throws Exception {
        mockMvc.perform(get("/api/v1/analysis/category")
                        .param("year", "2024")
                        .param("month", "13"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("C002"))
                .andExpect(jsonPath("$.msg").value("월은 12 이하여야 합니다."));

        verifyNoInteractions(analysisService);
    }

    @Test
    @DisplayName("월이 1보다 작으면 400과 공통 바인딩 오류를 반환한다")
    void rejectMonthLessThanOne() throws Exception {
        mockMvc.perform(get("/api/v1/analysis/category")
                        .param("year", "2024")
                        .param("month", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("C002"))
                .andExpect(jsonPath("$.msg").value("월은 1 이상이어야 합니다."));

        verifyNoInteractions(analysisService);
    }

    @Test
    @DisplayName("필수 연도가 누락되면 400과 필수 필드 부재 오류를 반환한다")
    void rejectMissingYear() throws Exception {
        mockMvc.perform(get("/api/v1/analysis/category")
                        .param("month", "7"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("C003"));

        verifyNoInteractions(analysisService);
    }

    @Test
    @DisplayName("연도가 숫자가 아니면 400과 공통 바인딩 오류를 반환한다")
    void rejectInvalidYearType() throws Exception {
        mockMvc.perform(get("/api/v1/analysis/category")
                        .param("year", "invalid")
                        .param("month", "7"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("C002"));

        verifyNoInteractions(analysisService);
    }

    private void setAuthentication(Long userId) {
        UsernamePasswordAuthenticationToken authentication =
                UsernamePasswordAuthenticationToken.authenticated(
                        new AuthenticatedUser(userId), null, List.of());

        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
