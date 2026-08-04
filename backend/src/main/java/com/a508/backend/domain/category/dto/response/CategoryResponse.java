package com.a508.backend.domain.category.dto.response;

import com.a508.backend.domain.category.entity.Category;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 카테고리 단건 응답.
 */
@Schema(description = "카테고리 응답")
public record CategoryResponse(

        @Schema(description = "카테고리 ID", example = "1")
        Long id,

        @Schema(description = "카테고리명", example = "음식점")
        String name
) {
    public static CategoryResponse from(Category entity) {
        return new CategoryResponse(entity.getId(), entity.getName());
    }
}
