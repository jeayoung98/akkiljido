package com.a508.backend.domain.home.repository.projection;

/**
 * 카테고리별 지출 합계 집계 결과. JPQL 생성자 표현식으로 매핑된다.
 */
public record CategoryAmount(Long categoryId, String categoryName, Long amount) {
}
