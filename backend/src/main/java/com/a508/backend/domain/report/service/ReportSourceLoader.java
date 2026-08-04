package com.a508.backend.domain.report.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.a508.backend.domain.mypage.service.MyPlaceService;
import com.a508.backend.domain.report.entity.ReportPeriod;
import com.a508.backend.domain.report.repository.ReportStatRepository;

import lombok.RequiredArgsConstructor;

/**
 * 리포트 계산 입력({@link ReportSource})을 한 번에 적재한다.
 * 배치가 사용자·기간을 정하면, 이후의 모든 계산(통계·사실·추천)은 DB 를 다시 읽지 않는다.
 */
@Service
@RequiredArgsConstructor
public class ReportSourceLoader {

	private final ReportStatRepository reportStatRepository;
	private final MyPlaceService myPlaceService;

	@Transactional(readOnly = true)
	public ReportSource load(Long userId, ReportPeriod period) {
		return new ReportSource(
			userId,
			period,
			reportStatRepository.findTransactionsForReport(
				userId, period.startDateTime(), period.endDateTime()),
			myPlaceService.getOwnedMyPlaces(userId));
	}
}
