package com.a508.backend.domain.analysis.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.a508.backend.domain.analysis.dto.response.CategoryAnalysisResponse;
import com.a508.backend.domain.analysis.service.AnalysisService;
import com.a508.backend.global.response.ResponseBody;
import com.a508.backend.global.response.ResponseUtil;
import com.a508.backend.global.security.AuthenticatedUser;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;

/** 사용자의 소비 내역을 카테고리와 내 장소 기준으로 분석하는 컨트롤러. */
@Tag(name = "분석", description = "월별 소비 분석 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/analysis")
public class AnalysisController {

    private final AnalysisService analysisService;

    /** 선택한 연도와 월을 기준으로 카테고리별 지출 금액과 비율을 조회한다. */
    @Operation(summary = "월별 카테고리 지출 조회",
            description = "선택한 연도와 월의 총지출과 카테고리별 지출 금액 및 비율을 조회한다.")
    @GetMapping("/category")
    public ResponseBody<CategoryAnalysisResponse> getCategoryAnalysis(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @Parameter(description = "조회 연도", example = "2024")
            @Min(value = 1, message = "연도는 1 이상이어야 합니다.")
            @Max(value = 9999, message = "연도는 9999 이하여야 합니다.")
            @RequestParam(name = "year") int year,
            @Parameter(description = "조회 월", example = "7")
            @Min(value = 1, message = "월은 1 이상이어야 합니다.")
            @Max(value = 12, message = "월은 12 이하여야 합니다.")
            @RequestParam(name = "month") int month) {
        CategoryAnalysisResponse response =
                analysisService.getCategoryAnalysis(authenticatedUser.getUserId(), year, month);

        return ResponseUtil.createSuccessResponse(response);
    }
}

