package com.a508.backend.domain.user.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.a508.backend.auth.token.AuthTokens;
import com.a508.backend.auth.token.RefreshTokenService;
import com.a508.backend.auth.token.TokenIssuer;
import com.a508.backend.domain.category.service.CategoryService;
import com.a508.backend.domain.user.domain.User;
import com.a508.backend.domain.user.repository.UserRepository;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.domain.user.dto.NicknameRegistrationResult;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserRegistrationService {

	private final UserRepository userRepository;
	private final TokenIssuer tokenIssuer;
	private final RefreshTokenService refreshTokenService;
	private final CategoryService categoryService;

	/**
	 * 닉네임을 설정한다. GUEST 가 처음 호출하면 가입 완료 처리(USER 승격 + 기본 카테고리 생성)까지 수행하고,
	 * 이미 가입을 마친 USER 가 호출하면 닉네임만 변경한다.
	 * <p>
	 * 이 엔드포인트는 USER 도 호출할 수 있으므로(닉네임 변경 용도) 기본 카테고리 생성에 가드가 없으면
	 * 호출할 때마다 기본 카테고리 전체가 다시 INSERT 되어 개수가 배로 늘어난다.
	 */
	@Transactional
	public NicknameRegistrationResult completeRegistration(Long userId, String nickname) {
		User user = userRepository.findById(userId)
			.orElseThrow(() -> new BusinessException(ExceptionType.UNAUTHENTICATED));

		// completeRegistration 이 role 을 USER 로 바꾸므로, 그 전에 최초 가입 여부를 확정해 둔다.
		boolean firstRegistration = user.isGuest();

		String normalizedNickname = nickname.trim();
		user.completeRegistration(normalizedNickname);

		// 기본 카테고리는 최초 가입 시 1회만 생성한다.
		if (firstRegistration) {
			categoryService.createDefaultCategories(user);
		}

		AuthTokens tokens = tokenIssuer.issue(user);

		refreshTokenService.saveOrReplace(
			user,
			tokens.refreshToken(),
			tokens.refreshTokenExpiresAt()
		);

		return new NicknameRegistrationResult(
			user.getNickname(),
			user.getRole(),
			tokens
		);
	}
}
