package com.a508.backend.domain.report.controller;

import java.util.Locale;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.a508.backend.domain.report.dto.ReportNotifyResponse;
import com.a508.backend.domain.report.entity.ReportType;
import com.a508.backend.domain.report.service.ReportNotificationService;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.global.response.ResponseBody;
import com.a508.backend.global.response.ResponseUtil;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 시연 전용 컨트롤러 — 인증 없이(permitAll) 열려 있다. 스웨거에서 Try it out → Execute 만으로 동작한다.
 * <p>
 * ⚠ 전체 사용자에게 실제 푸시가 나가고 인증도 걸려 있지 않다. 시연·검증용이며,
 * 운영 배포 전에 이 컨트롤러와 {@code SecurityConfig} 의 {@code /api/v1/report/demo/**}
 * permitAll 규칙을 함께 제거해야 한다.
 */
@Tag(name = "리포트 (시연용)", description = "인증 없이 실행되는 시연 전용 API. 운영 배포 전 제거 대상")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/report/demo")
public class ReportDemoController {

	private final ReportNotificationService reportNotificationService;

	@Operation(summary = "전체 사용자에게 리포트 알림 발송 (시연용, 인증 불필요)",
		description = "아침 7시 알림 배치와 같은 동작을 즉시 실행한다. 다만 배치가 '직전 완결 기간'만 보는 것과 달리, "
			+ "시연 편의를 위해 사용자별 <b>가장 최근</b> 리포트를 보낸다. "
			+ "해당 유형의 리포트가 없는 사용자와 푸시 토큰이 없는 사용자는 건너뛴다. "
			+ "<b>멱등하지 않다 — 누를 때마다 푸시가 나간다.</b>")
	@PostMapping("/notify-all")
	public ResponseBody<ReportNotifyResponse> notifyAll(
		@Parameter(description = "리포트 유형(weekly/monthly). 미지정 시 monthly", example = "monthly")
		@RequestParam(required = false, defaultValue = "monthly") String type) {
		return ResponseUtil.createSuccessResponse(
			reportNotificationService.notifyLatest(parseType(type)));
	}

	private ReportType parseType(String type) {
		if (type == null || type.isBlank()) {
			return ReportType.MONTHLY;
		}
		try {
			return ReportType.valueOf(type.trim().toUpperCase(Locale.ROOT));
		} catch (IllegalArgumentException e) {
			throw new BusinessException(ExceptionType.BINDING_ERROR);
		}
	}
}
