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

    public AuthController(
            GoogleAuthService googleAuthService,
            TokenReissueService tokenReissueService
    ) {
        this.googleAuthService =
                googleAuthService;

        this.tokenReissueService =
                tokenReissueService;
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
}