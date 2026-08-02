package com.a508.backend.domain.analysis.dto.response;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/** 선택한 월의 총지출과 등록한 내 장소별 지출 분석을 제공하는 응답. */
@Schema(description = "월별 내 장소 지출 분석 응답")
public record MyPlaceAnalysisResponse(

        @Schema(description = "해당 월의 전체 지출", example = "490000")
        Long totalAmount,

        @Schema(description = "등록한 내 장소별 지출 분석")
        List<MyPlaceExpenseResponse> categories
) {
}
