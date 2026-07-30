package com.a508.backend.auth.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.a508.backend.auth.dto.LoginResult;
import com.a508.backend.auth.google.GoogleIdTokenValidator;
import com.a508.backend.auth.google.GoogleIdentity;
import com.a508.backend.auth.token.AuthTokens;
import com.a508.backend.auth.token.RefreshTokenService;
import com.a508.backend.auth.token.TokenIssuer;
import com.a508.backend.user.domain.OAuthProvider;
import com.a508.backend.user.domain.User;
import com.a508.backend.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GoogleAuthService {

	private final GoogleIdTokenValidator googleIdTokenValidator;
	private final UserRepository userRepository;
	private final TokenIssuer tokenIssuer;
	private final RefreshTokenService refreshTokenService;

	@Transactional
	public LoginResult authenticate(String rawIdToken) {
		GoogleIdentity googleIdentity = googleIdTokenValidator.validate(rawIdToken);

		User user = findOrCreateGoogleUser(googleIdentity.subject());

		AuthTokens tokens = tokenIssuer.issue(user);

		refreshTokenService.saveOrReplace(user, tokens.refreshToken(), tokens.refreshTokenExpiresAt());

		return new LoginResult(user.getRole(), tokens);
	}

	private User findOrCreateGoogleUser(String providerSub) {
		return userRepository.findByProviderAndProviderSub(OAuthProvider.GOOGLE, providerSub)
			.orElseGet(() -> createGoogleGuest(providerSub));
	}

	private User createGoogleGuest(String providerSub) {
		User guest = User.createGoogleGuest(providerSub);

		return userRepository.save(guest);
	}
}
