package com.a508.backend.user.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.BDDMockito.*;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.user.domain.OAuthProvider;
import com.a508.backend.user.domain.User;
import com.a508.backend.user.domain.UserRole;
import com.a508.backend.user.dto.UserProfileResult;
import com.a508.backend.user.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class UserProfileServiceTest {

	private static final Long USER_ID = 1L;

	@Mock
	private UserRepository userRepository;

	private UserProfileService userProfileService;

	@BeforeEach
	void setUp() {
		userProfileService =
			new UserProfileService(userRepository);
	}

	@Test
	@DisplayName("사용자 ID로 내 프로필을 조회한다")
	void getMyProfile() {
		User user =
			User.createGoogleGuest("google-provider-sub");

		ReflectionTestUtils.setField(
			user,
			"id",
			USER_ID
		);

		user.completeRegistration("Dust");

		given(userRepository.findById(USER_ID))
			.willReturn(Optional.of(user));

		UserProfileResult result =
			userProfileService.getMyProfile(USER_ID);

		assertThat(result.userId())
			.isEqualTo(USER_ID);

		assertThat(result.nickname())
			.isEqualTo("Dust");

		assertThat(result.provider())
			.isEqualTo(OAuthProvider.GOOGLE);

		assertThat(result.role())
			.isEqualTo(UserRole.USER);
	}

	@Test
	@DisplayName("사용자가 존재하지 않으면 인증 오류를 반환한다")
	void rejectMissingUser() {
		given(userRepository.findById(USER_ID))
			.willReturn(Optional.empty());

		BusinessException exception =
			catchThrowableOfType(
				() -> userProfileService
					.getMyProfile(USER_ID),
				BusinessException.class
			);

		assertThat(exception.getExceptionType())
			.isEqualTo(ExceptionType.UNAUTHENTICATED);
	}
}