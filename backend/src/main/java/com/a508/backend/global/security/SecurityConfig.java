package com.a508.backend.global.security;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,

            @Qualifier("serviceJwtDecoder")
            JwtDecoder serviceJwtDecoder,

            MemberRoleJwtAuthenticationConverter
                    authenticationConverter
    ) throws Exception {

        http
                .csrf(csrf ->
                        csrf.disable()
                )
                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )
                .authorizeHttpRequests(authorize ->
                        authorize
                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/v1/auth/oauth/google"
                                )
                                .permitAll()

                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/v1/auth/token/reissue"
                                )
                                .permitAll()

                                .requestMatchers(
                                        "/api/health",
                                        "/actuator/health",
                                        "/swagger-ui/**",
                                        "/v3/api-docs/**"
                                )
                                .permitAll()

                                .requestMatchers(
                                        HttpMethod.PATCH,
                                        "/api/v1/members/me/nickname"
                                )
                                .hasRole("GUEST")

                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/v1/auth/logout"
                                )
                                .hasAnyRole(
                                        "GUEST",
                                        "USER"
                                )

                                .anyRequest()
                                .hasRole("USER")
                )
                .oauth2ResourceServer(resourceServer ->
                        resourceServer.jwt(jwt ->
                                jwt
                                        .decoder(
                                                serviceJwtDecoder
                                        )
                                        .jwtAuthenticationConverter(
                                                authenticationConverter
                                        )
                        )
                );

        return http.build();
    }
}