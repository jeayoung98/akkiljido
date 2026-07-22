package com.a508.backend.auth.controller;

import com.a508.backend.auth.dto.GoogleLoginReceiptResponse;
import com.a508.backend.auth.dto.GoogleLoginRequest;
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

    // Google ID Token을 받아오는 api
    // 앱(프론트엔드)에서 구글 로그인을 진행한 뒤 받았던 Google ID Token을 받아온다.
    @PostMapping("/oauth/google")
    public ResponseEntity<ResponseBody<GoogleLoginReceiptResponse>> googleLogin(
            @Valid @RequestBody GoogleLoginRequest request
            ){
        GoogleLoginReceiptResponse data = new GoogleLoginReceiptResponse(
                true,
                "Google ID Token을 전달받았습니다."
        );

        return ResponseEntity.ok(ResponseUtil.createSuccessResponse(data));
    }

}
