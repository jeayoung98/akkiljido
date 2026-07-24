package com.a508.backend.member.service;

import com.a508.backend.auth.token.AuthTokens;
import com.a508.backend.auth.token.RefreshTokenService;
import com.a508.backend.auth.token.TokenIssuer;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.member.domain.Member;
import com.a508.backend.member.dto.NicknameRegistrationResult;
import com.a508.backend.member.repository.MemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MemberRegistrationService {

    private final MemberRepository memberRepository;
    private final TokenIssuer tokenIssuer;
    private final RefreshTokenService refreshTokenService;

    public MemberRegistrationService(
            MemberRepository memberRepository,
            TokenIssuer tokenIssuer,
            RefreshTokenService refreshTokenService
    ) {
        this.memberRepository = memberRepository;
        this.tokenIssuer = tokenIssuer;
        this.refreshTokenService = refreshTokenService;
    }

    @Transactional
    public NicknameRegistrationResult completeRegistration(
            Long memberId,
            String nickname
    ) {
        Member member =
                memberRepository
                        .findById(memberId)
                        .orElseThrow(
                                () -> new BusinessException(
                                        ExceptionType.UNAUTHENTICATED
                                )
                        );

        validateGuest(member);

        String normalizedNickname =
                nickname.trim();

        member.completeRegistration(
                normalizedNickname
        );

        AuthTokens tokens =
                tokenIssuer.issue(member);

        refreshTokenService.saveOrReplace(
                member,
                tokens.refreshToken(),
                tokens.refreshTokenExpiresAt()
        );

        return new NicknameRegistrationResult(
                member.getNickname(),
                member.getRole(),
                tokens
        );
    }

    private void validateGuest(Member member) {
        if (!member.isGuest()) {
            throw new BusinessException(
                    ExceptionType.AUTHORIZATION_DENIED
            );
        }
    }
}