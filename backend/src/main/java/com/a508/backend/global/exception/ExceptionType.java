package com.a508.backend.global.exception;

import org.springframework.http.HttpStatus;

import lombok.AllArgsConstructor;
import lombok.Getter;

import static org.springframework.http.HttpStatus.*;

@Getter
@AllArgsConstructor
public enum ExceptionType {
    
    // common
    UNEXPECTED_SERVER_ERROR(INTERNAL_SERVER_ERROR, "C001", "예상치 못한 에러 발생"),
    BINDING_ERROR(BAD_REQUEST, "C002", "바인딩시 에러 발생"),
    ESSENTIAL_FIELD_MISSING_ERROR(BAD_REQUEST, "C003", "필수적인 필드 부재"),
    INVALID_JSON_FORMAT(BAD_REQUEST, "C004", "잘못된 JSON 데이터 형식"),
    NOT_SUPPORTED_METHOD(METHOD_NOT_ALLOWED, "C005", "허용되지 않은 http method 접근"),
    LOCK_ACQUIRE_FAILED(CONFLICT, "C006", "락 획득 실패"),
    CONCURRENCY_CONFLICT(CONFLICT, "C007", "동시에 요청이 처리되어 충돌이 발생"),
    LOCK_TIMEOUT(CONFLICT,"C008","락 대기 시간 초과"),

    // auth
    UNAUTHENTICATED(UNAUTHORIZED, "A001", "인증 정보가 존재하지 않음"),
    AUTHORIZATION_DENIED(FORBIDDEN, "A002", "권한이 없음"),
    INVALID_GOOGLE_ID_TOKEN(UNAUTHORIZED, "A003", "유효하지 않은 Google ID 토큰"),
    INVALID_REFRESH_TOKEN(UNAUTHORIZED,"A004","유효하지 않은 Refresh Token")
    //

    ;
    
    private final HttpStatus status;
    private final String code;
    private final String message;
}
