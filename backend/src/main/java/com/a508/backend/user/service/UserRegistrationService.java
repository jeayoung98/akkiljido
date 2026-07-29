package com.a508.backend.user.service;

import com.a508.backend.auth.token.AuthTokens;
import com.a508.backend.auth.token.RefreshTokenService;
import com.a508.backend.auth.token.TokenIssuer;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.user.domain.User;
import com.a508.backend.user.dto.NicknameRegistrationResult;
import com.a508.backend.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserRegistrationService {

    private final UserRepository userRepository;
    private final TokenIssuer tokenIssuer;
    private final RefreshTokenService refreshTokenService;

    public UserRegistrationService(
            UserRepository userRepository,
            TokenIssuer tokenIssuer,
            RefreshTokenService refreshTokenService
    ) {
        this.userRepository = userRepository;
        this.tokenIssuer = tokenIssuer;
        this.refreshTokenService = refreshTokenService;
    }

    @Transactional
    public NicknameRegistrationResult completeRegistration(
            Long userId,
            String nickname
    ) {
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(
                                () -> new BusinessException(
                                        ExceptionType.UNAUTHENTICATED
                                )
                        );

        validateGuest(user);

        String normalizedNickname =
                nickname.trim();

        user.completeRegistration(
                normalizedNickname
        );

        AuthTokens tokens =
                tokenIssuer.issue(user);

        refreshTokenService.saveOrReplace(
                user,
                tokens.refreshToken(),
                tokens.refreshTokenExpiresAt()
        );

        return new NicknameRegistrationResult(
                user.getNickname(),
                user.getRole(),
                tokens
        );
    }

    private void validateGuest(User user) {
        if (!user.isGuest()) {
            throw new BusinessException(
                    ExceptionType.AUTHORIZATION_DENIED
            );
        }
    }
}