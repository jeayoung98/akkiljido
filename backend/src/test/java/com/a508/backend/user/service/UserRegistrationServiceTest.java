package com.a508.backend.user.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.a508.backend.auth.token.AuthTokens;
import com.a508.backend.auth.token.RefreshTokenService;
import com.a508.backend.auth.token.TokenIssuer;
import com.a508.backend.domain.category.service.CategoryService;
import com.a508.backend.domain.user.service.UserRegistrationService;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.domain.user.domain.User;
import com.a508.backend.domain.user.domain.UserRole;
import com.a508.backend.domain.user.dto.NicknameRegistrationResult;
import com.a508.backend.domain.user.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class UserRegistrationServiceTest {

	@Mock
	private UserRepository userRepository;

	@Mock
	private TokenIssuer tokenIssuer;

	@Mock
	private RefreshTokenService refreshTokenService;

	@Mock
	private CategoryService categoryService;

	private UserRegistrationService userRegistrationService;

	@BeforeEach
	void setUp() {
		userRegistrationService = new UserRegistrationService(userRepository, tokenIssuer, refreshTokenService,
			categoryService);
	}

	@Test
	@DisplayName("GUEST가 닉네임을 설정하면 USER로 변경하고 새 토큰을 발급한다")
	void completeGuestRegistration() {
		// given
		Long userId = 1L;

		User guest = createSavedGuest(userId);

		AuthTokens issuedTokens = createAuthTokens();

		given(userRepository.findById(userId)).willReturn(Optional.of(guest));

		given(tokenIssuer.issue(guest)).willReturn(issuedTokens);

		// when
		NicknameRegistrationResult result = userRegistrationService.completeRegistration(userId, "  홍길동  ");

		// then
		assertThat(guest.getNickname()).isEqualTo("홍길동");

		assertThat(guest.getRole()).isEqualTo(UserRole.USER);

		assertThat(result.nickname()).isEqualTo("홍길동");

		assertThat(result.role()).isEqualTo(UserRole.USER);

		assertThat(result.tokens()).isSameAs(issuedTokens);

		verify(tokenIssuer).issue(guest);

		verify(refreshTokenService).saveOrReplace(guest, issuedTokens.refreshToken(),
			issuedTokens.refreshTokenExpiresAt());
	}

	@Test
	@DisplayName("존재하지 않는 회원은 닉네임을 설정할 수 없다")
	void rejectMissingUser() {
		// given
		Long userId = 999L;

		given(userRepository.findById(userId)).willReturn(Optional.empty());

		// when & then
		assertThatThrownBy(() -> userRegistrationService.completeRegistration(userId, "홍길동")).isInstanceOf(
			BusinessException.class).satisfies(exception -> {
			BusinessException businessException = (BusinessException)exception;

			assertThat(businessException.getExceptionType()).isEqualTo(ExceptionType.UNAUTHENTICATED);
		});

		verify(tokenIssuer, never()).issue(any(User.class));

		verify(refreshTokenService, never()).saveOrReplace(any(User.class), any(String.class), any(Instant.class));
	}

	private User createSavedGuest(Long userId) {
		User user = User.createGoogleGuest("google-sub-123");

		ReflectionTestUtils.setField(user, "id", userId);

		return user;
	}

	private AuthTokens createAuthTokens() {
		return new AuthTokens("test-user-access-token", "test-user-refresh-token", 1800L,
			Instant.parse("2026-08-07T00:00:00Z"));
	}

	@Test
	@DisplayName("GUEST 의 최초 가입 시에만 기본 카테고리를 생성한다")
	void createsDefaultCategoriesOnFirstRegistration() {
		// given
		Long userId = 1L;

		User guest = createSavedGuest(userId);

		given(userRepository.findById(userId)).willReturn(Optional.of(guest));

		given(tokenIssuer.issue(guest)).willReturn(createAuthTokens());

		// when
		userRegistrationService.completeRegistration(userId, "홍길동");

		// then
		verify(categoryService).createDefaultCategories(guest);
	}

	@Test
	@DisplayName("이미 가입을 마친 USER 가 닉네임을 변경해도 기본 카테고리를 다시 생성하지 않는다")
	void doesNotRecreateDefaultCategoriesForRegisteredUser() {
		// given
		Long userId = 1L;

		User registered = createSavedGuest(userId);

		registered.completeRegistration("홍길동");

		given(userRepository.findById(userId)).willReturn(Optional.of(registered));

		given(tokenIssuer.issue(registered)).willReturn(createAuthTokens());

		// when
		NicknameRegistrationResult result = userRegistrationService.completeRegistration(userId, "  김철수  ");

		// then
		assertThat(registered.getNickname()).isEqualTo("김철수");

		assertThat(registered.getRole()).isEqualTo(UserRole.USER);

		assertThat(result.nickname()).isEqualTo("김철수");

		verify(categoryService, never()).createDefaultCategories(any(User.class));
	}

	@Test
	@DisplayName("닉네임 설정 API 를 두 번 호출해도 기본 카테고리는 한 번만 생성된다")
	void createsDefaultCategoriesOnlyOnceAcrossRepeatedCalls() {
		// given
		Long userId = 1L;

		User user = createSavedGuest(userId);

		given(userRepository.findById(userId)).willReturn(Optional.of(user));

		given(tokenIssuer.issue(user)).willReturn(createAuthTokens());

		// when
		userRegistrationService.completeRegistration(userId, "홍길동");

		userRegistrationService.completeRegistration(userId, "김철수");

		// then
		verify(categoryService, times(1)).createDefaultCategories(user);
	}
}
