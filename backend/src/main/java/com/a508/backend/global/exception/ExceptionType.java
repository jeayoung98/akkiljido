package com.a508.backend.global.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

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
    LOCK_TIMEOUT(CONFLICT, "C008", "락 대기 시간 초과"),

    // auth
    UNAUTHENTICATED(UNAUTHORIZED, "A001", "인증 정보가 존재하지 않음"),
    AUTHORIZATION_DENIED(FORBIDDEN, "A002", "권한이 없음"),

    // place
    INVALID_PLACE_COORDINATE(BAD_REQUEST, "P001", "유효하지 않은 위치 좌표입니다."),
    DUPLICATE_PLACE_NAME(CONFLICT, "P002", "이미 등록된 장소 이름입니다."),
    MY_PLACE_NOT_FOUND(NOT_FOUND, "P003", "등록된 장소를 찾을 수 없습니다."),

    // place validation
    EMPTY_PLACE_UPDATE(BAD_REQUEST, "C002", "수정할 정보를 입력해 주세요."),
    INCOMPLETE_PLACE_LOCATION(BAD_REQUEST, "C002", "주소 변경 시 위도와 경도를 함께 입력해야 합니다."),
    INVALID_PLACE_INPUT(BAD_REQUEST, "C002", "입력값이 올바르지 않습니다."),
    INVALID_PLACE_ID(BAD_REQUEST, "C002", "장소 ID가 올바르지 않습니다."),

    ;

    private final HttpStatus status;
    private final String code;
    private final String message;
}