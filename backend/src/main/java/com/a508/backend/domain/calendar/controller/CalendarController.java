package com.a508.backend.domain.calendar.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.a508.backend.domain.calendar.dto.response.DailyCalendarResponse;
import com.a508.backend.domain.calendar.dto.response.MonthlyCalendarResponse;
import com.a508.backend.domain.calendar.service.CalendarService;
import com.a508.backend.global.response.ResponseBody;
import com.a508.backend.global.response.ResponseUtil;
import com.a508.backend.global.security.AuthenticatedUser;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;

/** 사용자의 월별 및 일별 거래내역을 제공하는 컨트롤러. */
@Tag(name = "캘린더", description = "캘린더 기반 입출금 조회 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/calendar")
public class CalendarController {

    private final CalendarService calendarService;

    /** 선택한 연도와 월을 기준으로 거래가 존재하는 날짜별 입출금 합계를 조회한다. */
    @Operation(summary = "월 단위 입출금 조회",
            description = "선택한 연도와 월을 기준으로 거래가 존재하는 날짜별 총지출과 총수입을 조회한다.")
    @GetMapping("/month")
    public ResponseBody<MonthlyCalendarResponse> getMonthlyCalendar(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @Parameter(description = "조회 연도", example = "2024")
            @Min(value = 1, message = "연도는 1 이상이어야 합니다.")
            @Max(value = 9999, message = "연도는 9999 이하여야 합니다.")
            @RequestParam(name = "year") int year,
            @Parameter(description = "조회 월", example = "7")
            @Min(value = 1, message = "월은 1 이상이어야 합니다.")
            @Max(value = 12, message = "월은 12 이하여야 합니다.")
            @RequestParam(name = "month") int month) {
        MonthlyCalendarResponse response =
                calendarService.getMonthlyCalendar(authenticatedUser.getUserId(), year, month);

        return ResponseUtil.createSuccessResponse(response);
    }

    /** 선택한 날짜의 순수입·지출 합계와 거래내역 목록을 조회한다. */
    @Operation(summary = "일 단위 입출금 조회",
            description = "선택한 날짜를 기준으로 순수입·지출 합계와 거래내역 목록을 조회한다.")
    @GetMapping("/day")
    public ResponseBody<DailyCalendarResponse> getDailyCalendar(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @Parameter(description = "조회 연도", example = "2024")
            @Min(value = 1, message = "연도는 1 이상이어야 합니다.")
            @Max(value = 9999, message = "연도는 9999 이하여야 합니다.")
            @RequestParam(name = "year") int year,
            @Parameter(description = "조회 월", example = "7")
            @Min(value = 1, message = "월은 1 이상이어야 합니다.")
            @Max(value = 12, message = "월은 12 이하여야 합니다.")
            @RequestParam(name = "month") int month,
            @Parameter(description = "조회 일", example = "17")
            @Min(value = 1, message = "일은 1 이상이어야 합니다.")
            @Max(value = 31, message = "일은 31 이하여야 합니다.")
            @RequestParam(name = "day") int day) {
        DailyCalendarResponse response =
                calendarService.getDailyCalendar(authenticatedUser.getUserId(), year, month, day);

        return ResponseUtil.createSuccessResponse(response);
    }
}
