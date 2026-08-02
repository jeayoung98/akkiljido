package com.a508.backend.domain.calendar.dto.response;

import java.time.LocalDate;
import java.util.List;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.domain.transaction_history.entity.TransactionType;

import io.swagger.v3.oas.annotations.media.Schema;

/** 특정 날짜의 총지출과 총수입을 나타내는 응답. */
@Schema(description = "날짜별 입출금 합계")
public record CalendarDateResponse(

        @Schema(description = "거래가 발생한 일", example = "12")
        Integer date,

        @Schema(description = "해당 날짜의 총지출", example = "8900")
        Long expense,

        @Schema(description = "해당 날짜의 총수입", example = "50000")
        Long income
) {

    /** 해당 날짜의 거래내역을 수입과 지출로 구분하여 합산한다. */
    public static CalendarDateResponse of(LocalDate date, List<TransactionHistory> transactions) {
        long expense = transactions.stream()
                .filter(transaction -> transaction.getType() == TransactionType.EXPENSE)
                .mapToLong(TransactionHistory::getAmount)
                .sum();

        long income = transactions.stream()
                .filter(transaction -> transaction.getType() == TransactionType.INCOME)
                .mapToLong(TransactionHistory::getAmount)
                .sum();

        return new CalendarDateResponse(date.getDayOfMonth(), expense, income);
    }
}