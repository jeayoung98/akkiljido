package com.a508.backend.member.repository;

import com.a508.backend.member.domain.Member;
import com.a508.backend.member.domain.OAuthProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MemberRepository extends JpaRepository<Member, Long> {
    Optional<Member> findByProviderAndProviderSub(
            OAuthProvider provider,
            String providerSub
    );

    boolean existsByProviderAndProviderSub(
            OAuthProvider provider,
            String providerSub
    );

}
