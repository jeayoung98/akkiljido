package com.a508.backend.auth.service;

import com.a508.backend.auth.dto.TokenReissueResult;
import com.a508.backend.auth.token.AuthTokens;
import com.a508.backend.auth.token.RefreshTokenService;
import com.a508.backend.auth.token.RefreshTokenValidator;
import com.a508.backend.auth.token.TokenIssuer;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.member.domain.Member;
import com.a508.backend.member.repository.MemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class TokenReissueService {

    private final RefreshTokenValidator
            refreshTokenValidator;

    private final RefreshTokenService
            refreshTokenService;

    private final MemberRepository
            memberRepository;

    private final TokenIssuer
            tokenIssuer;

    public TokenReissueService(
            RefreshTokenValidator refreshTokenValidator,
            RefreshTokenService refreshTokenService,
            MemberRepository memberRepository,
            TokenIssuer tokenIssuer
    ) {
        this.refreshTokenValidator =
                refreshTokenValidator;

        this.refreshTokenService =
                refreshTokenService;

        this.memberRepository =
                memberRepository;

        this.tokenIssuer =
                tokenIssuer;
    }

    @Transactional
    public TokenReissueResult reissue(
            String rawRefreshToken
    ) {
        Long memberId =
                refreshTokenValidator
                        .validateAndExtractMemberId(
                                rawRefreshToken
                        );

        refreshTokenService.verifyStoredToken(
                memberId,
                rawRefreshToken,
                Instant.now()
        );

        Member member =
                memberRepository
                        .findById(memberId)
                        .orElseThrow(
                                this::invalidRefreshToken
                        );

        AuthTokens newTokens =
                tokenIssuer.issue(member);

        refreshTokenService.saveOrReplace(
                member,
                newTokens.refreshToken(),
                newTokens.refreshTokenExpiresAt()
        );

        return new TokenReissueResult(
                newTokens
        );
    }

    private BusinessException invalidRefreshToken() {
        return new BusinessException(
                ExceptionType.INVALID_REFRESH_TOKEN
        );
    }
}