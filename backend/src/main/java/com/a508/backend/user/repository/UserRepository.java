package com.a508.backend.user.repository;

import com.a508.backend.user.domain.User;
import com.a508.backend.user.domain.OAuthProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByProviderAndProviderSub(
            OAuthProvider provider,
            String providerSub
    );

    boolean existsByProviderAndProviderSub(
            OAuthProvider provider,
            String providerSub
    );

}
