package com.a508.backend.domain.notification.entity;

import java.time.LocalTime;

import org.locationtech.jts.geom.Point;

import com.a508.backend.domain.user.domain.User;
import com.a508.backend.global.util.GeometryUtils;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 사용자가 설정한 알림 장소와 알림 시간 범위를 관리하는 엔티티. */
@Getter
@Entity
@Table(
	name = "notification_place",
	uniqueConstraints = {
		@UniqueConstraint(
			name = "uk_notification_place_user_name",
			columnNames = {
				"user_id",
				"notification_place_name"
			}
		)
	}
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NotificationPlace {

	private static final long NOTIFICATION_WINDOW_MINUTES = 30L;

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "notification_place_id")
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@Column(
		name = "notification_place_name",
		nullable = false,
		length = 20
	)
	private String notificationPlaceName;

	@Column(
		name = "address",
		nullable = false,
		length = 50
	)
	private String address;

	@Column(
		name = "coordinate",
		nullable = false,
		columnDefinition = "geometry(Point, 4326)"
	)
	private Point coordinate;

	@Column(name = "start_time", nullable = false)
	private LocalTime startTime;

	@Column(name = "end_time", nullable = false)
	private LocalTime endTime;

	@Column(
		name = "reason",
		nullable = false,
		length = 100
	)
	private String reason;

	private NotificationPlace(
		User user,
		String notificationPlaceName,
		String address,
		Point coordinate,
		LocalTime notificationTime,
		String reason
	) {
		this.user = user;
		this.notificationPlaceName = notificationPlaceName;
		this.address = address;
		this.coordinate = coordinate;
		this.reason = reason;
		updateNotificationTime(notificationTime);
	}

	/** 기준 알림 시각을 중심으로 전후 30분의 알림 장소를 생성한다. */
	public static NotificationPlace create(
		User user,
		String notificationPlaceName,
		String address,
		Double latitude,
		Double longitude,
		LocalTime notificationTime,
		String reason
	) {
		return new NotificationPlace(
			user,
			notificationPlaceName,
			address,
			GeometryUtils.toPoint(latitude, longitude),
			notificationTime,
			reason
		);
	}

	/** 기준 알림 시각을 중심으로 시작 및 종료 시각을 각각 30분 전후로 변경한다. */
	public void updateNotificationTime(LocalTime notificationTime) {
		this.startTime = notificationTime.minusMinutes(NOTIFICATION_WINDOW_MINUTES);
		this.endTime = notificationTime.plusMinutes(NOTIFICATION_WINDOW_MINUTES);
	}

	public Double getLatitude() {
		return GeometryUtils.latitudeOf(coordinate);
	}

	public Double getLongitude() {
		return GeometryUtils.longitudeOf(coordinate);
	}
}
