package com.a508.backend.auth.token;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RefreshTokenRepository
	extends JpaRepository<RefreshToken, Long> {

	Optional<RefreshToken> findByUser_Id(
		Long userId
	);

	void deleteByUser_Id(
		Long userId
	);
}