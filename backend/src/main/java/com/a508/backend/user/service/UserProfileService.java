package com.a508.backend.user.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.user.domain.User;
import com.a508.backend.user.dto.UserProfileResult;
import com.a508.backend.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserProfileService {

	private final UserRepository userRepository;

	@Transactional(readOnly = true)
	public UserProfileResult getMyProfile(Long userId) {
		User user = userRepository.findById(userId)
			.orElseThrow(() -> new BusinessException(ExceptionType.UNAUTHENTICATED));

		return UserProfileResult.from(user);
	}
}