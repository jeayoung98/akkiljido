package com.a508.backend.auth.controller;

import com.a508.backend.auth.dto.GoogleLoginResult;
import com.a508.backend.auth.service.GoogleAuthService;
import com.a508.backend.auth.token.AuthTokens;
import com.a508.backend.global.exception.GlobalExceptionHandler;
import com.a508.backend.member.domain.MemberRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private GoogleAuthService googleAuthService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        AuthController authController =
                new AuthController(
                        googleAuthService
                );

        mockMvc =
                MockMvcBuilders
                        .standaloneSetup(
                                authController
                        )
                        .setControllerAdvice(
                                new GlobalExceptionHandler()
                        )
                        .build();
    }

    @Test
    @DisplayName(
            "Google ID Token으로 로그인하고 자체 토큰을 반환한다"
    )
    void loginWithGoogleIdToken() throws Exception {
        // given
        String rawIdToken =
                "test-google-id-token";

        AuthTokens tokens =
                new AuthTokens(
                        "test-access-token",
                        "test-refresh-token",
                        1800L,
                        Instant.parse(
                                "2026-08-07T00:00:00Z"
                        )
                );

        GoogleLoginResult result =
                new GoogleLoginResult(
                        MemberRole.GUEST,
                        true,
                        tokens
                );

        given(
                googleAuthService.authenticate(
                        rawIdToken
                )
        ).willReturn(result);

        // when & then
        mockMvc.perform(
                        post(
                                "/api/v1/auth/oauth/google"
                        )
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(
                                        """
                                        {
                                          "idToken": "test-google-id-token"
                                        }
                                        """
                                )
                )
                .andExpect(
                        status().isOk()
                )
                .andExpect(
                        jsonPath("$.success")
                                .value(true)
                )
                .andExpect(
                        jsonPath("$.data.role")
                                .value("GUEST")
                )
                .andExpect(
                        jsonPath("$.data.nicknameRequired")
                                .value(true)
                )
                .andExpect(
                        jsonPath("$.data.accessToken")
                                .value(
                                        "test-access-token"
                                )
                )
                .andExpect(
                        jsonPath("$.data.refreshToken")
                                .value(
                                        "test-refresh-token"
                                )
                )
                .andExpect(
                        jsonPath(
                                "$.data.accessTokenExpiresIn"
                        ).value(1800)
                )
                .andExpect(
                        jsonPath(
                                "$.data.refreshTokenExpiresAt"
                        ).doesNotExist()
                );

        verify(googleAuthService)
                .authenticate(rawIdToken);
    }

    @Test
    @DisplayName(
            "Google ID Token이 비어 있으면 400 응답을 반환한다"
    )
    void rejectBlankGoogleIdToken() throws Exception {
        // when & then
        mockMvc.perform(
                        post(
                                "/api/v1/auth/oauth/google"
                        )
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(
                                        """
                                        {
                                          "idToken": ""
                                        }
                                        """
                                )
                )
                .andExpect(
                        status().isBadRequest()
                )
                .andExpect(
                        jsonPath("$.success")
                                .value(false)
                )
                .andExpect(
                        jsonPath("$.code")
                                .value("C002")
                )
                .andExpect(
                        jsonPath("$.msg")
                                .value(
                                        "Google ID Token은 필수입니다."
                                )
                );

        verify(googleAuthService, never())
                .authenticate(
                        org.mockito.ArgumentMatchers
                                .anyString()
                );
    }
}