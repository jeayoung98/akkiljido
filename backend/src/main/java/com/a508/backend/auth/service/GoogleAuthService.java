package com.a508.backend.auth.service;

import com.a508.backend.auth.dto.GoogleLoginResult;
import com.a508.backend.auth.google.GoogleIdTokenValidator;
import com.a508.backend.auth.google.GoogleIdentity;
import com.a508.backend.auth.token.AuthTokens;
import com.a508.backend.auth.token.RefreshTokenService;
import com.a508.backend.auth.token.TokenIssuer;
import com.a508.backend.member.domain.Member;
import com.a508.backend.member.domain.OAuthProvider;
import com.a508.backend.member.repository.MemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GoogleAuthService {

    private final GoogleIdTokenValidator googleIdTokenValidator;
    private final MemberRepository memberRepository;
    private final TokenIssuer tokenIssuer;
    private final RefreshTokenService refreshTokenService;

    public GoogleAuthService(
            GoogleIdTokenValidator googleIdTokenValidator,
            MemberRepository memberRepository,
            TokenIssuer tokenIssuer,
            RefreshTokenService refreshTokenService
    ) {
        this.googleIdTokenValidator = googleIdTokenValidator;
        this.memberRepository = memberRepository;
        this.tokenIssuer = tokenIssuer;
        this.refreshTokenService = refreshTokenService;
    }

    @Transactional
    public GoogleLoginResult authenticate(String rawIdToken) {
        GoogleIdentity googleIdentity =
                googleIdTokenValidator.validate(rawIdToken);

        Member member =
                findOrCreateGoogleMember(
                        googleIdentity.subject()
                );

        AuthTokens tokens =
                tokenIssuer.issue(member);

        refreshTokenService.saveOrReplace(
                member,
                tokens.refreshToken(),
                tokens.refreshTokenExpiresAt()
        );


        return new GoogleLoginResult(
                member.getRole(),
                member.isGuest(),
                tokens
        );
    }

    private Member findOrCreateGoogleMember(
            String providerSub
    ) {
        return memberRepository
                .findByProviderAndProviderSub(
                        OAuthProvider.GOOGLE,
                        providerSub
                )
                .orElseGet(
                        () -> createGoogleGuest(providerSub)
                );
    }

    private Member createGoogleGuest(
            String providerSub
    ) {
        Member guest =
                Member.createGoogleGuest(providerSub);

        return memberRepository.save(guest);
    }
}