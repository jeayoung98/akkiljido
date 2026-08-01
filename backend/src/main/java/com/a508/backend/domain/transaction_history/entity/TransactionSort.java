package com.a508.backend.domain.transaction_history.entity;

import java.util.Locale;

import org.springframework.data.domain.Sort;

import com.a508.backend.global.exception.BusinessException;
import com.a508.backend.global.exception.ExceptionType;

/**
 * 거래내역 정렬 기준. 요청 쿼리 파라미터(latest/oldest)와 매핑된다.
 */
public enum TransactionSort {

    LATEST(Sort.Direction.DESC),
    OLDEST(Sort.Direction.ASC);

    private static final String SORT_PROPERTY = "datetime";

    private final Sort.Direction direction;

    TransactionSort(Sort.Direction direction) {
        this.direction = direction;
    }

    /**
     * 정렬 파라미터 문자열을 파싱한다. 값이 없으면 최신순(기본값), 지원하지 않는 값이면 예외를 던진다.
     * 대소문자 변환은 서버 기본 로케일과 무관하도록 Locale.ROOT 를 사용한다(터키어 로케일의 i/I 문제 회피).
     */
    public static TransactionSort from(String value) {
        if (value == null || value.isBlank()) {
            return LATEST;
        }
        return switch (value.toLowerCase(Locale.ROOT)) {
            case "latest" -> LATEST;
            case "oldest" -> OLDEST;
            default -> throw new BusinessException(ExceptionType.INVALID_SORT_TYPE);
        };
    }

    public Sort toSort() {
        return Sort.by(direction, SORT_PROPERTY);
    }
}
