package com.a508.backend.domain.analysis.dto.response;

import com.a508.backend.domain.mypage.domain.MyPlace;

import io.swagger.v3.oas.annotations.media.Schema;

/** 등록한 내 장소의 반경 2km 내 지출 금액과 비율을 나타내는 응답. */
@Schema(description = "월별 내 장소 지출")
public record MyPlaceExpenseResponse(

        @Schema(description = "내 장소 ID", example = "2")
        Long placeId,

        @Schema(description = "사용자가 설정한 내 장소 이름", example = "회사")
        String myPlaceName,

        @Schema(description = "내 장소 반경 2km 내 지출 합계", example = "182000")
        Long amount,

        @Schema(description = "월 전체 지출 대비 내 장소 지출 비율", example = "37")
        Integer percent
) {

    /** 내 장소와 반경 내 지출 합계를 이용해 응답을 생성한다. */
    public static MyPlaceExpenseResponse of(MyPlace myPlace, long amount, long totalAmount) {
        int percent = totalAmount == 0
                ? 0
                : (int)Math.round((double)amount * 100 / totalAmount);

        return new MyPlaceExpenseResponse(
                myPlace.getId(),
                myPlace.getMyPlaceName(),
                amount,
                percent
        );
    }
}
