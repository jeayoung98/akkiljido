package com.a508.backend.auth.token;

import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class RefreshTokenValidator {

    private final JwtDecoder refreshTokenDecoder;

    public RefreshTokenValidator(
            @Qualifier("serviceRefreshTokenDecoder")
            JwtDecoder refreshTokenDecoder
    ) {
        this.refreshTokenDecoder =
                refreshTokenDecoder;
    }

    public Long validateAndExtractUserId(
            String rawRefreshToken
    ) {
        if (!StringUtils.hasText(rawRefreshToken)) {
            throw invalidRefreshToken();
        }

        try {
            Jwt jwt =
                    refreshTokenDecoder.decode(
                            rawRefreshToken
                    );

            Long userId =
                    Long.valueOf(
                            jwt.getSubject()
                    );

            if (userId <= 0) {
                throw invalidRefreshToken();
            }

            return userId;
        } catch (
                JwtException |
                NumberFormatException exception
        ) {
            throw invalidRefreshToken();
        }
    }

    private BusinessException invalidRefreshToken() {
        return new BusinessException(
                ExceptionType.INVALID_REFRESH_TOKEN
        );
    }
}