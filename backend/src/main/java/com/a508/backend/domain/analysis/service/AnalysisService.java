package com.a508.backend.domain.analysis.service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.a508.backend.domain.analysis.dto.response.CategoryAnalysisResponse;
import com.a508.backend.domain.analysis.repository.AnalysisRepository;
import com.a508.backend.domain.analysis.repository.CategoryExpenseSummary;
import com.a508.backend.global.util.DateTimeUtils;

import lombok.RequiredArgsConstructor;

/** 사용자의 월별 소비 내역을 기준으로 분석 결과를 생성하는 서비스. */
@Service
@RequiredArgsConstructor
public class AnalysisService {

    private final AnalysisRepository analysisRepository;

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
}
