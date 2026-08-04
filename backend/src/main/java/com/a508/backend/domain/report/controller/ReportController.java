package com.a508.backend.domain.report.controller;

import java.util.List;
import java.util.Locale;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.a508.backend.domain.report.dto.ReportDetailResponse;
import com.a508.backend.domain.report.dto.ReportListResponse;
import com.a508.backend.domain.report.dto.ReportSummaryResponse;
import com.a508.backend.domain.report.entity.Report;
import com.a508.backend.domain.report.entity.ReportType;
import com.a508.backend.domain.report.service.ReportBatchService;
import com.a508.backend.domain.report.service.ReportQueryService;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.global.response.ResponseBody;
import com.a508.backend.global.response.ResponseUtil;
import com.a508.backend.global.security.AuthenticatedUser;
import com.a508.backend.global.util.DateTimeUtils;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@Tag(name = "리포트", description = "AI 소비 리포트 조회/생성 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/report")
public class ReportController {

	private final ReportQueryService reportQueryService;
	private final ReportBatchService reportBatchService;

	@Operation(summary = "리포트 목록 조회",
		description = "생성된 리포트 목록을 최신순으로 조회한다. type 미지정 시 주간·월간 전체.")
	@GetMapping("/list")
	public ResponseBody<ReportListResponse> getReports(
		@AuthenticationPrincipal AuthenticatedUser authenticatedUser,
		@Parameter(description = "리포트 유형(weekly/monthly). 미지정 시 전체", example = "weekly")
		@RequestParam(required = false) String type) {
		List<ReportSummaryResponse> reports =
			reportQueryService.getReports(authenticatedUser.getUserId(), parseType(type));
		return ResponseUtil.createSuccessResponse(ReportListResponse.of(reports));
	}

	@Operation(summary = "리포트 상세 조회",
		description = "리포트 본문(헤드라인·문단)과 요약 수치, 장소알림 추천을 구조화된 객체로 조회한다.")
	@GetMapping("/{reportId}")
	public ResponseBody<ReportDetailResponse> getReport(
		@AuthenticationPrincipal AuthenticatedUser authenticatedUser,
		@PathVariable Long reportId) {
		return ResponseUtil.createSuccessResponse(
			reportQueryService.getReport(authenticatedUser.getUserId(), reportId));
	}

	// 운영에서는 새벽 배치가 생성하지만, 시연·검증에서 배치 시각을 기다릴 수 없어 수동 트리거를 둔다.
	@Operation(summary = "리포트 즉시 생성 (시연·테스트용)",
		description = "직전 완결 기간(주간: 지난주 월~일 / 월간: 지난달)의 리포트를 즉시 생성한다. "
			+ "이미 생성된 기간이면 기존 리포트를 반환한다(멱등).")
	@PostMapping("/generate")
	public ResponseBody<ReportDetailResponse> generateReport(
		@AuthenticationPrincipal AuthenticatedUser authenticatedUser,
		@Parameter(description = "리포트 유형(weekly/monthly)", example = "weekly")
		@RequestParam String type) {
		ReportType reportType = parseType(type);
		if (reportType == null) {
			throw new BusinessException(ExceptionType.BINDING_ERROR);
		}
		Report report = reportBatchService.generate(
			authenticatedUser.getUserId(), reportType, DateTimeUtils.today());
		return ResponseUtil.createSuccessResponse(reportQueryService.toDetail(report));
	}

	/** weekly/monthly 파싱(대소문자 무관). null/blank/all 은 전체(null) — 목록 조회 전용 의미. */
	private ReportType parseType(String type) {
		if (type == null || type.isBlank() || type.equalsIgnoreCase("all")) {
			return null;
		}
		try {
			return ReportType.valueOf(type.toUpperCase(Locale.ROOT));
		} catch (IllegalArgumentException e) {
			throw new BusinessException(ExceptionType.BINDING_ERROR);
		}
	}
}
