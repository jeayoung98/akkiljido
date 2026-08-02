package com.a508.backend.domain.calendar.controller;

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

import com.a508.backend.domain.calendar.dto.response.CalendarDateResponse;
import com.a508.backend.domain.calendar.dto.response.MonthlyCalendarResponse;
import com.a508.backend.domain.calendar.service.CalendarService;
import com.a508.backend.global.exception.GlobalExceptionHandler;
import com.a508.backend.global.security.AuthenticatedUser;

/** 월 단위 캘린더 조회 API의 매핑, 응답 형식과 요청값 검증을 확인한다. */
class CalendarControllerTest {

    private static final Long USER_ID = 1L;

    private final CalendarService calendarService = mock(CalendarService.class);
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new CalendarController(calendarService))
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
    @DisplayName("GET 월 단위 조회는 날짜별 입출금 합계를 공통 성공 응답으로 반환한다")
    void getMonthlyCalendar() throws Exception {
        MonthlyCalendarResponse response = new MonthlyCalendarResponse(List.of(
                new CalendarDateResponse(12, 8900L, 50000L),
                new CalendarDateResponse(13, 45000L, 0L)));

        when(calendarService.getMonthlyCalendar(USER_ID, 2024, 7)).thenReturn(response);

        mockMvc.perform(get("/api/v1/calendar/month")
                        .param("year", "2024")
                        .param("month", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.dateList[0].date").value(12))
                .andExpect(jsonPath("$.data.dateList[0].expense").value(8900))
                .andExpect(jsonPath("$.data.dateList[0].income").value(50000))
                .andExpect(jsonPath("$.data.dateList[1].date").value(13))
                .andExpect(jsonPath("$.data.dateList[1].expense").value(45000))
                .andExpect(jsonPath("$.data.dateList[1].income").value(0));

        verify(calendarService).getMonthlyCalendar(USER_ID, 2024, 7);
    }

    @Test
    @DisplayName("월이 12보다 크면 400과 공통 바인딩 오류를 반환한다")
    void rejectMonthGreaterThanTwelve() throws Exception {
        mockMvc.perform(get("/api/v1/calendar/month")
                        .param("year", "2024")
                        .param("month", "13"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("C002"))
                .andExpect(jsonPath("$.msg").value("월은 12 이하여야 합니다."));

        verifyNoInteractions(calendarService);
    }

    @Test
    @DisplayName("월이 1보다 작으면 400과 공통 바인딩 오류를 반환한다")
    void rejectMonthLessThanOne() throws Exception {
        mockMvc.perform(get("/api/v1/calendar/month")
                        .param("year", "2024")
                        .param("month", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("C002"))
                .andExpect(jsonPath("$.msg").value("월은 1 이상이어야 합니다."));

        verifyNoInteractions(calendarService);
    }

    @Test
    @DisplayName("필수 연도가 누락되면 400과 필수 필드 부재 오류를 반환한다")
    void rejectMissingYear() throws Exception {
        mockMvc.perform(get("/api/v1/calendar/month")
                        .param("month", "7"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("C003"));

        verifyNoInteractions(calendarService);
    }

    @Test
    @DisplayName("연도가 숫자가 아니면 400과 공통 바인딩 오류를 반환한다")
    void rejectInvalidYearType() throws Exception {
        mockMvc.perform(get("/api/v1/calendar/month")
                        .param("year", "invalid")
                        .param("month", "7"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("C002"));

        verifyNoInteractions(calendarService);
    }

    private void setAuthentication(Long userId) {
        UsernamePasswordAuthenticationToken authentication =
                UsernamePasswordAuthenticationToken.authenticated(
                        new AuthenticatedUser(userId), null, List.of());

        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}