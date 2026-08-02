package com.a508.backend.domain.calendar.service;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.a508.backend.domain.calendar.dto.response.DailyCalendarResponse;
import com.a508.backend.domain.calendar.dto.response.MonthlyCalendarResponse;
import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.domain.transaction_history.repository.TransactionHistoryRepository;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
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
        YearMonth selectedMonth = YearMonth.of(year, month);
        LocalDate startDate = selectedMonth.atDay(1);
        LocalDate endDate = selectedMonth.plusMonths(1).atDay(1);

        OffsetDateTime startDateTime = DateTimeUtils.startOfDay(startDate);
        OffsetDateTime endDateTime = DateTimeUtils.startOfDay(endDate);

        List<TransactionHistory> transactions =
                transactionHistoryRepository.findAllByUser_IdAndDatetimeGreaterThanEqualAndDatetimeLessThanOrderByDatetimeAsc(
                        userId, startDateTime, endDateTime);

        return MonthlyCalendarResponse.from(transactions);
    }

    /** 선택한 날짜의 순수입·지출 합계와 거래내역 목록을 조회한다. */
    @Transactional(readOnly = true)
    public DailyCalendarResponse getDailyCalendar(Long userId, int year, int month, int day) {
        LocalDate selectedDate = createDate(year, month, day);
        OffsetDateTime startDateTime = DateTimeUtils.startOfDay(selectedDate);
        OffsetDateTime endDateTime = DateTimeUtils.startOfNextDay(selectedDate);

        List<TransactionHistory> transactions =
                transactionHistoryRepository.findAllByUser_IdAndDatetimeGreaterThanEqualAndDatetimeLessThanOrderByDatetimeAsc(
                        userId, startDateTime, endDateTime);

        return DailyCalendarResponse.of(selectedDate, transactions);
    }

    /** 연도·월·일의 조합이 실제 존재하는 날짜인지 검증한다. */
    private LocalDate createDate(int year, int month, int day) {
        try {
            return LocalDate.of(year, month, day);
        } catch (DateTimeException e) {
            throw new BusinessException(ExceptionType.INVALID_CALENDAR_DATE);
        }
    }
}
