package com.a508.backend.domain.calendar.controller;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.LocalDate;
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
import com.a508.backend.domain.calendar.dto.response.CalendarTransactionResponse;
import com.a508.backend.domain.calendar.dto.response.DailyCalendarResponse;
import com.a508.backend.domain.calendar.dto.response.MonthlyCalendarResponse;
import com.a508.backend.domain.calendar.service.CalendarService;
import com.a508.backend.domain.transaction_history.entity.TransactionType;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.global.exception.GlobalExceptionHandler;
import com.a508.backend.global.security.AuthenticatedUser;

/** 월·일 단위 캘린더 조회 API의 매핑, 응답 형식과 요청값 검증을 확인한다. */
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

    @Test
    @DisplayName("GET 일 단위 조회는 날짜, 순금액과 거래내역 목록을 공통 성공 응답으로 반환한다")
    void getDailyCalendar() throws Exception {
        DailyCalendarResponse response = new DailyCalendarResponse(
                LocalDate.of(2024, 7, 17),
                -36500L,
                List.of(
                        new CalendarTransactionResponse(
                                1L, "급여", 50000L, TransactionType.INCOME, null, null),
                        new CalendarTransactionResponse(
                                2L, "스타벅스", 86500L, TransactionType.EXPENSE, 3L, "카페")));

        when(calendarService.getDailyCalendar(USER_ID, 2024, 7, 17)).thenReturn(response);

        mockMvc.perform(get("/api/v1/calendar/day")
                        .param("year", "2024")
                        .param("month", "7")
                        .param("day", "17"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.date").value("2024-07-17"))
                .andExpect(jsonPath("$.data.amount").value(-36500))
                .andExpect(jsonPath("$.data.transactionList[0].transactionId").value(1))
                .andExpect(jsonPath("$.data.transactionList[0].name").value("급여"))
                .andExpect(jsonPath("$.data.transactionList[0].amount").value(50000))
                .andExpect(jsonPath("$.data.transactionList[0].type").value("INCOME"))
                .andExpect(jsonPath("$.data.transactionList[0].categoryId").isEmpty())
                .andExpect(jsonPath("$.data.transactionList[0].categoryName").isEmpty())
                .andExpect(jsonPath("$.data.transactionList[1].transactionId").value(2))
                .andExpect(jsonPath("$.data.transactionList[1].name").value("스타벅스"))
                .andExpect(jsonPath("$.data.transactionList[1].amount").value(86500))
                .andExpect(jsonPath("$.data.transactionList[1].type").value("EXPENSE"))
                .andExpect(jsonPath("$.data.transactionList[1].categoryId").value(3))
                .andExpect(jsonPath("$.data.transactionList[1].categoryName").value("카페"));

        verify(calendarService).getDailyCalendar(USER_ID, 2024, 7, 17);
    }

    @Test
    @DisplayName("일이 31보다 크면 400과 공통 바인딩 오류를 반환한다")
    void rejectDayGreaterThanThirtyOne() throws Exception {
        mockMvc.perform(get("/api/v1/calendar/day")
                        .param("year", "2024")
                        .param("month", "7")
                        .param("day", "32"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("C002"))
                .andExpect(jsonPath("$.msg").value("일은 31 이하여야 합니다."));

        verifyNoInteractions(calendarService);
    }

    @Test
    @DisplayName("실제로 존재하지 않는 날짜면 400과 캘린더 날짜 오류를 반환한다")
    void rejectInvalidCalendarDate() throws Exception {
        when(calendarService.getDailyCalendar(USER_ID, 2025, 2, 30))
                .thenThrow(new BusinessException(ExceptionType.INVALID_CALENDAR_DATE));

        mockMvc.perform(get("/api/v1/calendar/day")
                        .param("year", "2025")
                        .param("month", "2")
                        .param("day", "30"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("CL001"))
                .andExpect(jsonPath("$.msg").value("존재하지 않는 날짜입니다."));

        verify(calendarService).getDailyCalendar(USER_ID, 2025, 2, 30);
    }

    @Test
    @DisplayName("필수 일이 누락되면 400과 필수 필드 부재 오류를 반환한다")
    void rejectMissingDay() throws Exception {
        mockMvc.perform(get("/api/v1/calendar/day")
                        .param("year", "2024")
                        .param("month", "7"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("C003"));

        verifyNoInteractions(calendarService);
    }

    private void setAuthentication(Long userId) {
        UsernamePasswordAuthenticationToken authentication =
                UsernamePasswordAuthenticationToken.authenticated(
                        new AuthenticatedUser(userId), null, List.of());

        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
