package com.a508.backend.auth.service;

import com.a508.backend.auth.token.RefreshTokenRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LogoutService {

    private final RefreshTokenRepository
            refreshTokenRepository;

    public LogoutService(
            RefreshTokenRepository refreshTokenRepository
    ) {
        this.refreshTokenRepository =
                refreshTokenRepository;
    }

    @Transactional
    public void logout(Long userId) {
        refreshTokenRepository
                .deleteByUser_Id(userId);
    }
}