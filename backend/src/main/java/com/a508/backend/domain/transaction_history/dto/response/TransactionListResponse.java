package com.a508.backend.domain.transaction_history.dto.response;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.global.util.DateTimeUtils;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 거래내역 목록 조회 응답. 거래 목록을 일자별로 묶어 내려준다.
 * 전달되는 거래 목록의 정렬 순서를 그대로 유지하여 일자 그룹을 구성한다.
 */
@Schema(description = "거래내역 목록 조회 응답")
public record TransactionListResponse(

        @Schema(description = "일자별 거래내역 목록")
        List<DailyTransactionResponse> dateList
) {
    public static TransactionListResponse of(List<TransactionHistory> transactions) {
        Map<LocalDate, List<TransactionHistory>> grouped = new LinkedHashMap<>();
        for (TransactionHistory transaction : transactions) {
            LocalDate date = DateTimeUtils.toServiceLocal(transaction.getDatetime()).toLocalDate();
            grouped.computeIfAbsent(date, key -> new ArrayList<>()).add(transaction);
        }

        List<DailyTransactionResponse> dateList = grouped.entrySet().stream()
            .map(entry -> DailyTransactionResponse.of(entry.getKey(), entry.getValue()))
            .toList();

        return new TransactionListResponse(dateList);
    }
}
