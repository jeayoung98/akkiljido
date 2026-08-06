package com.a508.backend.domain.calendar.dto.response;

import java.time.LocalDate;
import java.util.List;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.domain.transaction_history.entity.TransactionType;
import com.fasterxml.jackson.annotation.JsonFormat;

import io.swagger.v3.oas.annotations.media.Schema;

/** 선택한 날짜의 순수입·지출 합계와 거래내역을 제공하는 응답. */
@Schema(description = "일 단위 입출금 조회 응답")
public record DailyCalendarResponse(

        @Schema(description = "조회 날짜", example = "2024-07-17")
        @JsonFormat(pattern = "yyyy-MM-dd")
        LocalDate date,

        @Schema(description = "수입은 양수, 지출은 음수로 계산한 순금액", example = "-36500")
        Long amount,

        @Schema(description = "해당 날짜의 거래내역 목록")
        List<CalendarTransactionResponse> transactionList
) {

    /** 해당 날짜의 순금액을 계산하고 거래내역을 응답 형식으로 변환한다. */
    public static DailyCalendarResponse of(LocalDate date, List<TransactionHistory> transactions) {
        long amount = transactions.stream()
                .mapToLong(transaction ->
                        transaction.getType() == TransactionType.INCOME
                                ? transaction.getAmount()
                                : -transaction.getAmount())
                .sum();

        List<CalendarTransactionResponse> transactionList = transactions.stream()
                .map(CalendarTransactionResponse::from)
                .toList();

        return new DailyCalendarResponse(date, amount, transactionList);
    }
}
