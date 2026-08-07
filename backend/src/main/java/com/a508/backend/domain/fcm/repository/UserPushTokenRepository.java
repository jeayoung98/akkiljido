package com.a508.backend.domain.fcm.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.a508.backend.domain.fcm.entity.UserPushToken;

@Repository
public interface UserPushTokenRepository extends JpaRepository<UserPushToken, Long> {

	Optional<UserPushToken> findByPushToken(String pushToken);

	List<UserPushToken> findAllByUser_IdOrderByIdAsc(Long userId);

	long deleteByUser_IdAndPushToken(Long userId, String pushToken);

	/**
	 * 여러 사용자의 푸시 토큰을 한 번에 읽는다(알림 발송 배치 전용 — 사용자 수만큼 쿼리를 날리지 않기 위함).
	 * user 를 join fetch 하는 이유는 트랜잭션 밖에서 소유자 기준으로 묶기 때문이다.
	 * 호출부는 빈 컬렉션을 넘기지 않는다(일부 DB 에서 {@code in ()} 가 문법 오류다).
	 */
	@Query("select t from UserPushToken t join fetch t.user where t.user.id in :userIds order by t.id asc")
	List<UserPushToken> findAllByUserIdInWithUser(@Param("userIds") Collection<Long> userIds);
}
