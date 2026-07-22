package com.a508.backend.auth.google;

public record GoogleUserProfile (
        String subject,
        String email,
        boolean emailVerified,
        String name,
        String profileImageUrl
){

}
