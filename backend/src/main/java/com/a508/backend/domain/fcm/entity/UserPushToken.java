package com.a508.backend.domain.fcm.entity;

import com.a508.backend.domain.user.domain.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 사용자의 기기별 푸시 알림 토큰. */
@Getter
@Entity
@Table(name = "user_push_tokens")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserPushToken {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "push_token_id")
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@Enumerated(EnumType.STRING)
	@Column(name = "device_type", nullable = false, length = 10)
	private DeviceType deviceType;

	@Column(name = "push_token", nullable = false, columnDefinition = "TEXT")
	private String pushToken;

	private UserPushToken(User user, DeviceType deviceType, String pushToken) {
		this.user = user;
		this.deviceType = deviceType;
		this.pushToken = pushToken;
	}

	public static UserPushToken create(User user, DeviceType deviceType, String pushToken) {
		return new UserPushToken(user, deviceType, pushToken);
	}

	/** 기존 토큰을 현재 로그인한 사용자와 기기에 다시 연결한다. */
	public void updateRegistration(User user, DeviceType deviceType) {
		this.user = user;
		this.deviceType = deviceType;
	}
}
