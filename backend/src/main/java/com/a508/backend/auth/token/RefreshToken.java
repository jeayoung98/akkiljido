package com.a508.backend.auth.token;

import java.time.Instant;

import com.a508.backend.user.domain.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
	name = "refresh_tokens",
	uniqueConstraints = {
		@UniqueConstraint(
			name = "uk_refresh_tokens_user_id",
			columnNames = "user_id"
		)
	}
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RefreshToken {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "refresh_token_id")
	private Long id;

	@OneToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(
		name = "user_id",
		nullable = false
	)
	private User user;

	@Column(
		name = "token_hash",
		nullable = false,
		length = 64
	)
	private String tokenHash;

	@Column(
		name = "expires_at",
		nullable = false
	)
	private Instant expiresAt;

	private RefreshToken(
		User user,
		String tokenHash,
		Instant expiresAt
	) {
		this.user = user;
		this.tokenHash = tokenHash;
		this.expiresAt = expiresAt;
	}

	public static RefreshToken create(
		User user,
		String tokenHash,
		Instant expiresAt
	) {
		return new RefreshToken(
			user,
			tokenHash,
			expiresAt
		);
	}

	public void rotate(
		String tokenHash,
		Instant expiresAt
	) {
		this.tokenHash = tokenHash;
		this.expiresAt = expiresAt;
	}

	public boolean isExpired(Instant now) {
		return !expiresAt.isAfter(now);
	}
}