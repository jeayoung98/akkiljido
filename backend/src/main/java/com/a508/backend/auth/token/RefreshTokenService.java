package com.a508.backend.auth.token;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.user.domain.User;

@Service
public class RefreshTokenService {

	private static final String HASH_ALGORITHM = "SHA-256";

	private final RefreshTokenRepository refreshTokenRepository;

	public RefreshTokenService(RefreshTokenRepository refreshTokenRepository) {
		this.refreshTokenRepository = refreshTokenRepository;
	}

	@Transactional
	public void saveOrReplace(User user, String rawRefreshToken, Instant expiresAt) {
		String tokenHash = hash(rawRefreshToken);

		refreshTokenRepository.findByUser_Id(user.getId())
			.ifPresentOrElse(refreshToken -> refreshToken.rotate(tokenHash, expiresAt),
				() -> saveNewRefreshToken(user, tokenHash, expiresAt));
	}

	@Transactional(readOnly = true)
	public void verifyStoredToken(Long userId, String rawRefreshToken, Instant now) {
		RefreshToken storedToken = refreshTokenRepository.findByUser_Id(userId).orElseThrow(this::invalidRefreshToken);

		if (storedToken.isExpired(now)) {
			throw invalidRefreshToken();
		}

		String requestedTokenHash = hash(rawRefreshToken);

		if (!matches(storedToken.getTokenHash(), requestedTokenHash)) {
			throw invalidRefreshToken();
		}
	}

	private void saveNewRefreshToken(User user, String tokenHash, Instant expiresAt) {
		RefreshToken refreshToken = RefreshToken.create(user, tokenHash, expiresAt);

		refreshTokenRepository.save(refreshToken);
	}

	private String hash(String rawRefreshToken) {
		try {
			MessageDigest messageDigest = MessageDigest.getInstance(HASH_ALGORITHM);

			byte[] tokenBytes = rawRefreshToken.getBytes(StandardCharsets.UTF_8);

			byte[] hashedBytes = messageDigest.digest(tokenBytes);

			return HexFormat.of().formatHex(hashedBytes);
		} catch (NoSuchAlgorithmException exception) {
			throw new BusinessException(ExceptionType.UNEXPECTED_SERVER_ERROR);
		}
	}

	private boolean matches(String storedHash, String requestedHash) {
		byte[] storedHashBytes = storedHash.getBytes(StandardCharsets.UTF_8);

		byte[] requestedHashBytes = requestedHash.getBytes(StandardCharsets.UTF_8);

		return MessageDigest.isEqual(storedHashBytes, requestedHashBytes);
	}

	private BusinessException invalidRefreshToken() {
		return new BusinessException(ExceptionType.INVALID_REFRESH_TOKEN);
	}
}
