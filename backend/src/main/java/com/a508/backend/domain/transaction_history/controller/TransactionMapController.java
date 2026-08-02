package com.a508.backend.domain.transaction_history.controller;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.a508.backend.domain.transaction_history.dto.response.MapPlaceListResponse;
import com.a508.backend.domain.transaction_history.dto.response.MapRegionListResponse;
import com.a508.backend.domain.transaction_history.dto.response.MyPlaceMapResponse;
import com.a508.backend.domain.transaction_history.dto.response.MyPlaceTransactionListResponse;
import com.a508.backend.domain.transaction_history.service.TransactionMapService;
import com.a508.backend.global.response.ResponseBody;
import com.a508.backend.global.response.ResponseUtil;
import com.a508.backend.global.security.AuthenticatedUser;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@Tag(name = "거래내역-지도", description = "지도 기반 거래내역 조회 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/transaction/map")
public class TransactionMapController {

	private final TransactionMapService transactionMapService;

	@Operation(summary = "거래내역 목록 조회 - 지도 가계별",
		description = "지도 화면 영역(south/west/north/east) 안의 지출 거래내역을 좌표(가계) 단위로 묶어 조회한다. "
			+ "기간 기본값은 이번 주 월요일 ~ 오늘이다.")
	@GetMapping
	public ResponseBody<MapPlaceListResponse> getPlaceMap(
		@AuthenticationPrincipal AuthenticatedUser authenticatedUser,
		@Parameter(description = "남쪽 위도", example = "37.4900") @RequestParam double south,
		@Parameter(description = "서쪽 경도", example = "126.9100") @RequestParam double west,
		@Parameter(description = "북쪽 위도", example = "37.5700") @RequestParam double north,
		@Parameter(description = "동쪽 경도", example = "127.0500") @RequestParam double east,
		@Parameter(description = "조회 시작일(yyyy-MM-dd)", example = "2026-07-27") @RequestParam(required = false) String startDate,
		@Parameter(description = "조회 종료일(yyyy-MM-dd)", example = "2026-08-01") @RequestParam(required = false) String endDate,
		@Parameter(description = "카테고리 ID. 미지정 시 전체 조회", example = "3") @RequestParam(required = false) Long categoryId) {
		MapPlaceListResponse response = transactionMapService.getPlaceMap(
			authenticatedUser.getUserId(), south, west, north, east, startDate, endDate, categoryId);
		return ResponseUtil.createSuccessResponse(response);
	}

	// depth 는 숫자만 허용한다. 그래야 /map/my-place 가 이 매핑과 모호해지지 않는다.
	@Operation(summary = "거래내역 목록 조회 - 지도 시도/시군구/읍면동",
		description = "지도 화면 영역 안의 지출 거래내역을 행정구역 단위(1: 시도, 2: 시군구, 3: 읍면동)로 묶어 조회한다.")
	@GetMapping("/{depth:\\d+}")
	public ResponseBody<MapRegionListResponse> getRegionMap(
		@AuthenticationPrincipal AuthenticatedUser authenticatedUser,
		@Parameter(description = "행정구역 단위(1: 시/도, 2: 시/군/구, 3: 읍/면/동)", example = "2") @PathVariable Integer depth,
		@Parameter(description = "남쪽 위도", example = "37.4900") @RequestParam double south,
		@Parameter(description = "서쪽 경도", example = "126.9100") @RequestParam double west,
		@Parameter(description = "북쪽 위도", example = "37.5700") @RequestParam double north,
		@Parameter(description = "동쪽 경도", example = "127.0500") @RequestParam double east,
		@Parameter(description = "조회 시작일(yyyy-MM-dd)", example = "2026-07-27") @RequestParam(required = false) String startDate,
		@Parameter(description = "조회 종료일(yyyy-MM-dd)", example = "2026-08-01") @RequestParam(required = false) String endDate,
		@Parameter(description = "카테고리 ID. 미지정 시 전체 조회", example = "3") @RequestParam(required = false) Long categoryId) {
		MapRegionListResponse response = transactionMapService.getRegionMap(
			authenticatedUser.getUserId(), depth, south, west, north, east, startDate, endDate, categoryId);
		return ResponseUtil.createSuccessResponse(response);
	}

	@Operation(summary = "거래내역 내 장소 목록 조회 - 지도",
		description = "등록한 내 장소 목록과 각 장소 반경 2km 안에서 발생한 지출 합계를 조회한다.")
	@GetMapping("/my-place")
	public ResponseBody<List<MyPlaceMapResponse>> getMyPlaceMap(
		@AuthenticationPrincipal AuthenticatedUser authenticatedUser,
		@Parameter(description = "조회 시작일(yyyy-MM-dd)", example = "2026-07-27") @RequestParam(required = false) String startDate,
		@Parameter(description = "조회 종료일(yyyy-MM-dd)", example = "2026-08-01") @RequestParam(required = false) String endDate) {
		List<MyPlaceMapResponse> response = transactionMapService.getMyPlaceMap(
			authenticatedUser.getUserId(), startDate, endDate);
		return ResponseUtil.createSuccessResponse(response);
	}

	@Operation(summary = "거래내역 내 장소 상세조회",
		description = "내 장소 반경 2km 안의 지출 거래내역을 항목(좌표/이름/카테고리)별로 묶어 조회한다.")
	@GetMapping("/my-place/{placeId}")
	public ResponseBody<MyPlaceTransactionListResponse> getMyPlaceDetail(
		@AuthenticationPrincipal AuthenticatedUser authenticatedUser,
		@Parameter(description = "내 장소 ID", example = "1") @PathVariable Long placeId,
		@Parameter(description = "조회 시작일(yyyy-MM-dd)", example = "2026-07-27") @RequestParam(required = false) String startDate,
		@Parameter(description = "조회 종료일(yyyy-MM-dd)", example = "2026-08-01") @RequestParam(required = false) String endDate) {
		MyPlaceTransactionListResponse response = transactionMapService.getMyPlaceDetail(
			authenticatedUser.getUserId(), placeId, startDate, endDate);
		return ResponseUtil.createSuccessResponse(response);
	}
}
