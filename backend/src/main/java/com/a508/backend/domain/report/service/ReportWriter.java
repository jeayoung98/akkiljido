package com.a508.backend.domain.report.service;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.a508.backend.domain.report.dto.RecommendationItem;
import com.a508.backend.domain.report.dto.ReportEnvelope;
import com.a508.backend.domain.report.entity.NotificationPlaceRecommendationLog;
import com.a508.backend.domain.report.entity.Report;
import com.a508.backend.domain.report.entity.ReportType;
import com.a508.backend.domain.report.repository.NotificationPlaceRecommendationLogRepository;
import com.a508.backend.domain.report.repository.ReportRepository;
import com.a508.backend.domain.user.domain.User;
import com.a508.backend.domain.user.service.UserService;
import com.a508.backend.global.util.DateTimeUtils;
import com.a508.backend.global.util.GeometryUtils;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;

/**
 * 리포트 영속화 — 검증 완료된 봉투를 ai_answer 정본으로 저장하고 추천 이력을 남긴다.
 * LLM 호출(수 초짜리 HTTP)이 트랜잭션 안에 들어오지 않도록 배치 서비스와 분리된 컴포넌트다.
 */
@Service
@RequiredArgsConstructor
public class ReportWriter {

	private final ReportRepository reportRepository;
	private final NotificationPlaceRecommendationLogRepository recommendationLogRepository;
	private final UserService userService;
	private final ObjectMapper objectMapper;

	@Transactional
	public Report save(Long userId, ReportType type, ReportStatistics statistics, ReportEnvelope envelope) {
		User user = userService.getUser(userId);
		Report report = reportRepository.save(Report.builder()
			.user(user)
			.type(type)
			.totalCost(statistics.totalCost())
			.highestSpendingPlace(statistics.highestSpendingPlace())
			.mostFrequentPlace(statistics.mostFrequentPlace())
			.aiAnswer(serialize(envelope))
			.build());

		// 추천 이력 — 쿨다운("최근 N주 내 추천 제외") 판정의 근거. 리포트 저장과 같은 트랜잭션.
		OffsetDateTime now = OffsetDateTime.now(DateTimeUtils.SERVICE_ZONE);
		List<NotificationPlaceRecommendationLog> logs = envelope.recommendations().stream()
			.map(item -> NotificationPlaceRecommendationLog.builder()
				.user(user)
				.report(report)
				.placeName(item.placeName())
				.address(item.address())
				.coordinate(GeometryUtils.toPoint(item.latitude(), item.longitude()))
				.createdAt(now)
				.build())
			.toList();
		recommendationLogRepository.saveAll(logs);

		return report;
	}

	/** 저장 직렬화. 봉투는 우리가 만든 record 라 실패는 프로그래밍 오류다 — 감추지 않고 그대로 터뜨린다. */
	private String serialize(ReportEnvelope envelope) {
		try {
			return objectMapper.writeValueAsString(envelope);
		} catch (JacksonException e) {
			throw new IllegalStateException("리포트 봉투 직렬화 실패", e);
		}
	}
}
