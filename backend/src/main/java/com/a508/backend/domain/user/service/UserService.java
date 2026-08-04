package com.a508.backend.domain.user.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.a508.backend.domain.user.domain.User;
import com.a508.backend.domain.user.repository.UserRepository;
import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;

import lombok.RequiredArgsConstructor;

/**
 * 다른 도메인에서 회원 엔티티가 필요할 때 사용하는 진입점.
 * 회원 도메인 밖에서는 UserRepository 에 직접 접근하지 않고 이 서비스를 통한다.
 */
@Service
@RequiredArgsConstructor
public class UserService {

	private final UserRepository userRepository;

	/**
	 * 회원 엔티티를 조회한다. 존재하지 않으면 UNAUTHENTICATED 예외를 던진다.
	 * <p>
	 * userId 는 검증된 JWT 에서 오지만 토큰 발급 이후 회원이 삭제되었을 수 있다.
	 * getReferenceById 로 프록시만 걸면 이 경우가 INSERT 시점의 FK 위반(500)으로 드러나므로,
	 * 존재 여부를 여기서 확인해 DB 까지 내려보내지 않는다.
	 */
	@Transactional(readOnly = true)
	public User getUser(Long userId) {
		return userRepository.findById(userId)
			.orElseThrow(() -> new BusinessException(ExceptionType.UNAUTHENTICATED));
	}
}
