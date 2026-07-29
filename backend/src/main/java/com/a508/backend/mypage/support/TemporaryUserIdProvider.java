package com.a508.backend.mypage.support;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("local")
public class TemporaryUserIdProvider implements CurrentUserIdProvider {

    private static final Long TEMPORARY_USER_ID = 1L;

    @Override
    public Long getCurrentUserId() {
        return TEMPORARY_USER_ID;
    }
}
