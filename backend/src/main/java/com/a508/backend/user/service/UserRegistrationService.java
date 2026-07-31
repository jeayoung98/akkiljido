package com.a508.backend.user.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.a508.backend.auth.token.AuthTokens;
import com.a508.backend.auth.token.RefreshTokenService;
import com.a508.backend.auth.token.TokenIssuer;
import com.a508.backend.domain.category.service.CategoryService;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.user.domain.User;
import com.a508.backend.user.dto.NicknameRegistrationResult;
import com.a508.backend.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserRegistrationService {

	private final UserRepository userRepository;
	private final TokenIssuer tokenIssuer;
	private final RefreshTokenService refreshTokenService;
	private final CategoryService categoryService;

	@Transactional
	public NicknameRegistrationResult completeRegistration(Long userId, String nickname) {
		User user = userRepository.findById(userId)
			.orElseThrow(() -> new BusinessException(ExceptionType.UNAUTHENTICATED));

		String normalizedNickname = nickname.trim();

		user.completeRegistration(normalizedNickname);

		categoryService.createDefaultCategories(user);

		AuthTokens tokens = tokenIssuer.issue(user);

		refreshTokenService.saveOrReplace(user, tokens.refreshToken(), tokens.refreshTokenExpiresAt());

		return new NicknameRegistrationResult(user.getNickname(), user.getRole(), tokens);
	}
}
