package com.a508.backend.auth.token;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;
import static org.mockito.Mockito.*;

import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.user.domain.User;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

	private static final String SHA_256_OF_ABC =
		"ba7816bf8f01cfea414140de5dae2223" + "b00361a396177a9cb410ff61f20015ad";

	@Mock
	private RefreshTokenRepository refreshTokenRepository;

	private RefreshTokenService refreshTokenService;

	@BeforeEach
	void setUp() {
		refreshTokenService = new RefreshTokenService(refreshTokenRepository);
	}

	@Test
	@DisplayName("기존 Refresh Token이 없으면 원문을 해싱하여 저장한다")
	void saveNewRefreshTokenWhenTokenDoesNotExist() {
		// given
		User user = createSavedUser();

		String rawRefreshToken = "abc";

		Instant expiresAt = Instant.parse("2026-08-07T00:00:00Z");

		given(refreshTokenRepository.findByUser_Id(user.getId())).willReturn(Optional.empty());

		// when
		refreshTokenService.saveOrReplace(user, rawRefreshToken, expiresAt);

		// then
		ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);

		verify(refreshTokenRepository).save(captor.capture());

		RefreshToken savedRefreshToken = captor.getValue();

		assertThat(savedRefreshToken.getUser()).isSameAs(user);

		assertThat(savedRefreshToken.getTokenHash()).isEqualTo(SHA_256_OF_ABC);

		assertThat(savedRefreshToken.getTokenHash()).isNotEqualTo(rawRefreshToken);

		assertThat(savedRefreshToken.getTokenHash()).hasSize(64);

		assertThat(savedRefreshToken.getExpiresAt()).isEqualTo(expiresAt);
	}

	@Test
	@DisplayName("기존 Refresh Token이 있으면 해시와 만료시각을 교체한다")
	void rotateExistingRefreshToken() {
		// given
		User user = createSavedUser();

		Instant oldExpiresAt = Instant.parse("2026-07-30T00:00:00Z");

		RefreshToken existingRefreshToken = RefreshToken.create(user, "old-token-hash", oldExpiresAt);

		String newRawRefreshToken = "abc";

		Instant newExpiresAt = Instant.parse("2026-08-07T00:00:00Z");

		given(refreshTokenRepository.findByUser_Id(user.getId())).willReturn(Optional.of(existingRefreshToken));

		// when
		refreshTokenService.saveOrReplace(user, newRawRefreshToken, newExpiresAt);

		// then
		assertThat(existingRefreshToken.getTokenHash()).isEqualTo(SHA_256_OF_ABC);

		assertThat(existingRefreshToken.getExpiresAt()).isEqualTo(newExpiresAt);

		verify(refreshTokenRepository, never()).save(any(RefreshToken.class));
	}

	@Test
	@DisplayName("요청한 Refresh Token 해시가 DB 값과 일치하면 검증에 성공한다")
	void verifyStoredRefreshToken() {
		// given
		User user = createSavedUser();

		Instant expiresAt = Instant.parse("2026-08-07T00:00:00Z");

		Instant now = Instant.parse("2026-08-01T00:00:00Z");

		RefreshToken storedToken = RefreshToken.create(user, SHA_256_OF_ABC, expiresAt);

		given(refreshTokenRepository.findByUser_Id(user.getId())).willReturn(Optional.of(storedToken));

		// when
		refreshTokenService.verifyStoredToken(user.getId(), "abc", now);

		// then
		verify(refreshTokenRepository).findByUser_Id(user.getId());
	}

	@Test
	@DisplayName("DB에 Refresh Token이 없으면 인증 예외를 발생시킨다")
	void rejectMissingStoredRefreshToken() {
		// given
		Long userId = 1L;

		given(refreshTokenRepository.findByUser_Id(userId)).willReturn(Optional.empty());

		// when & then
		assertInvalidRefreshToken(
			() -> refreshTokenService.verifyStoredToken(userId, "abc", Instant.parse("2026-08-01T00:00:00Z")));
	}

	@Test
	@DisplayName("DB에 저장된 Refresh Token이 만료됐으면 거부한다")
	void rejectExpiredStoredRefreshToken() {
		// given
		User user = createSavedUser();

		Instant now = Instant.parse("2026-08-07T00:00:00Z");

		RefreshToken expiredToken = RefreshToken.create(user, SHA_256_OF_ABC, now);

		given(refreshTokenRepository.findByUser_Id(user.getId())).willReturn(Optional.of(expiredToken));

		// when & then
		assertInvalidRefreshToken(() -> refreshTokenService.verifyStoredToken(user.getId(), "abc", now));
	}

	@Test
	@DisplayName("요청한 Refresh Token 해시가 DB 값과 다르면 거부한다")
	void rejectMismatchedRefreshToken() {
		// given
		User user = createSavedUser();

		RefreshToken storedToken = RefreshToken.create(user, SHA_256_OF_ABC, Instant.parse("2026-08-07T00:00:00Z"));

		given(refreshTokenRepository.findByUser_Id(user.getId())).willReturn(Optional.of(storedToken));

		// when & then
		assertInvalidRefreshToken(() -> refreshTokenService.verifyStoredToken(user.getId(), "different-token",
			Instant.parse("2026-08-01T00:00:00Z")));
	}

	private void assertInvalidRefreshToken(Runnable action) {
		assertThatThrownBy(action::run).isInstanceOf(BusinessException.class).satisfies(exception -> {
			BusinessException businessException = (BusinessException)exception;

			assertThat(businessException.getExceptionType()).isEqualTo(ExceptionType.INVALID_REFRESH_TOKEN);
		});
	}

	private User createSavedUser() {
		User user = User.createGoogleGuest("google-sub-123");

		ReflectionTestUtils.setField(user, "id", 1L);

		return user;
	}
}