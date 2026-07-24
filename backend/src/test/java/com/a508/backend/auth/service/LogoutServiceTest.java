package com.a508.backend.auth.service;

import com.a508.backend.auth.token.RefreshTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class LogoutServiceTest {

    @Mock
    private RefreshTokenRepository
            refreshTokenRepository;

    private LogoutService logoutService;

    @BeforeEach
    void setUp() {
        logoutService =
                new LogoutService(
                        refreshTokenRepository
                );
    }

    @Test
    @DisplayName(
            "로그아웃하면 회원의 Refresh Token을 삭제한다"
    )
    void logout() {
        // given
        Long memberId = 1L;

        // when
        logoutService.logout(memberId);

        // then
        verify(refreshTokenRepository)
                .deleteByMember_Id(memberId);
    }
}