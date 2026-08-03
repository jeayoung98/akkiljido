package com.a508.backend.domain.fcm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.a508.backend.domain.fcm.entity.UserPushToken;

@Repository
public interface UserPushTokenRepository extends JpaRepository<UserPushToken, Long> {

	Optional<UserPushToken> findByPushToken(String pushToken);

	List<UserPushToken> findAllByUser_IdOrderByIdAsc(Long userId);
}
