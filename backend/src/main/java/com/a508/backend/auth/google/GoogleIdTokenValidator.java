package com.a508.backend.auth.google;

public interface GoogleIdTokenValidator {
    GoogleUserProfile validate(String rawIdToken);
}
