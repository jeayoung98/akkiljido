package com.a508.backend.domain.analysis.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.a508.backend.domain.analysis.dto.response.CategoryAnalysisResponse;
import com.a508.backend.domain.analysis.dto.response.CategoryExpenseResponse;
import com.a508.backend.domain.analysis.repository.AnalysisRepository;
import com.a508.backend.domain.analysis.repository.CategoryExpenseSummary;
import com.a508.backend.global.util.DateTimeUtils;

/** 월별 카테고리 지출 분석 서비스의 기간 조회, 합계와 비율 계산을 검증한다. */
@ExtendWith(MockitoExtension.class)
class AnalysisServiceTest {

    private static final Long USER_ID = 1L;

    @Mock
    private AnalysisRepository analysisRepository;

    @InjectMocks
    private AnalysisService analysisService;

    @Test
    @DisplayName("선택한 월의 카테고리별 지출 합계와 비율을 반환한다")
    void getCategoryAnalysis() {
        OffsetDateTime startDateTime = DateTimeUtils.startOfDay(LocalDate.of(2024, 7, 1));
        OffsetDateTime endDateTime = DateTimeUtils.startOfDay(LocalDate.of(2024, 8, 1));

        List<CategoryExpenseSummary> summaries = List.of(
                new CategoryExpenseSummary(3L, "음식점", 182000L),
                new CategoryExpenseSummary(5L, "쇼핑", 254000L),
                new CategoryExpenseSummary(11L, "기타", 54000L));

        when(analysisRepository.findCategoryExpenses(USER_ID, startDateTime, endDateTime))
                .thenReturn(summaries);

        CategoryAnalysisResponse response = analysisService.getCategoryAnalysis(USER_ID, 2024, 7);

        assertThat(response.totalAmount()).isEqualTo(490000L);
        assertThat(response.categories()).hasSize(3);

        CategoryExpenseResponse food = response.categories().get(0);
        assertThat(food.categoryId()).isEqualTo(3L);
        assertThat(food.categoryName()).isEqualTo("음식점");
        assertThat(food.amount()).isEqualTo(182000L);
        assertThat(food.percent()).isEqualTo(37);

        CategoryExpenseResponse shopping = response.categories().get(1);
        assertThat(shopping.categoryId()).isEqualTo(5L);
        assertThat(shopping.categoryName()).isEqualTo("쇼핑");
        assertThat(shopping.amount()).isEqualTo(254000L);
        assertThat(shopping.percent()).isEqualTo(52);

        CategoryExpenseResponse etc = response.categories().get(2);
        assertThat(etc.categoryId()).isEqualTo(11L);
        assertThat(etc.categoryName()).isEqualTo("기타");
        assertThat(etc.amount()).isEqualTo(54000L);
        assertThat(etc.percent()).isEqualTo(11);

        verify(analysisRepository).findCategoryExpenses(USER_ID, startDateTime, endDateTime);
    }

    @Test
    @DisplayName("카테고리 지출 비율은 소수점 첫째 자리에서 반올림한다")
    void roundCategoryExpensePercent() {
        OffsetDateTime startDateTime = DateTimeUtils.startOfDay(LocalDate.of(2024, 7, 1));
        OffsetDateTime endDateTime = DateTimeUtils.startOfDay(LocalDate.of(2024, 8, 1));

        List<CategoryExpenseSummary> summaries = List.of(
                new CategoryExpenseSummary(1L, "음식점", 1L),
                new CategoryExpenseSummary(2L, "카페·간식", 2L));

        when(analysisRepository.findCategoryExpenses(USER_ID, startDateTime, endDateTime))
                .thenReturn(summaries);

        CategoryAnalysisResponse response = analysisService.getCategoryAnalysis(USER_ID, 2024, 7);

        assertThat(response.totalAmount()).isEqualTo(3L);
        assertThat(response.categories())
                .extracting(CategoryExpenseResponse::percent)
                .containsExactly(33, 67);
    }

    @Test
    @DisplayName("해당 월에 지출이 없으면 총지출 0과 빈 카테고리 목록을 반환한다")
    void getCategoryAnalysisWithNoExpenses() {
        OffsetDateTime startDateTime = DateTimeUtils.startOfDay(LocalDate.of(2024, 7, 1));
        OffsetDateTime endDateTime = DateTimeUtils.startOfDay(LocalDate.of(2024, 8, 1));

        when(analysisRepository.findCategoryExpenses(USER_ID, startDateTime, endDateTime))
                .thenReturn(List.of());

        CategoryAnalysisResponse response = analysisService.getCategoryAnalysis(USER_ID, 2024, 7);

        assertThat(response.totalAmount()).isZero();
        assertThat(response.categories()).isEmpty();

        verify(analysisRepository).findCategoryExpenses(USER_ID, startDateTime, endDateTime);
    }

    @Test
    @DisplayName("지출 합계가 0이면 카테고리 비율을 0으로 반환한다")
    void returnZeroPercentWhenTotalAmountIsZero() {
        OffsetDateTime startDateTime = DateTimeUtils.startOfDay(LocalDate.of(2024, 7, 1));
        OffsetDateTime endDateTime = DateTimeUtils.startOfDay(LocalDate.of(2024, 8, 1));

        List<CategoryExpenseSummary> summaries =
                List.of(new CategoryExpenseSummary(1L, "음식점", 0L));

        when(analysisRepository.findCategoryExpenses(USER_ID, startDateTime, endDateTime))
                .thenReturn(summaries);

        CategoryAnalysisResponse response = analysisService.getCategoryAnalysis(USER_ID, 2024, 7);

        assertThat(response.totalAmount()).isZero();
        assertThat(response.categories()).singleElement()
                .satisfies(category -> assertThat(category.percent()).isZero());
    }
}
