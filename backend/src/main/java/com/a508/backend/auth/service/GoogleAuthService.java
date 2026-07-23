package com.a508.backend.auth.service;

import com.a508.backend.auth.google.GoogleIdTokenValidator;
import com.a508.backend.auth.google.GoogleIdentity;
import org.springframework.stereotype.Service;

@Service
public class GoogleAuthService {
    private final GoogleIdTokenValidator googleIdTokenValidator;

    public GoogleAuthService(
            GoogleIdTokenValidator googleIdTokenValidator
    ) {
        this.googleIdTokenValidator = googleIdTokenValidator;
    }

    public GoogleIdentity authenticate(String rawIdToken){
        return googleIdTokenValidator.validate(rawIdToken);
    }
}
