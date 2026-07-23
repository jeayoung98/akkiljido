package com.a508.backend.auth.google;

import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class GoogleIdTokenValidatorImpl
        implements GoogleIdTokenValidator {

    private final JwtDecoder googleIdTokenDecoder;

    public GoogleIdTokenValidatorImpl(
            @Qualifier("googleIdTokenDecoder")
            JwtDecoder googleIdTokenDecoder
    ) {
        this.googleIdTokenDecoder = googleIdTokenDecoder;
    }

    @Override
    public GoogleIdentity validate(String rawIdToken) {
        if (!StringUtils.hasText(rawIdToken)) {
            throw invalidGoogleIdToken();
        }

        try {
            Jwt jwt = googleIdTokenDecoder.decode(rawIdToken);

            String subject = jwt.getSubject();

            if (!StringUtils.hasText(subject)) {
                throw invalidGoogleIdToken();
            }

            return new GoogleIdentity(
                    subject
            );
        } catch (JwtException exception) {
            throw invalidGoogleIdToken();
        }
    }

    private BusinessException invalidGoogleIdToken() {
        return new BusinessException(
                ExceptionType.INVALID_GOOGLE_ID_TOKEN
        );
    }
}