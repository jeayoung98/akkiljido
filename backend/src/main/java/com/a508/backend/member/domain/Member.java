package com.a508.backend.member.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
        name = "users",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_users_provider_provider_sub",
                        columnNames = {
                                "provider",
                                "provider_sub"
                        }
                )

        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(
            name = "provider",
            nullable = false,
            length = 10
    )
    private OAuthProvider provider;

    @Column(
            name = "provider_sub",
            nullable = false,
            length = 255
    )
    private String providerSub;

    // 닉네임은 자동 회원가입을 진행시키기에, nickname 설정을 나중에 하므로 nullabel하게 두었다.
    @Column(
            name = "nickname",
            length = 20
    )
    private String nickname;

    @Enumerated(EnumType.STRING)
    @Column(
            name = "role",
            nullable = false,
            length = 10
    )
    private MemberRole role;

    private Member(
            OAuthProvider provider,
            String providerSub,
            String nickname,
            MemberRole role
    ) {
        this.provider = provider;
        this.providerSub = providerSub;
        this.nickname = nickname;
        this.role = role;
    }

    public static Member createGoogleGuest(
            String providerSub
    ) {
        return  new Member(
                OAuthProvider.GOOGLE,
                providerSub,
                null,
                MemberRole.GUEST
        );
    }

    public void completeRegistration(String nickname){
        this.nickname = nickname;
        this.role = MemberRole.USER;
    }

    public boolean isGuest(){
        return role == MemberRole.GUEST;
    }

    public boolean isUser(){
        return role == MemberRole.USER;
    }

}
