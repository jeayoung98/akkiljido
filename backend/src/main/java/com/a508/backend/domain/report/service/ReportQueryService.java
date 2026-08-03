package com.a508.backend.domain.report.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.a508.backend.domain.report.dto.ReportDetailResponse;
import com.a508.backend.domain.report.dto.ReportEnvelope;
import com.a508.backend.domain.report.dto.ReportSummaryResponse;
import com.a508.backend.domain.report.entity.Report;
import com.a508.backend.domain.report.entity.ReportType;
import com.a508.backend.domain.report.repository.ReportRepository;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import tools.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 리포트 조회 — ai_answer 의 봉투 JSON 을 역직렬화해 구조화된 응답으로 서빙한다.
 * 봉투는 저장 시점에 구조 검증을 통과한 정본이므로 여기서의 역직렬화 실패는 프로그래밍 오류다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReportQueryService {

	private final ReportRepository reportRepository;
	private final ObjectMapper objectMapper;

	/** 목록 조회. type null 이면 전체. 최신 생성분부터. */
	@Transactional(readOnly = true)
	public List<ReportSummaryResponse> getReports(Long userId, ReportType type) {
		List<Report> reports = type == null
			? reportRepository.findAllByUser_IdOrderByIdDesc(userId)
			: reportRepository.findAllByUser_IdAndTypeOrderByIdDesc(userId, type);
		return reports.stream()
			.map(report -> ReportSummaryResponse.of(report, deserialize(report)))
			.toList();
	}

	@Transactional(readOnly = true)
	public ReportDetailResponse getReport(Long userId, Long reportId) {
		Report report = reportRepository.findByIdAndUser_Id(reportId, userId)
			.orElseThrow(() -> new BusinessException(ExceptionType.REPORT_NOT_FOUND));
		return ReportDetailResponse.of(report, deserialize(report));
	}

	public ReportDetailResponse toDetail(Report report) {
		return ReportDetailResponse.of(report, deserialize(report));
	}

	private ReportEnvelope deserialize(Report report) {
		try {
			return objectMapper.readValue(report.getAiAnswer(), ReportEnvelope.class);
		} catch (Exception e) {
			// 저장 시 검증된 정본이라 도달하면 안 되는 경로 — 데이터 손상 신호이므로 숨기지 않는다.
			log.error("리포트 봉투 역직렬화 실패 (reportId={})", report.getId(), e);
			throw new IllegalStateException("리포트 봉투 역직렬화 실패: reportId=" + report.getId(), e);
		}
	}
}
