package com.a508.backend.member.controller;

import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.global.response.ResponseBody;
import com.a508.backend.global.response.ResponseUtil;
import com.a508.backend.member.dto.NicknameRegistrationRequest;
import com.a508.backend.member.dto.NicknameRegistrationResponse;
import com.a508.backend.member.dto.NicknameRegistrationResult;
import com.a508.backend.member.service.MemberRegistrationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
public class MemberController {

    private final MemberRegistrationService
            memberRegistrationService;

    public MemberController(
            MemberRegistrationService
                    memberRegistrationService
    ) {
        this.memberRegistrationService =
                memberRegistrationService;
    }

    @PatchMapping("/me/nickname")
    public ResponseEntity<
            ResponseBody<NicknameRegistrationResponse>
            > registerNickname(
            @AuthenticationPrincipal Jwt jwt,

            @Valid @RequestBody
            NicknameRegistrationRequest request
    ) {
        Long memberId =
                parseMemberId(
                        jwt.getSubject()
                );

        NicknameRegistrationResult result =
                memberRegistrationService
                        .completeRegistration(
                                memberId,
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

    private Long parseMemberId(
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
