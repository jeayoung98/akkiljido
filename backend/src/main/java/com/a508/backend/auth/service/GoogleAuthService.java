package com.a508.backend.auth.service;

import com.a508.backend.auth.google.GoogleIdTokenValidator;
import com.a508.backend.auth.google.GoogleIdentity;
import com.a508.backend.member.domain.Member;
import com.a508.backend.member.domain.OAuthProvider;
import com.a508.backend.member.repository.MemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GoogleAuthService {

    private final GoogleIdTokenValidator googleIdTokenValidator;
    private final MemberRepository memberRepository;

    public GoogleAuthService(
            GoogleIdTokenValidator googleIdTokenValidator,
            MemberRepository memberRepository
    ) {
        this.googleIdTokenValidator = googleIdTokenValidator;
        this.memberRepository = memberRepository;
    }

    @Transactional
    public Member authenticate(String rawIdToken) {
        GoogleIdentity googleIdentity =
                googleIdTokenValidator.validate(rawIdToken);

        return memberRepository
                .findByProviderAndProviderSub(
                        OAuthProvider.GOOGLE,
                        googleIdentity.subject()
                )
                .orElseGet(
                        () -> createGoogleGuest(
                                googleIdentity.subject()
                        )
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