package com.a508.backend.auth.google;

import jakarta.validation.constraints.NotEmpty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.util.List;

@Validated
@ConfigurationProperties(prefix = "auth.google")
public record GoogleAuthProperties(
        @NotEmpty(message = "Google 허용 Audience는 최소 하나 필요합니다.")
        List<String> allowedAudiences
) {
}
