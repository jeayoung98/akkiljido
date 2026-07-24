package com.a508.backend.global.security;

import jakarta.servlet.ServletContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SecurityConfigTest {

    private AnnotationConfigWebApplicationContext context;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        context =
                new AnnotationConfigWebApplicationContext();

        context.register(
                TestWebConfig.class,
                SecurityConfig.class,
                MemberRoleJwtAuthenticationConverter.class
        );

        ServletContext servletContext =
                new org.springframework.mock.web.MockServletContext();

        context.setServletContext(servletContext);
        context.refresh();

        mockMvc =
                MockMvcBuilders
                        .webAppContextSetup(context)
                        .apply(springSecurity())
                        .build();
    }

    @AfterEach
    void tearDown() {
        context.close();
    }

    @Test
    @DisplayName(
            "Google 로그인 API는 인증 없이 접근할 수 있다"
    )
    void permitGoogleLoginWithoutAuthentication()
            throws Exception {

        mockMvc.perform(
                        post(
                                "/api/v1/auth/oauth/google"
                        )
                )
                .andExpect(
                        status().isOk()
                );
    }

    @Test
    @DisplayName(
            "인증 없이 일반 API에 접근하면 401을 반환한다"
    )
    void rejectProtectedApiWithoutAuthentication()
            throws Exception {

        mockMvc.perform(
                        get(
                                "/api/v1/test/user"
                        )
                )
                .andExpect(
                        status().isUnauthorized()
                );
    }

    @Test
    @DisplayName(
            "GUEST는 닉네임 설정 API에 접근할 수 있다"
    )
    void permitNicknameApiForGuest()
            throws Exception {

        mockMvc.perform(
                        patch(
                                "/api/v1/members/me/nickname"
                        )
                                .with(
                                        jwt()
                                                .authorities(
                                                        new SimpleGrantedAuthority(
                                                                "ROLE_GUEST"
                                                        )
                                                )
                                )
                )
                .andExpect(
                        status().isOk()
                );
    }

    @Test
    @DisplayName(
            "GUEST는 일반 USER API에 접근할 수 없다"
    )
    void rejectUserApiForGuest()
            throws Exception {

        mockMvc.perform(
                        get(
                                "/api/v1/test/user"
                        )
                                .with(
                                        jwt()
                                                .authorities(
                                                        new SimpleGrantedAuthority(
                                                                "ROLE_GUEST"
                                                        )
                                                )
                                )
                )
                .andExpect(
                        status().isForbidden()
                );
    }

    @Test
    @DisplayName(
            "USER는 일반 API에 접근할 수 있다"
    )
    void permitProtectedApiForUser()
            throws Exception {

        mockMvc.perform(
                        get(
                                "/api/v1/test/user"
                        )
                                .with(
                                        jwt()
                                                .authorities(
                                                        new SimpleGrantedAuthority(
                                                                "ROLE_USER"
                                                        )
                                                )
                                )
                )
                .andExpect(
                        status().isOk()
                );
    }

    @Test
    @DisplayName(
            "GUEST와 USER는 로그아웃 API에 접근할 수 있다"
    )
    void permitLogoutForGuestAndUser()
            throws Exception {

        mockMvc.perform(
                        post(
                                "/api/v1/auth/logout"
                        )
                                .with(
                                        jwt()
                                                .authorities(
                                                        new SimpleGrantedAuthority(
                                                                "ROLE_GUEST"
                                                        )
                                                )
                                )
                )
                .andExpect(
                        status().isOk()
                );

        mockMvc.perform(
                        post(
                                "/api/v1/auth/logout"
                        )
                                .with(
                                        jwt()
                                                .authorities(
                                                        new SimpleGrantedAuthority(
                                                                "ROLE_USER"
                                                        )
                                                )
                                )
                )
                .andExpect(
                        status().isOk()
                );
    }

    @Configuration
    @EnableWebMvc
    @EnableWebSecurity
    static class TestWebConfig {

        @Bean
        JwtDecoder serviceJwtDecoder() {
            return token -> {
                throw new JwtException(
                        "실제 JWT 검증은 JwtConfigTest에서 수행한다."
                );
            };
        }

        @Bean
        SecurityTestController
        securityTestController() {
            return new SecurityTestController();
        }
    }

    @RestController
    static class SecurityTestController {

        @PostMapping(
                "/api/v1/auth/oauth/google"
        )
        void googleLogin() {
        }

        @PatchMapping(
                "/api/v1/members/me/nickname"
        )
        void updateNickname() {
        }

        @PostMapping(
                "/api/v1/auth/logout"
        )
        void logout() {
        }

        @GetMapping(
                "/api/v1/test/user"
        )
        void userApi() {
        }
    }
}