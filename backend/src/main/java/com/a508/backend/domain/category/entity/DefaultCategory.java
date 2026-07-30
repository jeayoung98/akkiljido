package com.a508.backend.domain.category.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 회원가입 시 각 회원에게 기본으로 생성되는 카테고리 목록. 선언된 순서대로 생성된다.
 */
@Getter
@RequiredArgsConstructor
public enum DefaultCategory {

    FOOD("음식점"),
    CAFE_SNACK("카페·간식"),
    CONVENIENCE_MART("편의점·마트"),
    SHOPPING("쇼핑"),
    LEISURE("여가"),
    TRANSPORT("교통"),
    HEALTH_MEDICAL("건강·의료"),
    LIVING("생활"),
    BEAUTY("미용"),
    EDUCATION("교육"),
    ETC("기타");

    private final String categoryName;
}
