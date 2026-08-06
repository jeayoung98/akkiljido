package com.a508.backend.domain.calendar.dto.response;

import static java.util.stream.Collectors.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.global.util.DateTimeUtils;

import io.swagger.v3.oas.annotations.media.Schema;

/** 선택한 월에 거래가 존재하는 날짜별 입출금 합계를 제공하는 응답. */
@Schema(description = "월 단위 입출금 조회 응답")
public record MonthlyCalendarResponse(

        @Schema(description = "거래가 존재하는 날짜별 입출금 합계")
        List<CalendarDateResponse> dateList
) {

    /** 거래내역을 서비스 시간대의 날짜를 기준으로 그룹화한다. */
    public static MonthlyCalendarResponse from(List<TransactionHistory> transactions) {
        Map<LocalDate, List<TransactionHistory>> transactionsByDate = transactions.stream()
                .collect(groupingBy(
                        transaction -> DateTimeUtils.toServiceLocal(transaction.getDatetime()).toLocalDate(),
                        TreeMap::new,
                        toList()));

        List<CalendarDateResponse> dateList = transactionsByDate.entrySet().stream()
                .map(entry -> CalendarDateResponse.of(entry.getKey(), entry.getValue()))
                .toList();

        return new MonthlyCalendarResponse(dateList);
    }
}