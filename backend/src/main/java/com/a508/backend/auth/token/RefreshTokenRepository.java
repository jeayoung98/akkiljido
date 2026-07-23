package com.a508.backend.auth.token;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RefreshTokenRepository
        extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByMember_Id(
            Long memberId
    );

    void deleteByMember_Id(
            Long memberId
    );
}