package com.a508.backend.domain.user.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.a508.backend.domain.user.domain.User;
import com.a508.backend.domain.user.repository.UserRepository;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

	private static final Long USER_ID = 1L;

	@Mock
	private UserRepository userRepository;

	@InjectMocks
	private UserService userService;

	@Test
	@DisplayName("존재하는 회원이면 엔티티를 반환한다")
	void returnsUser() {
		User user = User.createGoogleGuest("sub");
		when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

		assertThat(userService.getUser(USER_ID)).isSameAs(user);
	}

	@Test
	@DisplayName("토큰은 유효하지만 회원이 삭제된 경우 UNAUTHENTICATED 예외를 던진다")
	void throwsWhenUserNotFound() {
		when(userRepository.findById(USER_ID)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> userService.getUser(USER_ID))
			.isInstanceOf(BusinessException.class)
			.extracting(e -> ((BusinessException)e).getExceptionType())
			.isEqualTo(ExceptionType.UNAUTHENTICATED);
	}
}
