package com.a508.backend.domain.category.dto.response;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 카테고리 목록 응답.
 */
@Schema(description = "카테고리 목록 응답")
public record CategoryListResponse(

        @Schema(description = "카테고리 목록")
        List<CategoryResponse> categories
) {
    public static CategoryListResponse from(List<CategoryResponse> categories) {
        return new CategoryListResponse(categories);
    }
}
