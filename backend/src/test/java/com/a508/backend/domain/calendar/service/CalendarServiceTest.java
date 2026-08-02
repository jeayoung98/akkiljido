package com.a508.backend.domain.calendar.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.a508.backend.domain.calendar.dto.response.CalendarDateResponse;
import com.a508.backend.domain.calendar.dto.response.MonthlyCalendarResponse;
import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.domain.transaction_history.entity.TransactionType;
import com.a508.backend.domain.transaction_history.repository.TransactionHistoryRepository;
import com.a508.backend.global.util.DateTimeUtils;

/** 월 단위 캘린더 조회 서비스의 날짜별 입출금 집계를 검증한다. */
@ExtendWith(MockitoExtension.class)
class CalendarServiceTest {

    private static final Long USER_ID = 1L;

    @Mock
    private TransactionHistoryRepository transactionHistoryRepository;

    @InjectMocks
    private CalendarService calendarService;

    @Test
    @DisplayName("선택한 월의 거래내역을 날짜별로 묶어 수입과 지출을 합산한다")
    void getMonthlyCalendar() {
        OffsetDateTime startDateTime = DateTimeUtils.startOfDay(LocalDate.of(2024, 7, 1));
        OffsetDateTime endDateTime = DateTimeUtils.startOfDay(LocalDate.of(2024, 8, 1));

        List<TransactionHistory> transactions = List.of(
                createTransaction(LocalDateTime.of(2024, 7, 12, 9, 0), 8900L, TransactionType.EXPENSE),
                createTransaction(LocalDateTime.of(2024, 7, 12, 12, 0), 50000L, TransactionType.INCOME),
                createTransaction(LocalDateTime.of(2024, 7, 12, 18, 0), 1100L, TransactionType.EXPENSE),
                createTransaction(LocalDateTime.of(2024, 7, 13, 10, 0), 45000L, TransactionType.EXPENSE));

        when(transactionHistoryRepository
                .findAllByUser_IdAndDatetimeGreaterThanEqualAndDatetimeLessThanOrderByDatetimeAsc(
                        USER_ID, startDateTime, endDateTime))
                .thenReturn(transactions);

        MonthlyCalendarResponse response = calendarService.getMonthlyCalendar(USER_ID, 2024, 7);

        assertThat(response.dateList()).hasSize(2);

        CalendarDateResponse july12 = response.dateList().get(0);
        assertThat(july12.date()).isEqualTo(12);
        assertThat(july12.expense()).isEqualTo(10000L);
        assertThat(july12.income()).isEqualTo(50000L);

        CalendarDateResponse july13 = response.dateList().get(1);
        assertThat(july13.date()).isEqualTo(13);
        assertThat(july13.expense()).isEqualTo(45000L);
        assertThat(july13.income()).isZero();

        verify(transactionHistoryRepository)
                .findAllByUser_IdAndDatetimeGreaterThanEqualAndDatetimeLessThanOrderByDatetimeAsc(
                        USER_ID, startDateTime, endDateTime);
    }

    @Test
    @DisplayName("거래가 존재하지 않으면 빈 날짜 목록을 반환한다")
    void getMonthlyCalendarWithNoTransactions() {
        OffsetDateTime startDateTime = DateTimeUtils.startOfDay(LocalDate.of(2024, 7, 1));
        OffsetDateTime endDateTime = DateTimeUtils.startOfDay(LocalDate.of(2024, 8, 1));

        when(transactionHistoryRepository
                .findAllByUser_IdAndDatetimeGreaterThanEqualAndDatetimeLessThanOrderByDatetimeAsc(
                        USER_ID, startDateTime, endDateTime))
                .thenReturn(List.of());

        MonthlyCalendarResponse response = calendarService.getMonthlyCalendar(USER_ID, 2024, 7);

        assertThat(response.dateList()).isEmpty();
    }

    @Test
    @DisplayName("저장된 거래 시각을 서비스 시간대의 날짜로 변환하여 그룹화한다")
    void groupTransactionsByServiceZone() {
        OffsetDateTime startDateTime = DateTimeUtils.startOfDay(LocalDate.of(2024, 7, 1));
        OffsetDateTime endDateTime = DateTimeUtils.startOfDay(LocalDate.of(2024, 8, 1));

        TransactionHistory transaction = TransactionHistory.builder()
                .datetime(OffsetDateTime.parse("2024-07-11T15:30:00Z"))
                .amount(10000L)
                .type(TransactionType.EXPENSE)
                .transactionName("편의점")
                .paymentMethod("카드")
                .build();

        when(transactionHistoryRepository
                .findAllByUser_IdAndDatetimeGreaterThanEqualAndDatetimeLessThanOrderByDatetimeAsc(
                        USER_ID, startDateTime, endDateTime))
                .thenReturn(List.of(transaction));

        MonthlyCalendarResponse response = calendarService.getMonthlyCalendar(USER_ID, 2024, 7);

        assertThat(response.dateList()).singleElement()
                .satisfies(dateResponse -> {
                    assertThat(dateResponse.date()).isEqualTo(12);
                    assertThat(dateResponse.expense()).isEqualTo(10000L);
                    assertThat(dateResponse.income()).isZero();
                });
    }

    private TransactionHistory createTransaction(
            LocalDateTime datetime, Long amount, TransactionType type) {
        return TransactionHistory.builder()
                .datetime(DateTimeUtils.toServiceOffset(datetime))
                .amount(amount)
                .type(type)
                .transactionName("거래")
                .paymentMethod("카드")
                .build();
    }
}