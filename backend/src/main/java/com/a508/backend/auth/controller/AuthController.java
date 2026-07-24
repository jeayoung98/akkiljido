package com.a508.backend.auth.controller;

import com.a508.backend.auth.dto.GoogleLoginRequest;
import com.a508.backend.auth.dto.GoogleLoginResponse;
import com.a508.backend.auth.dto.GoogleLoginResult;
import com.a508.backend.auth.dto.TokenReissueRequest;
import com.a508.backend.auth.dto.TokenReissueResponse;
import com.a508.backend.auth.dto.TokenReissueResult;
import com.a508.backend.auth.service.GoogleAuthService;
import com.a508.backend.auth.service.TokenReissueService;
import com.a508.backend.global.response.ResponseBody;
import com.a508.backend.global.response.ResponseUtil;
import com.a508.backend.auth.service.LogoutService;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final GoogleAuthService googleAuthService;
    private final TokenReissueService tokenReissueService;
    private final LogoutService logoutService;

    public AuthController(
            GoogleAuthService googleAuthService,
            TokenReissueService tokenReissueService,
            LogoutService logoutService
    ) {
        this.googleAuthService =
                googleAuthService;

        this.tokenReissueService =
                tokenReissueService;

        this.logoutService =
                logoutService;
    }

    @PostMapping("/oauth/google")
    public ResponseEntity<
            ResponseBody<GoogleLoginResponse>
            > googleLogin(
            @Valid @RequestBody
            GoogleLoginRequest request
    ) {
        GoogleLoginResult result =
                googleAuthService.authenticate(
                        request.idToken()
                );

        GoogleLoginResponse data =
                GoogleLoginResponse.from(
                        result
                );

        return ResponseEntity.ok(
                ResponseUtil.createSuccessResponse(
                        data
                )
        );
    }

    @PostMapping("/token/reissue")
    public ResponseEntity<
            ResponseBody<TokenReissueResponse>
            > reissueTokens(
            @Valid @RequestBody
            TokenReissueRequest request
    ) {
        TokenReissueResult result =
                tokenReissueService.reissue(
                        request.refreshToken()
                );

        TokenReissueResponse data =
                TokenReissueResponse.from(
                        result
                );

        return ResponseEntity.ok(
                ResponseUtil.createSuccessResponse(
                        data
                )
        );
    }

    @PostMapping("/logout")
    public ResponseEntity<ResponseBody<Void>> logout(
            @AuthenticationPrincipal Jwt jwt
    ) {
        Long memberId =
                parseMemberId(
                        jwt.getSubject()
                );

        logoutService.logout(memberId);

        return ResponseEntity.ok(
                ResponseUtil.createSuccessResponse()
        );
    }



    private Long parseMemberId(
            String subject
    ) {
        try {
            Long memberId =
                    Long.valueOf(subject);

            if (memberId <= 0) {
                throw new NumberFormatException();
            }

            return memberId;
        } catch (
                NumberFormatException |
                NullPointerException exception
        ) {
            throw new BusinessException(
                    ExceptionType.UNAUTHENTICATED
            );
        }
    }
}