package com.a508.backend.auth.token;

import com.a508.backend.member.domain.Member;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    private static final String SHA_256_OF_ABC =
            "ba7816bf8f01cfea414140de5dae2223"
                    + "b00361a396177a9cb410ff61f20015ad";

    @Mock
    private RefreshTokenRepository
            refreshTokenRepository;

    private RefreshTokenService
            refreshTokenService;

    @BeforeEach
    void setUp() {
        refreshTokenService =
                new RefreshTokenService(
                        refreshTokenRepository
                );
    }

    @Test
    @DisplayName(
            "기존 Refresh Token이 없으면 원문을 해싱하여 저장한다"
    )
    void saveNewRefreshTokenWhenTokenDoesNotExist() {
        // given
        Member member =
                createSavedMember();

        String rawRefreshToken = "abc";

        Instant expiresAt =
                Instant.parse(
                        "2026-08-07T00:00:00Z"
                );

        given(
                refreshTokenRepository
                        .findByMember_Id(member.getId())
        ).willReturn(
                Optional.empty()
        );

        // when
        refreshTokenService.saveOrReplace(
                member,
                rawRefreshToken,
                expiresAt
        );

        // then
        ArgumentCaptor<RefreshToken> captor =
                ArgumentCaptor.forClass(
                        RefreshToken.class
                );

        verify(refreshTokenRepository)
                .save(captor.capture());

        RefreshToken savedRefreshToken =
                captor.getValue();

        assertThat(savedRefreshToken.getMember())
                .isSameAs(member);

        assertThat(savedRefreshToken.getTokenHash())
                .isEqualTo(SHA_256_OF_ABC);

        assertThat(savedRefreshToken.getTokenHash())
                .isNotEqualTo(rawRefreshToken);

        assertThat(savedRefreshToken.getTokenHash())
                .hasSize(64);

        assertThat(savedRefreshToken.getExpiresAt())
                .isEqualTo(expiresAt);
    }

    @Test
    @DisplayName(
            "기존 Refresh Token이 있으면 해시와 만료시각을 교체한다"
    )
    void rotateExistingRefreshToken() {
        // given
        Member member =
                createSavedMember();

        Instant oldExpiresAt =
                Instant.parse(
                        "2026-07-30T00:00:00Z"
                );

        RefreshToken existingRefreshToken =
                RefreshToken.create(
                        member,
                        "old-token-hash",
                        oldExpiresAt
                );

        String newRawRefreshToken = "abc";

        Instant newExpiresAt =
                Instant.parse(
                        "2026-08-07T00:00:00Z"
                );

        given(
                refreshTokenRepository
                        .findByMember_Id(member.getId())
        ).willReturn(
                Optional.of(
                        existingRefreshToken
                )
        );

        // when
        refreshTokenService.saveOrReplace(
                member,
                newRawRefreshToken,
                newExpiresAt
        );

        // then
        assertThat(
                existingRefreshToken.getTokenHash()
        ).isEqualTo(
                SHA_256_OF_ABC
        );

        assertThat(
                existingRefreshToken.getExpiresAt()
        ).isEqualTo(
                newExpiresAt
        );

        verify(refreshTokenRepository, never())
                .save(any(RefreshToken.class));
    }

    private Member createSavedMember() {
        Member member =
                Member.createGoogleGuest(
                        "google-sub-123"
                );

        ReflectionTestUtils.setField(
                member,
                "id",
                1L
        );

        return member;
    }
}