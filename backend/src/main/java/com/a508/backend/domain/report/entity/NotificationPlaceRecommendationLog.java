package com.a508.backend.domain.report.entity;

import java.time.OffsetDateTime;

import org.locationtech.jts.geom.Point;

import com.a508.backend.domain.user.domain.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 장소알림 추천 이력. ERD 의 notification_place_recommendation_log 테이블과 매핑된다.
 * <p>
 * 핵심 용도는 **중복 추천 방지(쿨다운)** — 추천 후보 장소가 사용자당 한 자릿수라서(검증 데이터 기준 7곳)
 * 같은 곳을 매주 다시 추천하면 몇 주 안에 기능이 무의미해진다. "최근 N주 안에 추천한 장소 제외"가
 * 이 테이블을 읽는 유일한 경로다.
 * <p>
 * ⚠ ERD 대비 created_at 컬럼을 추가했다 — 쿨다운 판정("최근 N주")에 시간이 필수인데 ERD 에는 없다.
 *   (백엔드 선합의 대상. 추천 시간대·이유까지 남길지는 별도 제안 — 실험 로그 발견 #144)
 */
@Entity
@Getter
@Table(name = "notification_place_recommendation_log")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NotificationPlaceRecommendationLog {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "recommendation_log_id")
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "report_id", nullable = false)
	private Report report;

	/** 추천 장소명(거래명 기준). 쿨다운 판정의 키. */
	@Column(name = "place_name", nullable = false, length = 20)
	private String placeName;

	@Column(columnDefinition = "TEXT", nullable = false)
	private String address;

	@Column(columnDefinition = "geometry(Point,4326)", nullable = false)
	private Point coordinate;

	/** 추천 생성 시각. 쿨다운("최근 N주 내 추천 제외") 판정용 — ERD 에 없어 추가한 컬럼. */
	@Column(name = "created_at", nullable = false)
	private OffsetDateTime createdAt;

	@Builder
	private NotificationPlaceRecommendationLog(User user, Report report, String placeName,
		String address, Point coordinate, OffsetDateTime createdAt) {
		this.user = user;
		this.report = report;
		this.placeName = placeName;
		this.address = address;
		this.coordinate = coordinate;
		this.createdAt = createdAt;
	}
}
