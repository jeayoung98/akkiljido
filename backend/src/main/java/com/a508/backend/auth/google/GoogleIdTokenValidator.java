package com.a508.backend.auth.google;

public interface GoogleIdTokenValidator {
	GoogleIdentity validate(String rawIdToken);
}
