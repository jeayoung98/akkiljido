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
import org.springframework.test.util.ReflectionTestUtils;

import com.a508.backend.domain.calendar.dto.response.CalendarDateResponse;
import com.a508.backend.domain.calendar.dto.response.DailyCalendarResponse;
import com.a508.backend.domain.calendar.dto.response.MonthlyCalendarResponse;
import com.a508.backend.domain.category.entity.Category;
import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.domain.transaction_history.entity.TransactionType;
import com.a508.backend.domain.transaction_history.repository.TransactionHistoryRepository;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.global.util.DateTimeUtils;

/** 월·일 단위 캘린더 조회 서비스의 입출금 집계와 날짜 검증을 확인한다. */
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
                .findAllByUserIdAndDatetimeRange(
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
                .findAllByUserIdAndDatetimeRange(
                        USER_ID, startDateTime, endDateTime);
    }

    @Test
    @DisplayName("월에 거래가 존재하지 않으면 빈 날짜 목록을 반환한다")
    void getMonthlyCalendarWithNoTransactions() {
        OffsetDateTime startDateTime = DateTimeUtils.startOfDay(LocalDate.of(2024, 7, 1));
        OffsetDateTime endDateTime = DateTimeUtils.startOfDay(LocalDate.of(2024, 8, 1));

        when(transactionHistoryRepository
                .findAllByUserIdAndDatetimeRange(
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
                .findAllByUserIdAndDatetimeRange(
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

    @Test
    @DisplayName("선택한 날짜의 수입은 더하고 지출은 빼서 순금액을 계산한다")
    void getDailyCalendar() {
        LocalDate selectedDate = LocalDate.of(2024, 7, 17);
        OffsetDateTime startDateTime = DateTimeUtils.startOfDay(selectedDate);
        OffsetDateTime endDateTime = DateTimeUtils.startOfNextDay(selectedDate);

        List<TransactionHistory> transactions = List.of(
                createTransaction(1L, LocalDateTime.of(2024, 7, 17, 9, 0),
                        "급여", 50000L, TransactionType.INCOME, null, null),
                createTransaction(2L, LocalDateTime.of(2024, 7, 17, 12, 0),
                        "스타벅스", 4100L, TransactionType.EXPENSE, 3L, "카페"),
                createTransaction(3L, LocalDateTime.of(2024, 7, 17, 18, 0),
                        "장보기", 82400L, TransactionType.EXPENSE, 4L, "생활"));

        when(transactionHistoryRepository
                .findAllWithCategoryByUserIdAndDatetimeRange(
                        USER_ID, startDateTime, endDateTime))
                .thenReturn(transactions);

        DailyCalendarResponse response = calendarService.getDailyCalendar(USER_ID, 2024, 7, 17);

        assertThat(response.date()).isEqualTo(selectedDate);
        assertThat(response.amount()).isEqualTo(-36500L);
        assertThat(response.transactionList()).hasSize(3);

        assertThat(response.transactionList().get(0).transactionId()).isEqualTo(1L);
        assertThat(response.transactionList().get(0).name()).isEqualTo("급여");
        assertThat(response.transactionList().get(0).amount()).isEqualTo(50000L);
        assertThat(response.transactionList().get(0).type()).isEqualTo(TransactionType.INCOME);
        assertThat(response.transactionList().get(0).categoryId()).isNull();
        assertThat(response.transactionList().get(0).categoryName()).isNull();

        assertThat(response.transactionList().get(1).transactionId()).isEqualTo(2L);
        assertThat(response.transactionList().get(1).name()).isEqualTo("스타벅스");
        assertThat(response.transactionList().get(1).amount()).isEqualTo(4100L);
        assertThat(response.transactionList().get(1).type()).isEqualTo(TransactionType.EXPENSE);
        assertThat(response.transactionList().get(1).categoryId()).isEqualTo(3L);
        assertThat(response.transactionList().get(1).categoryName()).isEqualTo("카페");

        verify(transactionHistoryRepository)
                .findAllWithCategoryByUserIdAndDatetimeRange(
                        USER_ID, startDateTime, endDateTime);
    }

    @Test
    @DisplayName("선택한 날짜에 거래가 없으면 순금액 0과 빈 거래 목록을 반환한다")
    void getDailyCalendarWithNoTransactions() {
        LocalDate selectedDate = LocalDate.of(2024, 7, 17);
        OffsetDateTime startDateTime = DateTimeUtils.startOfDay(selectedDate);
        OffsetDateTime endDateTime = DateTimeUtils.startOfNextDay(selectedDate);

        when(transactionHistoryRepository
                .findAllWithCategoryByUserIdAndDatetimeRange(
                        USER_ID, startDateTime, endDateTime))
                .thenReturn(List.of());

        DailyCalendarResponse response = calendarService.getDailyCalendar(USER_ID, 2024, 7, 17);

        assertThat(response.date()).isEqualTo(selectedDate);
        assertThat(response.amount()).isZero();
        assertThat(response.transactionList()).isEmpty();
    }

    @Test
    @DisplayName("존재하지 않는 날짜를 요청하면 캘린더 날짜 오류를 던진다")
    void rejectInvalidCalendarDate() {
        assertThatThrownBy(() -> calendarService.getDailyCalendar(USER_ID, 2025, 2, 30))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getExceptionType())
                                .isEqualTo(ExceptionType.INVALID_CALENDAR_DATE));

        verifyNoInteractions(transactionHistoryRepository);
    }

    @Test
    @DisplayName("윤년의 2월 29일은 유효한 날짜로 조회한다")
    void acceptLeapDay() {
        LocalDate selectedDate = LocalDate.of(2024, 2, 29);
        OffsetDateTime startDateTime = DateTimeUtils.startOfDay(selectedDate);
        OffsetDateTime endDateTime = DateTimeUtils.startOfNextDay(selectedDate);

        when(transactionHistoryRepository
                .findAllWithCategoryByUserIdAndDatetimeRange(
                        USER_ID, startDateTime, endDateTime))
                .thenReturn(List.of());

        DailyCalendarResponse response = calendarService.getDailyCalendar(USER_ID, 2024, 2, 29);

        assertThat(response.date()).isEqualTo(selectedDate);
        verify(transactionHistoryRepository)
                .findAllWithCategoryByUserIdAndDatetimeRange(
                        USER_ID, startDateTime, endDateTime);
    }

    private TransactionHistory createTransaction(
            LocalDateTime datetime, Long amount, TransactionType type) {
        return type == TransactionType.INCOME
                ? createTransaction(null, datetime, "거래", amount, type, null, null)
                : createTransaction(null, datetime, "거래", amount, type, 1L, "기타");
    }

    private TransactionHistory createTransaction(
            Long id, LocalDateTime datetime, String name, Long amount, TransactionType type,
            Long categoryId, String categoryName) {
        TransactionHistory transaction = TransactionHistory.builder()
                .category(categoryId == null ? null : createCategory(categoryId, categoryName))
                .datetime(DateTimeUtils.toServiceOffset(datetime))
                .amount(amount)
                .type(type)
                .transactionName(name)
                .paymentMethod("카드")
                .build();

        if (id != null) {
            ReflectionTestUtils.setField(transaction, "id", id);
        }

        return transaction;
    }

    private Category createCategory(Long id, String name) {
        Category category = Category.builder()
                .name(name)
                .build();

        ReflectionTestUtils.setField(category, "id", id);

        return category;
    }
}
