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

import com.a508.backend.domain.analysis.dto.response.MyPlaceAnalysisResponse;
import com.a508.backend.domain.analysis.dto.response.MyPlaceExpenseResponse;
import com.a508.backend.domain.analysis.service.AnalysisService;
import com.a508.backend.global.exception.GlobalExceptionHandler;
import com.a508.backend.global.security.AuthenticatedUser;

/** 월별 내 장소 지출 분석 API의 매핑, 응답 형식과 요청값 검증을 확인한다. */
class MyPlaceAnalysisControllerTest {

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
    @DisplayName("GET 내 장소 분석은 전체 지출과 장소별 반경 지출을 공통 성공 응답으로 반환한다")
    void getMyPlaceAnalysis() throws Exception {
        MyPlaceAnalysisResponse response = new MyPlaceAnalysisResponse(
                490000L,
                List.of(
                        new MyPlaceExpenseResponse(2L, "회사", 182000L, 37),
                        new MyPlaceExpenseResponse(3L, "기타", 88000L, 18)));

        when(analysisService.getMyPlaceAnalysis(USER_ID, 2024, 7)).thenReturn(response);

        mockMvc.perform(get("/api/v1/analysis/my-place")
                        .param("year", "2024")
                        .param("month", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalAmount").value(490000))
                .andExpect(jsonPath("$.data.categories[0].placeId").value(2))
                .andExpect(jsonPath("$.data.categories[0].myPlaceName").value("회사"))
                .andExpect(jsonPath("$.data.categories[0].amount").value(182000))
                .andExpect(jsonPath("$.data.categories[0].percent").value(37))
                .andExpect(jsonPath("$.data.categories[1].placeId").value(3))
                .andExpect(jsonPath("$.data.categories[1].myPlaceName").value("기타"))
                .andExpect(jsonPath("$.data.categories[1].amount").value(88000))
                .andExpect(jsonPath("$.data.categories[1].percent").value(18));

        verify(analysisService).getMyPlaceAnalysis(USER_ID, 2024, 7);
    }

    @Test
    @DisplayName("등록한 내 장소가 없으면 전체 지출과 빈 장소 목록을 반환한다")
    void getMyPlaceAnalysisWithNoMyPlaces() throws Exception {
        MyPlaceAnalysisResponse response = new MyPlaceAnalysisResponse(100000L, List.of());

        when(analysisService.getMyPlaceAnalysis(USER_ID, 2024, 7)).thenReturn(response);

        mockMvc.perform(get("/api/v1/analysis/my-place")
                        .param("year", "2024")
                        .param("month", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalAmount").value(100000))
                .andExpect(jsonPath("$.data.categories").isEmpty());

        verify(analysisService).getMyPlaceAnalysis(USER_ID, 2024, 7);
    }

    @Test
    @DisplayName("월이 12보다 크면 400과 공통 바인딩 오류를 반환한다")
    void rejectMonthGreaterThanTwelve() throws Exception {
        mockMvc.perform(get("/api/v1/analysis/my-place")
                        .param("year", "2024")
                        .param("month", "13"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("C002"))
                .andExpect(jsonPath("$.msg").value("월은 12 이하여야 합니다."));

        verifyNoInteractions(analysisService);
    }

    @Test
    @DisplayName("필수 월이 누락되면 400과 필수 필드 부재 오류를 반환한다")
    void rejectMissingMonth() throws Exception {
        mockMvc.perform(get("/api/v1/analysis/my-place")
                        .param("year", "2024"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("C003"));

        verifyNoInteractions(analysisService);
    }

    private void setAuthentication(Long userId) {
        UsernamePasswordAuthenticationToken authentication =
                UsernamePasswordAuthenticationToken.authenticated(
                        new AuthenticatedUser(userId), null, List.of());

        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
