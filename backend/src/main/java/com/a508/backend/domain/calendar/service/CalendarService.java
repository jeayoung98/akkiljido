package com.a508.backend.domain.calendar.service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.a508.backend.domain.calendar.dto.response.DailyCalendarResponse;
import com.a508.backend.domain.calendar.dto.response.MonthlyCalendarResponse;
import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.domain.transaction_history.repository.TransactionHistoryRepository;
import com.a508.backend.global.util.DateTimeRange;
import com.a508.backend.global.util.DateTimeUtils;

import lombok.RequiredArgsConstructor;

/** 사용자의 거래내역을 달력 단위로 조회하는 서비스. */
@Service
@RequiredArgsConstructor
public class CalendarService {

    private final TransactionHistoryRepository transactionHistoryRepository;

    /** 선택한 연도와 월을 기준으로 거래가 존재하는 날짜별 입출금 합계를 조회한다. */
    @Transactional(readOnly = true)
    public MonthlyCalendarResponse getMonthlyCalendar(Long userId, int year, int month) {
        DateTimeRange range = DateTimeUtils.monthRange(year, month);

        List<TransactionHistory> transactions =
                transactionHistoryRepository.findAllByUserIdAndDatetimeRange(
                        userId, range.start(), range.end());

        return MonthlyCalendarResponse.from(transactions);
    }

    /** 선택한 날짜의 순수입·지출 합계와 거래내역 목록을 조회한다. */
    @Transactional(readOnly = true)
    public DailyCalendarResponse getDailyCalendar(Long userId, int year, int month, int day) {
        LocalDate selectedDate = DateTimeUtils.createDate(year, month, day);
        OffsetDateTime startDateTime = DateTimeUtils.startOfDay(selectedDate);
        OffsetDateTime endDateTime = DateTimeUtils.startOfNextDay(selectedDate);

        List<TransactionHistory> transactions =
                transactionHistoryRepository.findAllWithCategoryByUserIdAndDatetimeRange(
                        userId, startDateTime, endDateTime);

        return DailyCalendarResponse.of(selectedDate, transactions);
    }
}
