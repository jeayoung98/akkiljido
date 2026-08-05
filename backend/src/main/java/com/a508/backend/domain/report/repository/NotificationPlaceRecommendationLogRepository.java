package com.a508.backend.domain.report.repository;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.a508.backend.domain.report.entity.NotificationPlaceRecommendationLog;

public interface NotificationPlaceRecommendationLogRepository
	extends JpaRepository<NotificationPlaceRecommendationLog, Long> {

	/**
	 * 쿨다운 판정용: 기준 시각 이후 이 사용자에게 추천된 장소명 목록.
	 * 추천 추출기가 "최근 N주 내 추천한 장소 제외" 필터에 사용한다.
	 */
	@Query("select distinct l.placeName from NotificationPlaceRecommendationLog l "
		+ "where l.user.id = :userId and l.createdAt >= :after")
	List<String> findRecommendedPlaceNamesSince(@Param("userId") Long userId,
		@Param("after") OffsetDateTime after);
}
