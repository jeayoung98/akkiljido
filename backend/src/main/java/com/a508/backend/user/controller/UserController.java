package com.a508.backend.user.controller;

import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.global.response.ResponseBody;
import com.a508.backend.global.response.ResponseUtil;
import com.a508.backend.user.dto.NicknameRegistrationRequest;
import com.a508.backend.user.dto.NicknameRegistrationResponse;
import com.a508.backend.user.dto.NicknameRegistrationResult;
import com.a508.backend.user.service.UserRegistrationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserRegistrationService
            userRegistrationService;

    public UserController(
            UserRegistrationService
                    userRegistrationService
    ) {
        this.userRegistrationService =
                userRegistrationService;
    }

    @PatchMapping("/me/nickname")
    public ResponseEntity<
            ResponseBody<NicknameRegistrationResponse>
            > registerNickname(
            @AuthenticationPrincipal Jwt jwt,

            @Valid @RequestBody
            NicknameRegistrationRequest request
    ) {
        Long userId =
                parseUserId(
                        jwt.getSubject()
                );

        NicknameRegistrationResult result =
                userRegistrationService
                        .completeRegistration(
                                userId,
                                request.nickname()
                        );

        NicknameRegistrationResponse data =
                NicknameRegistrationResponse.from(
                        result
                );

        return ResponseEntity.ok(
                ResponseUtil.createSuccessResponse(
                        data
                )
        );
    }

    private Long parseUserId(
            String subject
    ) {
        try {
            return Long.valueOf(subject);
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
