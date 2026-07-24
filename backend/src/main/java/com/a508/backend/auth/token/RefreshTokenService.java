package com.a508.backend.auth.token;

import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;
import com.a508.backend.member.domain.Member;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;

@Service
public class RefreshTokenService {

    private static final String HASH_ALGORITHM =
            "SHA-256";

    private final RefreshTokenRepository
            refreshTokenRepository;

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository
    ) {
        this.refreshTokenRepository =
                refreshTokenRepository;
    }

    @Transactional
    public void saveOrReplace(
            Member member,
            String rawRefreshToken,
            Instant expiresAt
    ) {
        String tokenHash =
                hash(rawRefreshToken);

        refreshTokenRepository
                .findByMember_Id(member.getId())
                .ifPresentOrElse(
                        refreshToken ->
                                refreshToken.rotate(
                                        tokenHash,
                                        expiresAt
                                ),
                        () -> saveNewRefreshToken(
                                member,
                                tokenHash,
                                expiresAt
                        )
                );
    }

    @Transactional(readOnly = true)
    public void verifyStoredToken(
            Long memberId,
            String rawRefreshToken,
            Instant now
    ) {
        RefreshToken storedToken =
                refreshTokenRepository
                        .findByMember_Id(memberId)
                        .orElseThrow(
                                this::invalidRefreshToken
                        );

        if (storedToken.isExpired(now)) {
            throw invalidRefreshToken();
        }

        String requestedTokenHash =
                hash(rawRefreshToken);

        if (!matches(
                storedToken.getTokenHash(),
                requestedTokenHash
        )) {
            throw invalidRefreshToken();
        }
    }

    private void saveNewRefreshToken(
            Member member,
            String tokenHash,
            Instant expiresAt
    ) {
        RefreshToken refreshToken =
                RefreshToken.create(
                        member,
                        tokenHash,
                        expiresAt
                );

        refreshTokenRepository.save(
                refreshToken
        );
    }

    private String hash(
            String rawRefreshToken
    ) {
        try {
            MessageDigest messageDigest =
                    MessageDigest.getInstance(
                            HASH_ALGORITHM
                    );

            byte[] tokenBytes =
                    rawRefreshToken.getBytes(
                            StandardCharsets.UTF_8
                    );

            byte[] hashedBytes =
                    messageDigest.digest(
                            tokenBytes
                    );

            return HexFormat.of()
                    .formatHex(hashedBytes);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(
                    "SHA-256 알고리즘을 사용할 수 없습니다.",
                    exception
            );
        }
    }

    private boolean matches(
            String storedHash,
            String requestedHash
    ) {
        byte[] storedHashBytes =
                storedHash.getBytes(
                        StandardCharsets.UTF_8
                );

        byte[] requestedHashBytes =
                requestedHash.getBytes(
                        StandardCharsets.UTF_8
                );

        return MessageDigest.isEqual(
                storedHashBytes,
                requestedHashBytes
        );
    }

    private BusinessException invalidRefreshToken() {
        return new BusinessException(
                ExceptionType.INVALID_REFRESH_TOKEN
        );
    }
}