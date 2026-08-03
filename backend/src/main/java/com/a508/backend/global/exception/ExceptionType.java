package com.a508.backend.global.exception;

import static org.springframework.http.HttpStatus.*;

import org.springframework.http.HttpStatus;

import lombok.AllArgsConstructor;
import lombok.Getter;

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
	INVALID_GOOGLE_ID_TOKEN(UNAUTHORIZED, "A003", "유효하지 않은 Google ID 토큰"),
	INVALID_REFRESH_TOKEN(UNAUTHORIZED, "A004", "유효하지 않은 Refresh Token"),

	// transaction history
	TRANSACTION_HISTORY_NOT_FOUND(NOT_FOUND, "T001", "존재하지 않는 거래 내역"),
	INVALID_SORT_TYPE(BAD_REQUEST, "T002", "정렬 기준이 올바르지 않습니다."),
	INVALID_TRANSACTION_TYPE(BAD_REQUEST, "T003", "거래 유형이 올바르지 않습니다."),
	INVALID_DATE_FORMAT(BAD_REQUEST, "T004", "날짜 형식이 올바르지 않습니다."),
	INVALID_DATE_RANGE(BAD_REQUEST, "T005", "조회 시작일은 종료일보다 이후일 수 없습니다."),

	// transaction map
	INVALID_MAP_BOUNDS(BAD_REQUEST, "T006", "지도 조회 좌표 범위가 올바르지 않습니다."),
	INVALID_MAP_DEPTH(BAD_REQUEST, "T007", "지도 조회 단위(depth)가 올바르지 않습니다."),

	// calendar
	INVALID_CALENDAR_DATE(BAD_REQUEST, "CL001", "존재하지 않는 날짜입니다."),

	// category
	CATEGORY_NOT_FOUND(NOT_FOUND, "CT001", "존재하지 않는 카테고리"),

	// place
	DUPLICATE_PLACE_NAME(CONFLICT, "P001", "이미 등록된 장소 이름입니다."),
	MY_PLACE_NOT_FOUND(NOT_FOUND, "P002", "등록된 장소를 찾을 수 없습니다."),

	// geometry(좌표)
	INVALID_LATITUDE(BAD_REQUEST, "G001", "위도는 -90 이상 90 이하여야 합니다."),
	INVALID_LONGITUDE(BAD_REQUEST, "G002", "경도는 -180 이상 180 이하여야 합니다."),

	// FCM
	// TODO: 테스트 알림 API 삭제 시 FCM_PUSH_TOKEN_NOT_FOUND의 사용 여부를 확인하고 함께 정리한다.
	FCM_PUSH_TOKEN_NOT_FOUND(NOT_FOUND, "F001", "등록된 FCM 푸시 토큰이 없습니다."),
	FCM_NOT_CONFIGURED(SERVICE_UNAVAILABLE, "F002", "FCM 서버 설정이 완료되지 않았습니다."),

	;

	private final HttpStatus status;
	private final String code;
	private final String message;
}
