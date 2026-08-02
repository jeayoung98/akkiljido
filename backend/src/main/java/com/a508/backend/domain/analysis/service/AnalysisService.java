package com.a508.backend.domain.analysis.service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.a508.backend.domain.analysis.dto.response.CategoryAnalysisResponse;
import com.a508.backend.domain.analysis.dto.response.MyPlaceAnalysisResponse;
import com.a508.backend.domain.analysis.dto.response.MyPlaceExpenseResponse;
import com.a508.backend.domain.analysis.repository.AnalysisRepository;
import com.a508.backend.domain.analysis.repository.CategoryExpenseSummary;
import com.a508.backend.domain.mypage.domain.MyPlace;
import com.a508.backend.domain.mypage.service.MyPlaceService;
import com.a508.backend.domain.transaction_history.entity.TransactionHistory;
import com.a508.backend.global.util.DateTimeUtils;
import com.a508.backend.global.util.GeometryUtils;

import lombok.RequiredArgsConstructor;

/** 사용자의 월별 소비 내역을 기준으로 분석 결과를 생성하는 서비스. */
@Service
@RequiredArgsConstructor
public class AnalysisService {

    private static final double MY_PLACE_RADIUS_METERS = 2_000;

    private final AnalysisRepository analysisRepository;
    private final MyPlaceService myPlaceService;

    /** 선택한 연도와 월을 기준으로 카테고리별 지출 금액과 비율을 조회한다. */
    @Transactional(readOnly = true)
    public CategoryAnalysisResponse getCategoryAnalysis(Long userId, int year, int month) {
        YearMonth selectedMonth = YearMonth.of(year, month);
        LocalDate startDate = selectedMonth.atDay(1);
        LocalDate endDate = selectedMonth.plusMonths(1).atDay(1);

        OffsetDateTime startDateTime = DateTimeUtils.startOfDay(startDate);
        OffsetDateTime endDateTime = DateTimeUtils.startOfDay(endDate);

        List<CategoryExpenseSummary> summaries =
                analysisRepository.findCategoryExpenses(userId, startDateTime, endDateTime);

        return CategoryAnalysisResponse.from(summaries);
    }

    /** 선택한 월의 전체 지출과 등록한 내 장소별 반경 2km 내 지출을 조회한다. */
    @Transactional(readOnly = true)
    public MyPlaceAnalysisResponse getMyPlaceAnalysis(Long userId, int year, int month) {
        YearMonth selectedMonth = YearMonth.of(year, month);
        LocalDate startDate = selectedMonth.atDay(1);
        LocalDate endDate = selectedMonth.plusMonths(1).atDay(1);

        OffsetDateTime startDateTime = DateTimeUtils.startOfDay(startDate);
        OffsetDateTime endDateTime = DateTimeUtils.startOfDay(endDate);

        List<TransactionHistory> expenses =
                analysisRepository.findExpenses(userId, startDateTime, endDateTime);

        long totalAmount = expenses.stream()
                .mapToLong(TransactionHistory::getAmount)
                .sum();

        List<MyPlaceExpenseResponse> categories = myPlaceService.getOwnedMyPlaces(userId).stream()
                .map(myPlace -> MyPlaceExpenseResponse.of(
                        myPlace,
                        calculateNearbyExpense(myPlace, expenses),
                        totalAmount))
                .toList();

        return new MyPlaceAnalysisResponse(totalAmount, categories);
    }

    /** 내 장소 중심 반경 2km 안에서 발생한 지출 합계를 계산한다. */
    private long calculateNearbyExpense(MyPlace myPlace, List<TransactionHistory> expenses) {
        return expenses.stream()
                .filter(expense ->
                        GeometryUtils.distanceMeters(myPlace.getCoordinate(), expense.getCoordinate())
                                <= MY_PLACE_RADIUS_METERS)
                .mapToLong(TransactionHistory::getAmount)
                .sum();
    }
}
