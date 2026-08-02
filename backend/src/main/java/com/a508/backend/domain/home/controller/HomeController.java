package com.a508.backend.domain.home.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.a508.backend.domain.home.dto.response.CategorySummaryResponse;
import com.a508.backend.domain.home.dto.response.RecentExpenseResponse;
import com.a508.backend.domain.home.service.HomeService;
import com.a508.backend.global.response.ResponseBody;
import com.a508.backend.global.response.ResponseUtil;
import com.a508.backend.global.security.AuthenticatedUser;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@Tag(name = "홈", description = "홈 화면 집계 조회 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/home")
public class HomeController {

	private final HomeService homeService;

	@Operation(
		summary = "카테고리별 지출 Top N 조회",
		description = "이번 달 누적 지출을 카테고리별로 합산해 금액 상위 N개를 조회한다. limit 미전달 시 4개다. "
			+ "percent 는 상위 N개 밖 카테고리까지 포함한 이번 달 전체 지출 대비 비율을 반올림한 값이라 "
			+ "limit 을 바꿔도 값이 달라지지 않는다.")
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "조회 성공"),
		@ApiResponse(responseCode = "400", description = "카테고리 개수 범위 오류(H002)", content = @Content),
		@ApiResponse(responseCode = "401", description = "인증 정보 없음(A001)", content = @Content)
	})
	@GetMapping("/category-summary")
	public ResponseBody<CategorySummaryResponse> getCategorySummary(
		@AuthenticationPrincipal AuthenticatedUser authenticatedUser,

		@Parameter(description = "노출할 카테고리 개수. 미전달 시 4, 허용 범위 1~20", example = "4")
		@RequestParam(required = false) Integer limit) {
		CategorySummaryResponse response = homeService.getCategorySummary(authenticatedUser.getUserId(), limit);
		return ResponseUtil.createSuccessResponse(response);
	}

	@Operation(
		summary = "내 주변 최근 일주일 지출 조회",
		description = "기준 좌표 반경 안에서 발생한 최근 일주일(오늘 포함 7일) 지출을 항목명 단위로 합산해 조회한다. "
			+ "주소/좌표는 같은 항목명 중 가장 최근 거래의 값을 대표로 내려준다.")
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "조회 성공"),
		@ApiResponse(responseCode = "400", description = "좌표 범위 오류(G001/G002) 또는 반경 범위 오류(H001)", content = @Content),
		@ApiResponse(responseCode = "401", description = "인증 정보 없음(A001)", content = @Content)
	})
	@GetMapping("/recent-expenses")
	public ResponseBody<RecentExpenseResponse> getRecentExpenses(
		@AuthenticationPrincipal AuthenticatedUser authenticatedUser,

		@Parameter(description = "기준 위도", required = true, example = "37.5006")
		@RequestParam double latitude,

		@Parameter(description = "기준 경도", required = true, example = "127.0366")
		@RequestParam double longitude,

		@Parameter(description = "검색 반경(m). 미전달 시 2000, 허용 범위 1~50000", example = "2000")
		@RequestParam(required = false) Integer radius) {
		RecentExpenseResponse response = homeService.getRecentNearbyExpenses(
			authenticatedUser.getUserId(), latitude, longitude, radius);
		return ResponseUtil.createSuccessResponse(response);
	}
}
