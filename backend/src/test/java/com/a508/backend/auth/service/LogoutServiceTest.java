package com.a508.backend.auth.service;

import static org.mockito.Mockito.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.a508.backend.auth.token.RefreshTokenRepository;

@ExtendWith(MockitoExtension.class)
class LogoutServiceTest {

	@Mock
	private RefreshTokenRepository refreshTokenRepository;

	private LogoutService logoutService;

	@BeforeEach
	void setUp() {
		logoutService = new LogoutService(refreshTokenRepository);
	}

	@Test
	@DisplayName("로그아웃하면 회원의 Refresh Token을 삭제한다")
	void logout() {
		// given
		Long userId = 1L;

		// when
		logoutService.logout(userId);

		// then
		verify(refreshTokenRepository).deleteByUser_Id(userId);
	}
}